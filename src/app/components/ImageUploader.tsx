import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { ReactCompareSlider } from 'react-compare-slider';
import React from 'react';
import { Star } from 'lucide-react';

type ImageFile = File & { 
  preview: string;
  width: number;
  height: number;
};

type ProcessedImage = {
  original: string;
  upscaled: string;
  originalWidth: number;
  originalHeight: number;
  upscaledWidth: number;
  upscaledHeight: number;
};

type ProcessingStage = {
  status: 'queued' | 'preprocessing' | 'upscaling' | 'quality-check' | 'resizing' | 'completed' | 'error';
  message: string;
  progress?: number;
};

const MemoizedCompareSlider = React.memo(({ original, upscaled }: { original: string, upscaled: string }) => (
  <ReactCompareSlider
    itemOne={
      <img
        src={original}
        alt="Original"
        className="w-full h-96 object-contain bg-gray-100"
        loading="lazy"
      />
    }
    itemTwo={
      <img
        src={upscaled}
        alt="Upscaled"
        className="w-full h-96 object-contain bg-gray-100"
        loading="lazy"
      />
    }
    className="rounded-lg border"
    position={50}
    style={{ height: '400px' }}
  />
));

/**
 * Main image processing component handling upload, upscaling, and display
 * @component
 * @example
 * <ImageUploader />
 */
const ImageUploader = () => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [upscaledImages, setUpscaledImages] = useState<ProcessedImage[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [processingStages, setProcessingStages] = useState<ProcessingStage[]>([]);

  /**
   * Validates image against minimum requirements
   * @param {File} file - Image file to validate
   * @throws {Error} If image doesn't meet requirements
   */
  const validateImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      
      img.onload = () => {
        const MIN_WIDTH = 2048;
        const MIN_HEIGHT = 1080;
        const ASPECT_RATIO = 4/3; // 4000x3000 ideal

        const errors = [];
        
        if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
          errors.push(`Resolution small (${img.width}x${img.height}) - will attempt upscale`);
        }
        
        if (img.width/img.height < ASPECT_RATIO * 0.9) { // 10% tolerance
          errors.push('Image should be landscape-oriented');
        }

        if (img.width < 256 || img.height < 256) {
          errors.push(`Image too small (${img.width}x${img.height}) - minimum 256x256 pixels`);
        }

        URL.revokeObjectURL(img.src);
        errors.length ? reject(errors.join(', ')) : resolve('');
      };

      img.onerror = () => reject('Invalid image file');
    });
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': [] },
    multiple: true,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDrop: async (acceptedFiles) => {
      const filesWithDims = await Promise.all(
        acceptedFiles.map(async file => {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          await new Promise(resolve => (img.onload = resolve));
          
          return Object.assign(file, {
            preview: URL.createObjectURL(file),
            width: img.naturalWidth,
            height: img.naturalHeight
          });
        })
      );
      
      setImages(filesWithDims);
    }
  });

  /**
   * Converts File to base64 string
   * @param {File} file - Image file to convert
   * @returns {Promise<string>} Base64 encoded image
   */
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getImageDimensions = (base64: string): Promise<{width: number, height: number}> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
    });
  };

  const worker = new Worker(new URL('../../workers/image.worker.ts', import.meta.url));

  const handleUpscale = async () => {
    if (!images.length) return;

    setIsProcessing(true);
    setStatus('Starting processing...');
    setProgress(0);
    setErrors([]);

    try {
      const imageBase64List = await Promise.all(
        images.map(file => readFileAsBase64(file))
      );

      worker.postMessage({ images: imageBase64List });
      worker.onmessage = (event) => {
        // Handle processed images
      };

      const processedImages: ProcessedImage[] = [];

      for (const [index, result] of results.entries()) {
        if (result.error) {
          setErrors(prev => [...prev, `Image ${index + 1}: ${result.error}`]);
          continue;
        }

        processedImages.push({
          original: images[index].preview,
          upscaled: result.data,
          originalWidth: images[index].width,
          originalHeight: images[index].height,
          upscaledWidth: 0,
          upscaledHeight: 0
        });
      }

      setUpscaledImages(processedImages);

      const updatedImages = await Promise.all(
        processedImages.map(async img => {
          const dimensions = await getImageDimensions(img.upscaled);
          return {
            ...img,
            upscaledWidth: dimensions.width,
            upscaledHeight: dimensions.height
          };
        })
      );
      setUpscaledImages(updatedImages);

      setStatus(processedImages.length ? 'Processing complete!' : 'Processing completed with errors');
      
    } catch (error) {
      setStatus('Processing failed');
      setErrors([error instanceof Error ? error.message : 'Unknown error']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    const zip = new JSZip();
    const folder = zip.folder('upscaled-images');
    
    // Process images in chunks
    const CHUNK_SIZE = 3;
    for (let i = 0; i < upscaledImages.length; i += CHUNK_SIZE) {
      const chunk = upscaledImages.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(async (img, index) => {
        const response = await fetch(img.upscaled);
        const blob = await response.blob();
        folder?.file(`image-${i + index + 1}.png`, blob);
      }));
    }

    // Stream the ZIP creation
    const content = await zip.generateAsync({
      type: 'blob',
      streamFiles: true,
      compression: 'DEFLATE',
      compressionOptions: { level: 1 }
    });
    
    const downloadUrl = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'upscaled-images.zip';
    link.click();
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Image Uploader</h1>
        
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Booking.com Requirements</h3>
          <ul className="list-disc pl-5 text-sm text-gray-600">
            <li>Minimum 2048x1080 pixels (ideal 4000x3000)</li>
            <li>Landscape orientation (horizontal)</li>
            <li>Show property's best features</li>
            <li>Clear and well-lit composition</li>
          </ul>
        </div>
        
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg cursor-pointer transition-colors p-8 text-center ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
        >
          <input {...getInputProps()} />
          {isProcessing ? (
            <p className="text-gray-600">Processing...</p>
          ) : (
            <>
              <p className="text-gray-600 mb-2">
                {isDragActive ? 'Drop files here' : 'Drag & drop your images, or click to select'}
              </p>
            </>
          )}
        </div>

        {status && (
          <div className={`mt-4 p-3 rounded-lg ${isProcessing ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
            {status}
          </div>
        )}

        {progress > 0 && (
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-width duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}

        {images.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Original Images</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {images.map((image, index) => (
                <img 
                  key={index}
                  src={image.preview} 
                  alt={`Original ${index}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}

        {upscaledImages.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Upscaled Results</h2>
            <div className="flex overflow-x-auto pb-4 gap-4">
              {upscaledImages.map((img, index) => {
                // Calculate quality score safely
                const qualityScore = Math.min(
                  Math.floor(
                    (img.upscaledWidth / Math.max(img.originalWidth, 1)) * 
                    (img.upscaledHeight / Math.max(img.originalHeight, 1)) * 10
                  ),
                  10
                );
                
                // Ensure valid rating between 1-10
                const validRating = Math.max(1, Math.min(qualityScore, 10));

                return (
                  <div key={index} className="flex-none w-[90vw] md:w-[70vw] px-2 snap-start">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {Array.from({ length: validRating }, (_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">
                        Quality Score: {validRating}/10
                      </span>
                    </div>
                    <MemoizedCompareSlider original={img.original} upscaled={img.upscaled} />
                    <div className="mt-2 text-sm text-gray-600">
                      <p>Original: {img.originalWidth}x{img.originalHeight}</p>
                      <p>Upscaled: {img.upscaledWidth}x{img.upscaledHeight}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={handleUpscale}
            disabled={isProcessing || !images.length}
            className={`w-full py-2 px-4 rounded-lg transition-colors ${
              isProcessing || !images.length 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isProcessing ? 'Processing...' : 'Upscale Images'}
          </button>

          <button
            onClick={handleDownload}
            disabled={!upscaledImages.length}
            className="mt-3 w-full py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg"
          >
            Download All
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-red-100 text-red-800">
            {errors.map((error, index) => (
              <p key={index} className="text-sm">
                {error.includes('minimum dimensions') ? 
                  'Image too small - try higher resolution source' : 
                  error}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
