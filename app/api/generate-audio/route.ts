import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_SFX_URL = 'https://api.elevenlabs.io/v1/sound-generation';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { description, audioType, sceneData, similarScenes } = body;
    
    // Ensure generated directory exists
    await mkdir(path.join(process.cwd(), 'public/generated'), { recursive: true });
    
    const timestamp = Date.now();
    const audioFiles = [];

    // Check if this is a standalone request (description + audioType)
    if (description && audioType) {
      console.log('Generating standalone audio:', description, audioType);
      
      if (!ELEVENLABS_API_KEY) {
        return NextResponse.json(
          { success: false, error: 'ELEVENLABS_API_KEY not configured' },
          { status: 500 }
        );
      }

      // Generate SFX using ElevenLabs
      const sfxResponse = await fetch(ELEVENLABS_SFX_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: description,
          duration_seconds: audioType === 'music' ? 15 : 5,
        }),
      });

      if (!sfxResponse.ok) {
        const error = await sfxResponse.text();
        console.error('ElevenLabs SFX error:', error);
        return NextResponse.json(
          { success: false, error: `ElevenLabs API error: ${error}` },
          { status: 500 }
        );
      }

      const audioBuffer = Buffer.from(await sfxResponse.arrayBuffer());
      const filename = `audio-${audioType}-${timestamp}.mp3`;
      const filepath = path.join(process.cwd(), 'public/generated', filename);
      
      await writeFile(filepath, audioBuffer);
      
      return NextResponse.json({
        success: true,
        audioUrl: `/api/files/${filename}`,
        type: audioType,
        description,
      });
    }

    // Full scene audio generation (sceneData + similarScenes)
    if (sceneData) {
      console.log('Generating full scene audio for:', sceneData.scene_name);
      
      // Generate background music (placeholder for now - ElevenLabs Music API needs separate handling)
      const musicFilename = `music-${timestamp}.mp3`;
      
      if (ELEVENLABS_API_KEY) {
        // Try to generate music-like ambient sound
        const musicPrompt = similarScenes?.[0]?.audio_profile?.music_prompt || 
          `${sceneData.mood} ambient background music for ${sceneData.theme}`;
        
        try {
          const musicResponse = await fetch(ELEVENLABS_SFX_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
              text: musicPrompt,
              duration_seconds: 15,
            }),
          });

          if (musicResponse.ok) {
            const musicBuffer = Buffer.from(await musicResponse.arrayBuffer());
            await writeFile(
              path.join(process.cwd(), 'public/generated', musicFilename),
              musicBuffer
            );
            
            audioFiles.push({
              type: 'music',
              name: 'Background Music',
              url: `/api/files/${musicFilename}`,
              status: 'generated',
            });
          } else {
            throw new Error('Music generation failed');
          }
        } catch (error) {
          console.error('Music generation error:', error);
          // Fallback to placeholder
          await writeFile(
            path.join(process.cwd(), 'public/generated', musicFilename),
            Buffer.from([0xFF, 0xFB, 0x90, 0x00])
          );
          
          audioFiles.push({
            type: 'music',
            name: 'Background Music',
            url: `/api/files/${musicFilename}`,
            status: 'placeholder',
          });
        }
      } else {
        // Placeholder music
        await writeFile(
          path.join(process.cwd(), 'public/generated', musicFilename),
          Buffer.from([0xFF, 0xFB, 0x90, 0x00])
        );
        
        audioFiles.push({
          type: 'music',
          name: 'Background Music',
          url: `/api/files/${musicFilename}`,
          status: 'placeholder',
          note: 'Add ELEVENLABS_API_KEY for real music generation'
        });
      }
      
      // Generate SFX for each audio zone
      if (sceneData.audio_zones && ELEVENLABS_API_KEY) {
        for (let i = 0; i < sceneData.audio_zones.length; i++) {
          const zone = sceneData.audio_zones[i];
          const sfxFilename = `sfx-${i}-${timestamp}.mp3`;
          
          try {
            const sfxResponse = await fetch(ELEVENLABS_SFX_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
              },
              body: JSON.stringify({
                text: zone.sound,
                duration_seconds: 5,
              }),
            });

            if (sfxResponse.ok) {
              const sfxBuffer = Buffer.from(await sfxResponse.arrayBuffer());
              await writeFile(
                path.join(process.cwd(), 'public/generated', sfxFilename),
                sfxBuffer
              );
              
              audioFiles.push({
                type: 'sfx',
                name: zone.sound || `Sound ${i + 1}`,
                url: `/api/files/${sfxFilename}`,
                zone: zone,
                status: 'generated',
              });
            } else {
              throw new Error('SFX generation failed');
            }
          } catch (error) {
            console.error(`SFX generation error for zone ${i}:`, error);
            // Fallback to placeholder
            await writeFile(
              path.join(process.cwd(), 'public/generated', sfxFilename),
              Buffer.from([0xFF, 0xFB, 0x90, 0x00])
            );
            
            audioFiles.push({
              type: 'sfx',
              name: zone.sound || `Sound ${i + 1}`,
              url: `/api/files/${sfxFilename}`,
              zone: zone,
              status: 'placeholder',
            });
          }
        }
      } else if (sceneData.audio_zones) {
        // Placeholder SFX without API key
        for (let i = 0; i < sceneData.audio_zones.length; i++) {
          const zone = sceneData.audio_zones[i];
          const sfxFilename = `sfx-${i}-${timestamp}.mp3`;
          
          await writeFile(
            path.join(process.cwd(), 'public/generated', sfxFilename),
            Buffer.from([0xFF, 0xFB, 0x90, 0x00])
          );
          
          audioFiles.push({
            type: 'sfx',
            name: zone.sound || `Sound ${i + 1}`,
            url: `/api/files/${sfxFilename}`,
            zone: zone,
            status: 'placeholder',
          });
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        audioFiles,
        note: ELEVENLABS_API_KEY ? 'Using ElevenLabs API' : 'Using placeholder audio - add ELEVENLABS_API_KEY for real generation'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request: expected (description + audioType) or sceneData' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Generate audio error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
