# AI Image Upscaler

Professional image upscaling solution for real estate photography with quality validation.

## Features
- 2x AI Upscaling using Real-ESRGAN
- Automated resizing to 4000x3000
- Batch processing with progress tracking
- Quality scoring system (1-10)
- Secure API endpoints with rate limiting

## Tech Stack
- Next.js 14
- Replicate API
- Sharp (Image Processing)
- TypeScript
- Tailwind CSS

## Setup

### Requirements
- Node.js 18+
- Replicate API Token
- 4GB+ VRAM GPU recommended

### Installation
1. Clone repo:
   ```bash
   git clone https://github.com/kesjam/image-upscaler-resize.git
   cd image-upscaler-resize
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local`:
   ```env
   REPLICATE_API_TOKEN=your_api_key_here
   ```

### Running
```bash
npm run dev
```

### Production Build
```bash
npm run build && npm start
```

## Usage
1. Drag & drop images into the upload zone
2. Click "Upscale Images"
3. View quality scores and compare results
4. Download ZIP archive of processed images

## API Documentation
`POST /api/upscale`
- Accepts: JSON array of base64 images
- Returns: Processed images with metadata
- Rate Limit: 5 requests/minute

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.
