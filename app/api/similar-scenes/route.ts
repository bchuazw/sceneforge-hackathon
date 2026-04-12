import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { searchSimilarScenes } from '@/lib/turbopuffer';
import { createEmbedding } from '@/lib/openai';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sceneId = searchParams.get('id');
    const prompt = searchParams.get('prompt');
    
    if (!sceneId && !prompt) {
      return NextResponse.json(
        { success: false, error: 'Scene ID or prompt is required' },
        { status: 400 }
      );
    }
    
    let searchText = prompt;
    
    // If sceneId provided, load the scene and use its prompt
    if (sceneId && !searchText) {
      const scenePath = path.join(process.cwd(), `data/scenes/${sceneId}.json`);
      try {
        const content = await readFile(scenePath, 'utf-8');
        const data = JSON.parse(content);
        searchText = data.prompt;
      } catch {
        return NextResponse.json(
          { success: false, error: 'Scene not found' },
          { status: 404 }
        );
      }
    }
    
    if (!searchText) {
      return NextResponse.json(
        { success: false, error: 'Could not determine search text' },
        { status: 400 }
      );
    }
    
    // Create embedding and search
    const embedding = await createEmbedding(searchText);
    const similarScenes = await searchSimilarScenes(embedding, 4);
    
    // Filter out the current scene if searching by ID
    const filteredResults = sceneId 
      ? similarScenes.filter((s: any) => s.id !== sceneId).slice(0, 3)
      : similarScenes.slice(0, 3);
    
    return NextResponse.json({ 
      success: true, 
      similarScenes: filteredResults,
      count: filteredResults.length,
    });
    
  } catch (error) {
    console.error('Similar scenes error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
