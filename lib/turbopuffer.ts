// turbopuffer client - FULL IMPLEMENTATION
import { Turbopuffer } from "@turbopuffer/turbopuffer";

let tpufInstance: Turbopuffer | null = null;

function getTpuf(): Turbopuffer {
  if (!tpufInstance) {
    const apiKey = process.env.TURBOPUFFER_API_KEY;
    if (!apiKey) {
      throw new Error("TURBOPUFFER_API_KEY is required");
    }
    tpufInstance = new Turbopuffer({ apiKey });
  }
  return tpufInstance;
}

export const SCENE_INDEX = "game-scenes";

// Get namespace for scenes
function getNamespace() {
  return getTpuf().namespace(SCENE_INDEX);
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
    // Return empty array if index doesn't exist yet or API key is missing
    if (error.message?.includes("not found") || error.message?.includes("TURBOPUFFER_API_KEY")) {
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
    // Silently fail if API key is missing
    if (error.message?.includes("TURBOPUFFER_API_KEY")) {
      console.log("TURBOPUFFER_API_KEY not set, skipping vector storage");
      return false;
    }
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
    if (error.message?.includes("not found") || error.message?.includes("TURBOPUFFER_API_KEY")) {
      return { exists: false, count: 0 };
    }
    throw error;
  }
}

// List all scenes from turbopuffer (for gallery)
export async function listAllScenes(limit: number = 100) {
  try {
    const ns = getNamespace();
    // Use export() to list all vectors without needing a query vector
    // This is the correct way to get all records from turbopuffer
    const { vectors } = await ns.export({});
    
    // Sort by created_at (newest first) and apply limit
    const sortedVectors = vectors
      .sort((a: any, b: any) => {
        const dateA = new Date(a.attributes?.created_at || 0).getTime();
        const dateB = new Date(b.attributes?.created_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);
    
    return sortedVectors.map((r: any) => ({
      id: r.id,
      ...r.attributes,
    }));
  } catch (error: any) {
    console.error("turbopuffer list all error:", error.message);
    // Return empty array if index doesn't exist yet or API key is missing
    if (error.message?.includes("not found") || error.message?.includes("TURBOPUFFER_API_KEY")) {
      return [];
    }
    throw error;
  }
}
