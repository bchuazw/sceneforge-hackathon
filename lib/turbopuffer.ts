// turbopuffer client - FULL IMPLEMENTATION
import { Turbopuffer } from "@turbopuffer/turbopuffer";

if (!process.env.TURBOPUFFER_API_KEY) {
  throw new Error("TURBOPUFFER_API_KEY is required");
}

export const tpuf = new Turbopuffer({
  apiKey: process.env.TURBOPUFFER_API_KEY,
});

export const SCENE_INDEX = "game-scenes";

// Get namespace for scenes
function getNamespace() {
  return tpuf.namespace(SCENE_INDEX);
}

// Search similar scenes using turbopuffer
export async function searchSimilarScenes(
  embedding: number[],
  topK: number = 3
) {
  try {
    const ns = getNamespace();
    const results = await ns.query({
      vector: embedding,
      top_k: topK,
      include_attributes: true,
      distance_metric: "cosine_distance",
    });
    
    return results.map((r: any) => ({
      id: r.id,
      score: r.dist,
      ...r.attributes,
    }));
  } catch (error: any) {
    console.error("turbopuffer search error:", error.message);
    // Return empty array if index doesn't exist yet
    if (error.message?.includes("not found")) {
      return [];
    }
    throw error;
  }
}

// Upsert a scene to turbopuffer
export async function upsertScene(
  id: string,
  embedding: number[],
  attributes: any
) {
  try {
    const ns = getNamespace();
    await ns.upsert({
      vectors: [{
        id,
        vector: embedding,
        attributes,
      }],
      distance_metric: "cosine_distance",
    });
    return true;
  } catch (error: any) {
    console.error("turbopuffer upsert error:", error.message);
    return false;
  }
}

// Check if namespace exists and has data
export async function checkNamespace() {
  try {
    const ns = getNamespace();
    const count = await ns.approxNumVectors({});
    return { exists: true, count };
  } catch (error: any) {
    if (error.message?.includes("not found")) {
      return { exists: false, count: 0 };
    }
    throw error;
  }
}