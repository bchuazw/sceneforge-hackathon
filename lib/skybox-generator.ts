import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { createPngChunk, getThemeColors } from './png-utils';
import { deflateSync } from 'zlib';

export async function generateSkyboxForScene(sceneData: any): Promise<string> {
  // Ensure generated directory exists
  await mkdir(path.join(process.cwd(), 'public/generated'), { recursive: true });
  
  const timestamp = Date.now();
  const skyboxFilename = `skybox-${timestamp}.png`;
  const filepath = path.join(process.cwd(), 'public/generated', skyboxFilename);
  
  // Generate themed gradient based on scene properties
  const theme = sceneData?.theme?.toLowerCase() || 'fantasy';
  const mood = sceneData?.mood?.toLowerCase() || 'mysterious';
  const time = sceneData?.time?.toLowerCase() || 'day';
  
  console.log(`Generating themed skybox: ${theme} / ${mood} / ${time}`);
  
  // Create themed gradient
  const themedPng = generateThemedPng(theme, mood, time);
  await writeFile(filepath, themedPng);
  
  console.log('Themed skybox generated:', skyboxFilename);
  
  return `/api/files/${skyboxFilename}`;
}

// Generate themed gradient PNG based on scene properties
function generateThemedPng(theme: string, mood: string, time: string): Buffer {
  const width = 1024;
  const height = 512;
  
  // Define color palettes based on theme, mood, and time
  const colors = getThemeColors(theme, mood, time);
  
  // Create PNG
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createPngChunk('IHDR', ihdrData);
  
  // Create gradient image data
  const rowSize = width * 3 + 1;
  const imageData = Buffer.alloc(rowSize * height);
  
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    imageData[rowStart] = 0; // filter byte
    
    // Calculate vertical position (0 = top/sky, 1 = bottom/horizon)
    const t = y / height;
    
    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3;
      
      // Interpolate between top and bottom colors
      const r = Math.floor(colors.top[0] * (1 - t) + colors.bottom[0] * t);
      const g = Math.floor(colors.top[1] * (1 - t) + colors.bottom[1] * t);
      const b = Math.floor(colors.top[2] * (1 - t) + colors.bottom[2] * t);
      
      // Add subtle horizontal variation for depth
      const hVar = Math.sin((x / width) * Math.PI * 2) * 10;
      
      imageData[pixelStart] = Math.max(0, Math.min(255, r + hVar));
      imageData[pixelStart + 1] = Math.max(0, Math.min(255, g + hVar));
      imageData[pixelStart + 2] = Math.max(0, Math.min(255, b + hVar));
    }
  }
  
  // Compress with zlib
  const compressed = deflateSync(imageData);
  const idatChunk = createPngChunk('IDAT', compressed);
  
  // IEND chunk
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}
