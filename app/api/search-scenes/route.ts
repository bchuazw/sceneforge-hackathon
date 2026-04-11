import { NextResponse } from 'next/server';
import { searchSimilarScenes } from '@/lib/turbopuffer';
import { createEmbedding } from '@/lib/openai';

export async function POST(req: Request) {
  try {
    const { sceneDescription } = await req.json();
    
    if (!sceneDescription) {
      return NextResponse.json(
        { success: false, error: 'Scene description is required' },
        { status: 400 }
      );
    }
    
    // Create embedding from description
    const embedding = await createEmbedding(sceneDescription);
    
    // Search turbopuffer for similar scenes
    const similarScenes = await searchSimilarScenes(embedding, 3);
    
    return NextResponse.json({ 
      success: true, 
      similarScenes,
      count: similarScenes.length,
    });
    
  } catch (error) {
    console.error('Search scenes error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}