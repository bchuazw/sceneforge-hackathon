import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

export async function GET(req: Request) {
  try {
    const scenesDir = path.join(process.cwd(), 'data/scenes');
    
    // Check if directory exists
    try {
      await readdir(scenesDir);
    } catch {
      return NextResponse.json({ success: true, scenes: [] });
    }
    
    const files = await readdir(scenesDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const scenes = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const content = await readFile(path.join(scenesDir, file), 'utf-8');
          const data = JSON.parse(content);
          return {
            id: data.id,
            createdAt: data.createdAt,
            prompt: data.prompt,
            sceneName: data.sceneData?.scene_name || 'Untitled Scene',
            theme: data.sceneData?.theme || 'unknown',
            mood: data.sceneData?.mood || 'unknown',
            time: data.sceneData?.time || 'day',
            objectCount: data.sceneData?.objects?.length || 0,
            hasSkybox: !!data.skyboxUrl,
            audioCount: data.audioFiles?.length || 0,
            url: `/play/${data.id}`,
          };
        } catch {
          return null;
        }
      })
    );
    
    // Filter out nulls and sort by date (newest first)
    const validScenes = scenes
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return NextResponse.json({ 
      success: true, 
      scenes: validScenes,
      count: validScenes.length,
    });
    
  } catch (error) {
    console.error('List scenes error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
