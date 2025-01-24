import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import sharp from 'sharp';
import { logError } from '@/lib/errorLogger';
import 'server-only';

sharp.cache(false); // Disable filesystem caching

export const dynamic = 'force-dynamic'; // Prevent static optimization

if (!process.env.REPLICATE_API_TOKEN) {
  throw new Error('REPLICATE_API_TOKEN is not set');
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Add type definitions
type ProcessResult = {
  data?: string;
  error?: string;
  logs: string[];
};

type ImageMetadata = {
  width: number;
  height: number;
};

// Modified processImage with type safety
const processImage = async (base64Image: string): Promise<string> => {
  try {
    const upscaled = await upscale(base64Image, 2);
    const resized = await resize(upscaled, 4000, 3000);
    
    // Validate output
    if (!resized.startsWith('data:image/')) {
      throw new Error('Invalid processed image data');
    }
    
    return resized;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Processing failed';
    throw new Error(message);
  }
};

// Type-safe image validation
const validateImageData = (img: unknown): img is string => {
  return typeof img === 'string' && img.startsWith('data:image/');
};

const upscale = async (image: string, scale: number) => {
  try {
    const prediction = await replicate.predictions.create({
      version: "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
      input: {
        image,
        scale: Math.min(scale, 2),
        face_enhance: false,
        tile: 512,
        tile_pad: 32,
        gfpgan_visibility: 0,
        realesrgan_strength: 0.8
      }
    });

    const output = await replicate.wait(prediction);
    
    if (output.status !== 'succeeded' || !output.output) {
      throw new Error(output.error?.toString() || 'Upscale failed');
    }

    // Convert Replicate URL to base64
    const imageUrl = output.output as string;
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch upscaled image');
    
    const buffer = await response.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? 
      error.message : 
      'Unknown Replicate API error';
    if (errorMessage.includes('max size that fits in GPU memory')) {
      throw new Error('Image too large - try smaller input or reduce upscale factor (max 2x)');
    }
    throw new Error(`Replicate API error: ${errorMessage}`);
  }
};

const resize = async (base64Image: string, width: number, height: number) => {
  try {
    const buffer = Buffer.from(base64Image.split(',')[1], 'base64');
    const resizedBuffer = await sharp(buffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: false,
        kernel: sharp.kernel.lanczos3 // High-quality resampling
      })
      .toBuffer();
    return `data:image/png;base64,${resizedBuffer.toString('base64')}`;
  } catch (error) {
    const message = error instanceof Error ? 
      error.message : 
      'Unknown resize error';
    throw new Error(`Resize failed: ${message}`);
  }
};

async function getImageDimensions(blob: Blob): Promise<{width: number, height: number}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// Enhanced POST handler
export async function POST(request: NextRequest) {
  try {
    const { images }: { images: unknown[] } = await request.json();
    
    if (!Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const validImages = images.filter(validateImageData);
    
    if (validImages.length === 0) {
      return NextResponse.json(
        { error: 'No valid images provided' },
        { status: 400 }
      );
    }

    const results: ProcessResult[] = await Promise.all(
      validImages.map(async (base64Image: string, index: number) => {
        const logs: string[] = [`Processing image ${index + 1}`];
        
        try {
          const processedImage = await processImage(base64Image);
          logs.push('Processing completed successfully');
          
          return {
            data: processedImage,
            logs
          };
          
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Processing failed';
          await logError(error, `Image ${index + 1} error`);
          logs.push(`Error: ${message}`);
          
          return {
            error: message,
            logs
          };
        }
      })
    );

    return NextResponse.json({ results });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    await logError(error, 'API Route Error');
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
} 