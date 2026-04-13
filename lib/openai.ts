// OpenAI client for scene parsing and embeddings
import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required");
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

export async function parseSceneDescription(prompt: string): Promise<any> {
  const systemPrompt = `You are a senior game-scene director. Convert a short natural-language description into a richly detailed, playable 3D scene.

Return VALID JSON only, no markdown, no explanations.

Design principles — take decisive creative liberty:
- Populate richly. A "forest" should have 8-15 trees at varied positions, not 2. A "city street" should have multiple buildings, lamps, vehicles, debris. Err on the side of MORE detail, not less.
- Spread objects across the XZ plane in natural clusters (positions roughly in the range [-30, 30] for X and Z; Y is ground level 0 unless floating).
- Vary scales (0.5 – 3.0) so the scene looks organic, not gridded.
- Add "procedural_layers": at least 3 distinct passes that describe how a renderer should layer detail (e.g. ground texture, weather particles, ambient fog, distant silhouettes, foreground props). Be opinionated — if a muddy road would look better with 8 procedural layers, say so.
- Audio zones should feel placed: 1 ambient bed + 2-4 positional SFX that match visible objects.
- Narration: write a 2-3 sentence cinematic description of the scene in second person ("You find yourself...") that a TTS engine will speak when the scene loads.

Schema:
{
  "scene_name": "string (short, evocative title)",
  "theme": "adventure|horror|racing|scifi|fantasy|nature",
  "mood": "exciting|creepy|peaceful|mysterious|epic",
  "time": "day|night|sunset|dawn",
  "narration": "string (2-3 sentence cinematic intro, second person)",
  "objects": [
    { "type": "tree|rock|building|vehicle|character|prop|light", "position": [x, y, z], "scale": number, "properties": {} }
  ],
  "procedural_layers": [
    { "name": "string", "description": "string (what this layer adds and why it improves the scene)" }
  ],
  "lighting": {
    "type": "daylight|moonlight|neon|fire|ambient",
    "intensity": 0.0-1.0,
    "color": "#hexcolor",
    "fog_color": "#hexcolor",
    "fog_density": 0.0-0.1
  },
  "audio_zones": [
    { "type": "ambient|positional|player", "sound": "description for ElevenLabs SFX", "position": [x, y, z], "volume": 0.0-1.0 }
  ],
  "music_direction": "string (compositional brief for ElevenLabs Music API — instrumentation, tempo, key, dynamics)",
  "gameplay": { "type": "exploration|racing|puzzle|horror", "camera": "first_person|third_person|chase" }
}`;

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                      content.match(/```\n?([\s\S]*?)\n?```/) ||
                      [null, content];
    
    const jsonStr = jsonMatch[1]?.trim() || content.trim();
    const parsed = JSON.parse(jsonStr);
    
    return {
      ...parsed,
      raw_prompt: prompt,
    };
  } catch (error: any) {
    console.error("OpenAI parse error:", error.message);
    // Fallback to basic structure
    return {
      scene_name: "Generated Scene",
      theme: "adventure",
      mood: "mysterious",
      time: "day",
      objects: [
        { type: "tree", position: [0, 0, 0], scale: 1 },
        { type: "rock", position: [5, 0, 5], scale: 0.5 },
      ],
      lighting: { type: "daylight", intensity: 1, color: "#ffffff" },
      audio_zones: [{ type: "ambient", sound: "wind", volume: 0.3 }],
      gameplay: { type: "exploration", camera: "third_person" },
      raw_prompt: prompt,
    };
  }
}

export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const openai = getOpenAI();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error: any) {
    console.error("OpenAI embedding error:", error.message);
    // Return zero vector as fallback (will not match anything in search)
    if (error.message?.includes("OPENAI_API_KEY")) {
      console.log("OPENAI_API_KEY not set, returning zero embedding");
      return new Array(1536).fill(0);
    }
    throw error;
  }
}
