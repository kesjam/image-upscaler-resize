# Image Upscaler

Professional image upscaling tool optimized for real estate and hospitality photography. Achieves 4K resolution while preserving natural details and textures.

## Features

- **AI-Powered Upscaling**: 2x upscale using Real-ESRGAN model
- **Smart Resizing**: Outputs optimized 4000x3000 images
- **Quality Metrics**: Automatic quality scoring system
- **Batch Processing**: Handle multiple images simultaneously
- **Error Handling**: Robust validation and error recovery

## Technical Specs

- **Upscale Model**: Real-ESRGAN with custom parameters:
  ```javascript
  {
    face_enhance: false,
    tile: 512,
    tile_pad: 32,
    gfpgan_visibility: 0,
    realesrgan_strength: 0.8
  }
  ```
- **Resize Method**: Lanczos3 algorithm
- **Max Input Size**: 8000x8000 pixels
- **Output Format**: PNG with lossless compression

## Requirements

- Node.js 18+
- Replicate API Key
- 4GB+ VRAM recommended

## Installation

1. Clone repository:
   ```bash
   git clone https://github.com/your-repo/image-upscaler.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local`:
   ```env
   REPLICATE_API_TOKEN=your_api_key_here
   ```

## Usage

1. Drag & drop images into the upload zone
2. Click "Upscale Images"
3. Monitor progress and quality scores
4. Download ZIP archive of processed images

## Development

```bash
npm run dev
```

## Build

```bash
npm run build && npm start
```

## License

MIT License - See [LICENSE](LICENSE) for details
