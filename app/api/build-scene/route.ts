import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { upsertScene, searchSimilarScenes } from '@/lib/turbopuffer';
import { createEmbedding, parseSceneDescription } from '@/lib/openai';
import { generateAudioForScene } from '@/lib/audio-generator';
import { generateSkyboxForScene } from '@/lib/skybox-generator';

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
    let sceneData;
    try {
      sceneData = await parseSceneDescription(prompt);
      console.log('Scene parsed:', sceneData.scene_name);
    } catch (parseError) {
      console.error('Parse scene error:', parseError);
      throw new Error(`Failed to parse scene: ${parseError}`);
    }
    
    // Step 2: Create embedding and search similar scenes
    console.log('Step 2: Creating embedding and searching similar scenes...');
    let similarScenes: any[] = [];
    try {
      const embedding = await createEmbedding(prompt);
      similarScenes = await searchSimilarScenes(embedding, 3);
      console.log(`Found ${similarScenes.length} similar scenes`);
    } catch (searchError) {
      console.error('Search similar scenes error (non-fatal):', searchError);
      // Continue without similar scenes
      similarScenes = [];
    }
    
    // Step 3: Generate audio
    console.log('Step 3: Generating audio...');
    let audioFiles: any[] = [];
    try {
      audioFiles = await generateAudioForScene(sceneData, similarScenes);
      console.log(`Generated ${audioFiles.length} audio files`);
    } catch (audioError) {
      console.error('Audio generation error (non-fatal):', audioError);
      // Continue without audio
      audioFiles = [];
    }
    
    // Step 4: Generate skybox
    console.log('Step 4: Generating skybox...');
    let skyboxUrl: string | null = null;
    try {
      skyboxUrl = await generateSkyboxForScene(sceneData);
      console.log('Skybox generated:', skyboxUrl);
    } catch (skyboxError) {
      console.error('Skybox generation error (non-fatal):', skyboxError);
      // Continue without skybox
      skyboxUrl = null;
    }

    // Step 4b: Generate narration via ElevenLabs TTS (if the parser produced one)
    let narrationUrl: string | null = null;
    if (sceneData?.narration && process.env.ELEVENLABS_API_KEY) {
      console.log('Step 4b: Generating narration...');
      await mkdir(path.join(process.cwd(), 'public/generated'), { recursive: true });
      const narrFilename = `narration-${sceneId}.mp3`;
      const narrPath = path.join(process.cwd(), 'public/generated', narrFilename);
      // Try high-quality model first, fall back to the universally available one
      const ttsModels = ['eleven_multilingual_v2', 'eleven_monolingual_v1'];
      for (const model_id of ttsModels) {
        try {
          const ttsResp = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
              },
              body: JSON.stringify({
                text: sceneData.narration,
                model_id,
                voice_settings: { stability: 0.5, similarity_boost: 0.75 },
              }),
            }
          );
          if (ttsResp.ok) {
            const buf = Buffer.from(await ttsResp.arrayBuffer());
            await writeFile(narrPath, buf);
            narrationUrl = `/api/files/${narrFilename}`;
            console.log(`Narration generated (${model_id}):`, narrationUrl);
            break;
          } else {
            const errText = await ttsResp.text();
            console.error(`Narration TTS error with ${model_id}:`, errText);
          }
        } catch (narrErr) {
          console.error(`Narration generation error (${model_id}):`, narrErr);
        }
      }
    }
    
    // Step 5: Save scene data as JSON
    console.log('Step 5: Saving scene data...');
    try {
      await mkdir(path.join(process.cwd(), 'data/scenes'), { recursive: true });
    } catch (mkdirError) {
      console.error('mkdir error (may already exist):', mkdirError);
    }
    
    const sceneRecord = {
      id: sceneId,
      createdAt: new Date().toISOString(),
      prompt,
      sceneData,
      audioFiles: audioFiles || [],
      skyboxUrl,
      narrationUrl,
      similarScenes: similarScenes || [],
    };
    
    try {
      await writeFile(
        path.join(process.cwd(), `data/scenes/${sceneId}.json`),
        JSON.stringify(sceneRecord, null, 2)
      );
      console.log('Scene data saved:', `data/scenes/${sceneId}.json`);
    } catch (writeError) {
      console.error('Write file error:', writeError);
      throw new Error(`Failed to save scene data: ${writeError}`);
    }
    
    // Step 6: Save to turbopuffer for vector search (CRITICAL - this is the persistent store)
    console.log('Step 6: Saving to turbopuffer...');
    let tpSaved = false;
    try {
      const embedding = await createEmbedding(prompt);
      const tpAttributes = {
        prompt,
        scene_name: sceneData.scene_name || 'Untitled Scene',
        theme: sceneData.theme || 'unknown',
        mood: sceneData.mood || 'neutral',
        time: sceneData.time || 'day',
        object_count: sceneData.objects?.length || 0,
        created_at: new Date().toISOString(),
      };
      console.log('Upserting to turbopuffer with attributes:', tpAttributes);
      tpSaved = await upsertScene(sceneId, embedding, tpAttributes);
      if (tpSaved) {
        console.log('Scene saved to turbopuffer successfully');
      } else {
        console.error('turbopuffer upsert returned false - scene may not be persisted!');
      }
    } catch (tpError: any) {
      console.error('turbopuffer save error (CRITICAL):', tpError.message || tpError);
      tpSaved = false;
    }
    
    return NextResponse.json({
      success: true,
      sceneId,
      url: `/play/${sceneId}`,
      sceneData,
      persisted: tpSaved,
      generated: {
        audioFiles: audioFiles?.length || 0,
        similarScenesFound: similarScenes?.length || 0,
        skybox: !!skyboxUrl,
        narration: !!narrationUrl,
      }
    });
    
  } catch (error: any) {
    console.error('Build scene error:', error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
