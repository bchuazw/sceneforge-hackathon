import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_SFX_URL = 'https://api.elevenlabs.io/v1/sound-generation';

export async function generateAudioForScene(
  sceneData: any,
  similarScenes: any[] = []
): Promise<any[]> {
  const audioFiles: any[] = [];
  
  // Ensure generated directory exists
  await mkdir(path.join(process.cwd(), 'public/generated'), { recursive: true });
  
  const timestamp = Date.now();
  
  console.log('Generating full scene audio for:', sceneData.scene_name);
  
  // Generate background music
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
        throw new Error(`Music generation failed: ${await musicResponse.text()}`);
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
    // Placeholder music without API key
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
          throw new Error(`SFX generation failed: ${await sfxResponse.text()}`);
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
  
  return audioFiles;
}

export async function generateStandaloneAudio(
  description: string,
  audioType: 'music' | 'sfx'
): Promise<{ audioUrl: string; type: string; description: string }> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  // Ensure generated directory exists
  await mkdir(path.join(process.cwd(), 'public/generated'), { recursive: true });
  
  const timestamp = Date.now();

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
    throw new Error(`ElevenLabs API error: ${error}`);
  }

  const audioBuffer = Buffer.from(await sfxResponse.arrayBuffer());
  const filename = `audio-${audioType}-${timestamp}.mp3`;
  const filepath = path.join(process.cwd(), 'public/generated', filename);
  
  await writeFile(filepath, audioBuffer);
  
  return {
    audioUrl: `/api/files/${filename}`,
    type: audioType,
    description,
  };
}
