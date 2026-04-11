// ElevenLabs API client
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";
const API_KEY = process.env.ELEVENLABS_API_KEY;

export async function generateMusic(prompt: string, duration: number = 60): Promise<Buffer> {
  if (!API_KEY || API_KEY === "placeholder_add_elevenlabs_key_here") {
    throw new Error("ELEVENLABS_API_KEY not set");
  }

  const response = await fetch(`${ELEVENLABS_BASE_URL}/sound-generation`, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: Math.min(duration, 22), // ElevenLabs max is 22 seconds
      prompt_influence: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${error}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function generateSoundEffect(
  text: string, 
  durationSeconds: number = 3
): Promise<Buffer> {
  if (!API_KEY || API_KEY === "placeholder_add_elevenlabs_key_here") {
    throw new Error("ELEVENLABS_API_KEY not set");
  }

  const response = await fetch(`${ELEVENLABS_BASE_URL}/sound-generation`, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      duration_seconds: Math.min(durationSeconds, 22),
      prompt_influence: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${error}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// Batch generate multiple SFX
export async function generateMultipleSFX(
  requests: { name: string; prompt: string; duration?: number }[]
): Promise<{ name: string; buffer: Buffer }[]> {
  if (!API_KEY || API_KEY === "placeholder_add_elevenlabs_key_here") {
    return [];
  }

  const results = await Promise.allSettled(
    requests.map(async (req) => ({
      name: req.name,
      buffer: await generateSoundEffect(req.prompt, req.duration || 3),
    }))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<{ name: string; buffer: Buffer }> => r.status === "fulfilled")
    .map(r => r.value);
}
