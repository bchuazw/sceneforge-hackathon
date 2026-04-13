import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Default voice ID for narration (Adam - versatile)
const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB';

export async function POST(req: Request) {
  try {
    const { text, sceneId, voiceId = DEFAULT_VOICE_ID } = await req.json();
    
    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }
    
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'ELEVENLABS_API_KEY not configured' },
        { status: 500 }
      );
    }
    
    console.log('Generating narration:', text.substring(0, 50) + '...');
    
    // Ensure generated directory exists
    await mkdir(path.join(process.cwd(), 'public/generated'), { recursive: true });
    
    const timestamp = Date.now();
    const filename = `narration-${sceneId || timestamp}.mp3`;
    
    // Call ElevenLabs TTS API
    const ttsResponse = await fetch(`${ELEVENLABS_TTS_URL}/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });
    
    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      console.error('ElevenLabs TTS error:', error);
      return NextResponse.json(
        { success: false, error: `ElevenLabs API error: ${error}` },
        { status: 500 }
      );
    }
    
    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    const filepath = path.join(process.cwd(), 'public/generated', filename);
    
    await writeFile(filepath, audioBuffer);
    
    console.log('Narration generated:', filename);
    
    return NextResponse.json({
      success: true,
      narrationUrl: `/api/files/${filename}`,
      filename,
    });
    
  } catch (error) {
    console.error('Generate narration error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
