import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

export async function POST(req: Request) {
  try {
    const { sceneData, prompt } = await req.json();
    
    // Ensure generated directory exists
    await mkdir(path.join(process.cwd(), 'public/generated'), { recursive: true });
    
    const timestamp = Date.now();
    const skyboxFilename = `skybox-${timestamp}.png`;
    const filepath = path.join(process.cwd(), 'public/generated', skyboxFilename);
    
    // Build the image prompt
    const imagePrompt = prompt || 
      `360 degree equirectangular panoramic skybox, ${sceneData?.theme || 'fantasy'} scene, ${sceneData?.mood || 'mysterious'} atmosphere, ${sceneData?.time || 'day'}, seamless wrap-around environment, high quality, detailed`;
    
    if (!REPLICATE_API_TOKEN || REPLICATE_API_TOKEN === 'placeholder_add_replicate_token_here') {
      console.log('Replicate API token not configured, using placeholder');
      
      // Create a gradient placeholder image
      const placeholderPng = generatePlaceholderPng();
      await writeFile(filepath, placeholderPng);
      
      return NextResponse.json({ 
        success: true, 
        skyboxUrl: `/api/files/${skyboxFilename}`,
        note: 'Using placeholder skybox - add REPLICATE_API_TOKEN for AI generation'
      });
    }
    
    // Call Replicate API for skybox generation
    console.log('Generating skybox with Replicate:', imagePrompt);
    
    // Start prediction with Replicate
    const predictionRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "42c38f0c19f2c17a34a696581255dfcb5b7992583e1e2896b3377a28d2732e18", // Stable Diffusion 2.1
        input: {
          prompt: imagePrompt,
          width: 1024,
          height: 512,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 50,
        }
      }),
    });
    
    if (!predictionRes.ok) {
      const error = await predictionRes.text();
      console.error('Replicate API error:', error);
      throw new Error(`Replicate API error: ${error}`);
    }
    
    const prediction = await predictionRes.json();
    console.log('Prediction started:', prediction.id);
    
    // Poll for result (max 60 seconds)
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Token ${REPLICATE_API_TOKEN}` },
      });
      
      result = await pollRes.json();
      console.log(`Poll ${attempts + 1}: ${result.status}`);
      attempts++;
    }
    
    if (result.status === 'succeeded' && result.output && result.output.length > 0) {
      // Download the generated image
      const imageUrl = result.output[0];
      const imageRes = await fetch(imageUrl);
      
      if (!imageRes.ok) {
        throw new Error('Failed to download generated image');
      }
      
      const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
      await writeFile(filepath, imageBuffer);
      
      console.log('Skybox generated and saved:', skyboxFilename);
      
      return NextResponse.json({ 
        success: true, 
        skyboxUrl: `/api/files/${skyboxFilename}`,
        note: 'Generated using Replicate AI'
      });
    } else {
      throw new Error(result.error || 'Skybox generation failed or timed out');
    }
    
  } catch (error) {
    console.error('Generate skybox error:', error);
    
    // Fallback to placeholder on error
    const timestamp = Date.now();
    const skyboxFilename = `skybox-${timestamp}.png`;
    const filepath = path.join(process.cwd(), 'public/generated', skyboxFilename);
    
    try {
      const placeholderPng = generatePlaceholderPng();
      await writeFile(filepath, placeholderPng);
      
      return NextResponse.json({ 
        success: true, 
        skyboxUrl: `/api/files/${skyboxFilename}`,
        note: `Error: ${String(error)}. Using placeholder.`
      });
    } catch (writeError) {
      return NextResponse.json(
        { success: false, error: String(error) },
        { status: 500 }
      );
    }
  }
}

// Generate a simple gradient PNG as placeholder
function generatePlaceholderPng(): Buffer {
  // Minimal valid 512x256 PNG with gradient (created using PNG chunks)
  // This is a simple 2x1 gradient PNG scaled up
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk - 512x256, 8-bit RGB
  const width = 512;
  const height = 256;
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createPngChunk('IHDR', ihdrData);
  
  // IDAT chunk - compressed image data
  // Create a simple gradient
  const rowSize = width * 3 + 1; // 3 bytes per pixel + 1 filter byte
  const imageData = Buffer.alloc(rowSize * height);
  
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    imageData[rowStart] = 0; // filter byte (no filter)
    
    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3;
      // Sky gradient from dark blue to lighter blue
      const t = y / height;
      imageData[pixelStart] = Math.floor(25 * (1 - t) + 135 * t);     // R
      imageData[pixelStart + 1] = Math.floor(25 * (1 - t) + 206 * t); // G
      imageData[pixelStart + 2] = Math.floor(112 * (1 - t) + 235 * t); // B
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

function createPngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type);
  const chunk = Buffer.concat([typeBuffer, data]);
  
  // Calculate CRC32
  const crc32 = require('zlib').crc32(chunk);
  
  const result = Buffer.alloc(4 + 4 + data.length + 4);
  result.writeUInt32BE(data.length, 0);
  typeBuffer.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32, 8 + data.length);
  
  return result;
}
