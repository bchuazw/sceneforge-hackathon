import { NextResponse } from 'next/server';
import { listAllScenes } from '@/lib/turbopuffer';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

// Fallback: read scenes from local filesystem
async function listScenesFromFilesystem(): Promise<any[]> {
  try {
    const scenesDir = path.join(process.cwd(), 'data/scenes');
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
            mood: data.sceneData?.mood || 'neutral',
            time: data.sceneData?.time || 'day',
            objectCount: data.sceneData?.objects?.length || 0,
            hasSkybox: !!data.skyboxUrl,
            audioCount: data.audioFiles?.length || 0,
            url: `/play/${data.id}`,
          };
        } catch (e) {
          console.error(`Error reading scene file ${file}:`, e);
          return null;
        }
      })
    );
    
    return scenes.filter(Boolean);
  } catch (error) {
    console.error('Filesystem list error:', error);
    return [];
  }
}

export async function GET(req: Request) {
  try {
    console.log('Listing scenes...');
    
    // Try turbopuffer first
    let tpScenes: any[] = [];
    let tpError = null;
    try {
      tpScenes = await listAllScenes(100);
      console.log(`Found ${tpScenes.length} scenes in turbopuffer`);
    } catch (error: any) {
      console.error('Turbopuffer list error:', error.message);
      tpError = error.message;
    }
    
    // Always also get from filesystem (fallback + for when turbopuffer fails)
    const fsScenes = await listScenesFromFilesystem();
    console.log(`Found ${fsScenes.length} scenes in filesystem`);
    
    // Merge scenes, prioritizing filesystem data (most accurate)
    const sceneMap = new Map();
    
    // Add turbopuffer scenes first
    for (const scene of tpScenes) {
      sceneMap.set(scene.id, {
        id: scene.id,
        createdAt: scene.created_at || scene.createdAt,
        prompt: scene.prompt,
        sceneName: scene.scene_name || 'Untitled Scene',
        theme: scene.theme || 'unknown',
        mood: scene.mood || 'unknown',
        time: scene.time || 'day',
        objectCount: scene.object_count || 0,
        hasSkybox: false,
        audioCount: 0,
        url: `/play/${scene.id}`,
      });
    }
    
    // Override with filesystem data (more complete)
    for (const scene of fsScenes) {
      sceneMap.set(scene.id, scene);
    }
    
    const allScenes = Array.from(sceneMap.values());

    // Filter out test/junk scenes that shouldn't appear in the public gallery
    const JUNK_PATTERNS = [
      /^test$/i,
      /^test\s/i,
      /test.*persistence/i,
      /special char/i,
      /^this is a very long prompt/i,
    ];
    const cleanScenes = allScenes.filter(scene => {
      const name = scene.sceneName || '';
      const prompt = scene.prompt || '';
      // Drop scenes with 0 objects AND no audio (pure placeholder/test runs)
      if (scene.objectCount === 0 && scene.audioCount === 0) return false;
      // Drop scenes whose name or prompt matches known junk patterns
      if (JUNK_PATTERNS.some(p => p.test(name) || p.test(prompt))) return false;
      return true;
    });

    // Sort by date (newest first)
    const sortedScenes = cleanScenes.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return NextResponse.json({ 
      success: true, 
      scenes: sortedScenes,
      count: sortedScenes.length,
      sources: {
        turbopuffer: tpScenes.length,
        filesystem: fsScenes.length,
        merged: allScenes.length,
      },
      tpError: tpError || undefined,
    });
    
  } catch (error) {
    console.error('List scenes error:', error);
    return NextResponse.json(
      { success: false, error: String(error), scenes: [] },
      { status: 500 }
    );
  }
}
