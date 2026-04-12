import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { sceneData, prompt } = await req.json();
    
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
    
    return NextResponse.json({ 
      success: true, 
      skyboxUrl: `/api/files/${skyboxFilename}`,
      note: `AI-themed skybox: ${theme} ${mood} ${time}`
    });
    
  } catch (error) {
    console.error('Generate skybox error:', error);
    
    // Fallback to basic gradient on error
    const timestamp = Date.now();
    const skyboxFilename = `skybox-${timestamp}.png`;
    const filepath = path.join(process.cwd(), 'public/generated', skyboxFilename);
    
    try {
      const fallbackPng = generateThemedPng('fantasy', 'mysterious', 'day');
      await writeFile(filepath, fallbackPng);
      
      return NextResponse.json({ 
        success: true, 
        skyboxUrl: `/api/files/${skyboxFilename}`,
        note: 'Fallback skybox generated'
      });
    } catch (writeError) {
      return NextResponse.json(
        { success: false, error: String(error) },
        { status: 500 }
      );
    }
  }
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
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(imageData);
  const idatChunk = createPngChunk('IDAT', compressed);
  
  // IEND chunk
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

interface ColorSet {
  top: [number, number, number];
  bottom: [number, number, number];
}

function getThemeColors(theme: string, mood: string, time: string): ColorSet {
  // Night time overrides
  if (time === 'night' || time === 'midnight') {
    if (mood === 'scary' || mood === 'horror' || mood === 'creepy') {
      return { top: [5, 5, 15], bottom: [20, 10, 30] }; // Dark purple night
    }
    if (mood === 'peaceful' || mood === 'calm') {
      return { top: [10, 20, 40], bottom: [30, 50, 80] }; // Calm blue night
    }
    return { top: [15, 25, 45], bottom: [40, 50, 70] }; // Standard night
  }
  
  // Sunset/dusk
  if (time === 'sunset' || time === 'dusk' || time === 'evening') {
    if (mood === 'romantic' || mood === 'peaceful') {
      return { top: [80, 60, 100], bottom: [255, 150, 100] }; // Purple to orange
    }
    return { top: [60, 40, 80], bottom: [255, 120, 80] }; // Sunset
  }
  
  // Theme-based colors
  switch (theme) {
    case 'cyberpunk':
    case 'sci-fi':
    case 'futuristic':
      if (mood === 'dark' || mood === 'ominous') {
        return { top: [10, 5, 20], bottom: [40, 20, 60] }; // Dark cyberpunk
      }
      return { top: [20, 10, 40], bottom: [80, 30, 100] }; // Neon purple
      
    case 'forest':
    case 'woods':
    case 'nature':
      if (mood === 'mysterious' || mood === 'dark') {
        return { top: [30, 40, 30], bottom: [60, 70, 50] }; // Dark forest
      }
      return { top: [100, 150, 200], bottom: [150, 200, 150] }; // Bright forest
      
    case 'ocean':
    case 'sea':
    case 'beach':
      return { top: [100, 150, 220], bottom: [150, 200, 255] }; // Ocean blue
      
    case 'desert':
      return { top: [200, 180, 150], bottom: [255, 220, 180] }; // Sandy
      
    case 'japanese':
    case 'asian':
      if (time === 'night') {
        return { top: [30, 30, 60], bottom: [80, 60, 100] }; // Night Japan
      }
      return { top: [150, 200, 255], bottom: [255, 200, 220] }; // Cherry blossom
      
    case 'medieval':
    case 'castle':
      if (mood === 'dark' || mood === 'ominous') {
        return { top: [40, 40, 50], bottom: [80, 70, 70] }; // Dark medieval
      }
      return { top: [100, 150, 220], bottom: [200, 180, 150] }; // Day medieval
      
    case 'horror':
    case 'spooky':
      return { top: [10, 10, 15], bottom: [40, 30, 35] }; // Dark horror
      
    case 'space':
    case 'alien':
      return { top: [5, 5, 15], bottom: [30, 20, 50] }; // Deep space
      
    default:
      // Mood-based fallback
      switch (mood) {
        case 'dark':
        case 'ominous':
        case 'scary':
          return { top: [30, 30, 40], bottom: [60, 50, 55] };
        case 'peaceful':
        case 'calm':
          return { top: [120, 180, 220], bottom: [200, 230, 255] };
        case 'mysterious':
          return { top: [40, 30, 60], bottom: [100, 80, 120] };
        case 'epic':
        case 'grand':
          return { top: [80, 120, 180], bottom: [200, 150, 100] };
        default:
          return { top: [100, 150, 220], bottom: [180, 200, 255] }; // Default blue sky
      }
  }
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type);
  const chunk = Buffer.concat([typeBuffer, data]);
  
  const zlib = require('zlib');
  const crc32 = zlib.crc32(chunk);
  
  const result = Buffer.alloc(4 + 4 + data.length + 4);
  result.writeUInt32BE(data.length, 0);
  typeBuffer.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32, 8 + data.length);
  
  return result;
}