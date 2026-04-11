import { NextResponse } from 'next/server';
import { parseSceneDescription } from '@/lib/openai';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    const sceneData = await parseSceneDescription(prompt);
    
    return NextResponse.json({ 
      success: true, 
      sceneData,
    });
    
  } catch (error) {
    console.error('Parse scene error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}