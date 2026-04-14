import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_SFX_URL = 'https://api.elevenlabs.io/v1/sound-generation';
const ELEVENLABS_MUSIC_URL = 'https://api.elevenlabs.io/v1/music';

// Build a compositional music prompt from scene data (not just a bag of moods).
// This is where the model gets to "decide" on instrumentation, tempo, and dynamics.
function buildMusicPrompt(sceneData: any, similarScenes: any[]): string {
  // Prefer the parser's compositional brief when available (set by gpt-4o scene director).
  if (sceneData?.music_direction && typeof sceneData.music_direction === 'string') {
    return sceneData.music_direction;
  }
  const hinted = similarScenes?.[0]?.audio_profile?.music_prompt;
  if (hinted) return hinted;

  const theme = sceneData.theme || 'adventure';
  const mood = sceneData.mood || 'mysterious';
  const time = sceneData.time || 'day';

  const palette: Record<string, string> = {
    horror: 'dissonant strings, sub-bass drones, metallic percussion, sparse piano',
    scifi: 'analog synths, arpeggiated pads, granular textures, filtered white noise',
    fantasy: 'orchestral strings, solo flute, harp arpeggios, distant choir',
    adventure: 'heroic brass, marching percussion, full orchestra swells',
    racing: 'driving synthwave bass, four-on-the-floor kick, crunchy guitars, 128 BPM',
    nature: 'acoustic guitar fingerpicking, wooden flute, ambient pads, soft chimes',
  };

  const dynamics: Record<string, string> = {
    creepy: 'slow tempo 60 BPM, minor key, building dread',
    peaceful: 'gentle tempo 70 BPM, major key, warm reverb',
    exciting: 'fast tempo 140 BPM, crescendos, driving rhythm',
    mysterious: 'shifting tempo, modal key, sparse texture',
    epic: 'massive dynamics, 100 BPM, full ensemble swells',
  };

  return `A ${mood} ${theme} game soundtrack for a ${time} scene. Instrumentation: ${palette[theme] || palette.adventure}. ${dynamics[mood] || dynamics.mysterious}. Cinematic, loopable, no vocals.`;
}

export async function generateAudioForScene(
  sceneData: any,
  similarScenes: any[] = []
): Promise<any[]> {
  const audioFiles: any[] = [];

  // Ensure generated directory exists
  await mkdir(path.join(process.cwd(), 'public/generated'), { recursive: true });

  const timestamp = Date.now();

  console.log('Generating full scene audio for:', sceneData.scene_name);

  // Generate background music via the real ElevenLabs Music API (/v1/music)
  const musicFilename = `music-${timestamp}.mp3`;

  if (ELEVENLABS_API_KEY) {
    const musicPrompt = buildMusicPrompt(sceneData, similarScenes);
    let musicGenerated = false;

    try {
      const musicResponse = await fetch(ELEVENLABS_MUSIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          prompt: musicPrompt,
          music_length_ms: 30000,
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
          source: 'elevenlabs-music',
          prompt: musicPrompt,
        });
        musicGenerated = true;
      } else {
        const errText = await musicResponse.text();
        const isQuota = errText.includes('quota_exceeded');
        console.error(`ElevenLabs Music API error (${isQuota ? 'QUOTA EXCEEDED' : musicResponse.status}):`, errText);
        if (isQuota) {
          // Hard stop — no point trying fallback if quota is exhausted
          console.warn('ElevenLabs quota exhausted. Skipping audio generation entirely.');
          await writeFile(path.join(process.cwd(), 'public/generated', musicFilename), Buffer.from([0xFF, 0xFB, 0x90, 0x00]));
          audioFiles.push({ type: 'music', name: 'Background Music', url: `/api/files/${musicFilename}`, status: 'quota_exceeded' });
          return audioFiles;
        }
      }
    } catch (error) {
      console.error('Music API fetch error, falling back to sound-generation:', error);
    }

    // Fallback: sound-generation endpoint (ambient, not composed) if Music API unavailable.
    if (!musicGenerated) {
      try {
        const sfxResponse = await fetch(ELEVENLABS_SFX_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: musicPrompt,
            duration_seconds: 22,
          }),
        });

        if (sfxResponse.ok) {
          const buf = Buffer.from(await sfxResponse.arrayBuffer());
          await writeFile(path.join(process.cwd(), 'public/generated', musicFilename), buf);
          audioFiles.push({
            type: 'music',
            name: 'Background Music',
            url: `/api/files/${musicFilename}`,
            status: 'generated',
            source: 'elevenlabs-sfx-fallback',
          });
          musicGenerated = true;
        }
      } catch (err) {
        console.error('Fallback SFX-as-music error:', err);
      }
    }

    if (!musicGenerated) {
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
          const errText = await sfxResponse.text();
          if (errText.includes('quota_exceeded')) {
            console.warn('ElevenLabs quota exhausted during SFX generation, stopping.');
            break; // Stop SFX loop — no point trying more
          }
          throw new Error(`SFX generation failed: ${errText}`);
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
