import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { upsertScene } from '@/lib/turbopuffer';
import { createEmbedding } from '@/lib/openai';

const BASE_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    console.log('Building scene for prompt:', prompt);
    const sceneId = `scene-${Date.now()}`;
    
    // Step 1: Parse scene with LLM
    console.log('Step 1: Parsing scene...');
    const parseRes = await fetch(`${BASE_URL}/api/parse-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    if (!parseRes.ok) {
      throw new Error(`Parse scene failed: ${await parseRes.text()}`);
    }
    
    const { sceneData } = await parseRes.json();
    console.log('Scene parsed:', sceneData.scene_name);
    
    // Step 2: Search similar scenes
    console.log('Step 2: Searching similar scenes...');
    const searchRes = await fetch(`${BASE_URL}/api/search-scenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sceneDescription: prompt })
    });
    
    const { similarScenes } = await searchRes.json();
    console.log(`Found ${similarScenes?.length || 0} similar scenes`);
    
    // Step 3: Generate audio
    console.log('Step 3: Generating audio...');
    const audioRes = await fetch(`${BASE_URL}/api/generate-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sceneData, similarScenes })
    });
    
    const { audioFiles } = await audioRes.json();
    console.log(`Generated ${audioFiles?.length || 0} audio files`);
    
    // Step 4: Generate skybox
    console.log('Step 4: Generating skybox...');
    const skyboxRes = await fetch(`${BASE_URL}/api/generate-skybox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sceneData })
    });
    
    const { skyboxUrl } = await skyboxRes.json();
    console.log('Skybox generated:', skyboxUrl);
    
    // Step 5: Save scene data as JSON
    console.log('Step 5: Saving scene data...');
    await mkdir(path.join(process.cwd(), 'data/scenes'), { recursive: true });
    
    const sceneRecord = {
      id: sceneId,
      createdAt: new Date().toISOString(),
      prompt,
      sceneData,
      audioFiles: audioFiles || [],
      skyboxUrl,
      similarScenes: similarScenes || [],
    };
    
    await writeFile(
      path.join(process.cwd(), `data/scenes/${sceneId}.json`),
      JSON.stringify(sceneRecord, null, 2)
    );
    console.log('Scene data saved:', `data/scenes/${sceneId}.json`);
    
    // Step 6: Save to turbopuffer for vector search
    console.log('Step 6: Saving to turbopuffer...');
    try {
      const embedding = await createEmbedding(prompt);
      await upsertScene(sceneId, embedding, {
        prompt,
        scene_name: sceneData.scene_name,
        theme: sceneData.theme,
        mood: sceneData.mood,
        time: sceneData.time,
        object_count: sceneData.objects?.length || 0,
        created_at: new Date().toISOString(),
      });
      console.log('Scene saved to turbopuffer');
    } catch (tpError) {
      console.error('turbopuffer save error (non-fatal):', tpError);
    }
    
    return NextResponse.json({
      success: true,
      sceneId,
      url: `/play/${sceneId}`,
      sceneData,
      generated: {
        audioFiles: audioFiles?.length || 0,
        similarScenesFound: similarScenes?.length || 0,
        skybox: !!skyboxUrl,
      }
    });
    
  } catch (error) {
    console.error('Build scene error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
