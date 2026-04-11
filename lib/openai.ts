// OpenAI client for scene parsing and embeddings
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function parseSceneDescription(prompt: string): Promise<any> {
  const systemPrompt = `You are a game scene parser. Convert natural language descriptions into structured JSON.

Return valid JSON only, no markdown, no explanations.

Schema:
{
  "scene_name": "string",
  "theme": "adventure|horror|racing|scifi|fantasy|nature",
  "mood": "exciting|creepy|peaceful|mysterious|epic",
  "time": "day|night|sunset|dawn",
  "objects": [
    {
      "type": "tree|rock|building|vehicle|character|prop",
      "position": [x, y, z],
      "scale": number,
      "properties": {}
    }
  ],
  "lighting": {
    "type": "daylight|moonlight|neon|fire|ambient",
    "intensity": 0.0-1.0,
    "color": "#hexcolor"
  },
  "audio_zones": [
    {
      "type": "ambient|positional|player",
      "sound": "description",
      "position": [x, y, z] (for positional),
      "volume": 0.0-1.0
    }
  ],
  "gameplay": {
    "type": "exploration|racing|puzzle|horror",
    "camera": "first_person|third_person|chase"
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
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
  } catch (error) {
    console.error("OpenAI parse error:", error);
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
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  
  return response.data[0].embedding;
}
