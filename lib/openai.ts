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
  const systemPrompt = `You are a senior game-scene director. Convert a short natural-language description into a richly detailed, playable 3D scene that renders as a stylized low-poly game world.

Return VALID JSON only, no markdown, no explanations.

Design principles — take decisive creative liberty:
- Populate DENSELY. Produce 25-40 objects per scene. A "forest" needs many trees, undergrowth, rocks, mushrooms, fallen logs. A "city street" needs buildings, lamps, vehicles, signs, food carts, debris. Empty scenes are a failure.
- Spread objects across the XZ plane in natural clusters (positions roughly in the range [-35, 35] for X and Z; Y is ground level 0 unless the object is meant to float/fly).
- Vary scales (0.5 – 3.0) so the scene looks organic, not gridded. Cluster similar objects (groves of trees, rows of buildings, grandstand sections).
- ALWAYS set "properties.type" to a specific asset keyword from the vocabulary below so the renderer picks the right stylized model. A generic "prop" with no subtype renders as a gray box.
- Add "procedural_layers": at least 3 distinct passes that describe how a renderer should layer detail (ground texture, weather particles, ambient fog, distant silhouettes, foreground props).
- Audio zones should feel placed: 1 ambient bed + 2-4 positional SFX that match visible objects.
- Narration: write a 2-3 sentence cinematic description of the scene in second person ("You find yourself...") that a TTS engine will speak when the scene loads.

Asset vocabulary for "type" and "properties.type" (pick the closest match — the renderer has specific low-poly models for each):
- Nature: pine_tree, broad_tree, tree, rock, boulder, grass, bush, mushroom, crystal, flower, log
- Structures: cottage, building, tower, ruin, fence, grandstand, bridge, wall
- Sci-fi/urban: hologram, neon_sign, lamp_post, street_light, barrel, food_cart, antenna
- Vehicles: race_car, rover, hover_car, spacecraft
- Characters: character, astronaut, spirit, creature
- Racing: flag, cone, tire_stack, checkpoint
- Lights: light (use properties.color and properties.intensity)

Schema:
{
  "scene_name": "string (short, evocative title)",
  "theme": "adventure|horror|racing|scifi|fantasy|nature",
  "mood": "exciting|creepy|peaceful|mysterious|epic",
  "time": "day|night|sunset|dawn",
  "narration": "string (2-3 sentence cinematic intro, second person)",
  "objects": [
    { "type": "<asset keyword>", "position": [x, y, z], "scale": number, "properties": { "type": "<specific asset subtype>", "color": "#hex (optional)" } }
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
    // Try best-available model in order, falling back if unavailable to the account.
    // Each candidate defines its own param set so we never send params a given
    // model doesn't understand.
    type Candidate = { model: string; params: Record<string, any> };
    const candidates: Candidate[] = [
      { model: 'gpt-5', params: { max_completion_tokens: 8000, reasoning_effort: 'high' } },
      { model: 'gpt-5-mini', params: { max_completion_tokens: 8000, reasoning_effort: 'high' } },
      { model: 'gpt-4.5-preview', params: { max_tokens: 6000, temperature: 0.8 } },
      { model: 'gpt-4.1', params: { max_tokens: 6000, temperature: 0.8 } },
      { model: 'gpt-4o', params: { max_tokens: 6000, temperature: 0.8 } },
    ];
    let response: any = null;
    let lastErr: any = null;
    let usedModel = '';
    for (const c of candidates) {
      try {
        response = await openai.chat.completions.create({
          model: c.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          ...c.params,
        } as any);
        usedModel = c.model;
        console.log(`parseSceneDescription: using model=${c.model}`);
        break;
      } catch (err: any) {
        lastErr = err;
        const msg = err?.message || String(err);
        console.warn(`parseSceneDescription: ${c.model} failed: ${msg.slice(0, 200)}`);
      }
    }
    if (!response) {
      const hint = lastErr?.message?.slice(0, 200) || 'unknown';
      throw new Error(`all models failed, last=${hint}`);
    }

    const content = response.choices[0]?.message?.content || '';
    console.log(`parseSceneDescription: model=${usedModel} content_len=${content.length}`);
    
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
    // Fallback to basic structure, but surface the error for diagnosis.
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
      _parse_error: error?.message || String(error),
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
