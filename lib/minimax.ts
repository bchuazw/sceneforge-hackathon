// Minimax API client for text generation (using as OpenAI alternative)
// NOTE: For hackathon submission, replace with OpenAI GPT-4 for best results

const MINIMAX_API_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2";

export async function generateText(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (!process.env.MINIMAX_API_KEY) {
    throw new Error("MINIMAX_API_KEY is required");
  }

  const response = await fetch(MINIMAX_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: "abab6.5s-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Minimax API error: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function createEmbedding(text: string): Promise<number[]> {
  // Minimax doesn't have embeddings, so we'll use a simple hash-based approach
  // or call an embedding service. For now, return a deterministic pseudo-embedding
  // NOTE: Replace with OpenAI embeddings for production
  
  const hash = text.split("").reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
  }, 0);
  
  // Generate 768-dim vector from hash
  const embedding = new Array(768).fill(0).map((_, i) => {
    const x = Math.sin(hash + i) * 10000;
    return x - Math.floor(x);
  });
  
  return embedding;
}