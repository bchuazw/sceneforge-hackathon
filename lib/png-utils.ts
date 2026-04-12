import { crc32 } from 'zlib';

export function createPngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type);
  const chunk = Buffer.concat([typeBuffer, data]);
  
  const crc = crc32(chunk);
  
  const result = Buffer.alloc(4 + 4 + data.length + 4);
  result.writeUInt32BE(data.length, 0);
  typeBuffer.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc, 8 + data.length);
  
  return result;
}

interface ColorSet {
  top: [number, number, number];
  bottom: [number, number, number];
}

export function getThemeColors(theme: string, mood: string, time: string): ColorSet {
  // Night time overrides
  if (time === 'night' || time === 'midnight') {
    if (mood === 'scary' || mood === 'horror' || mood === 'creepy') {
      return { top: [5, 5, 15], bottom: [20, 10, 30] }; // Dark purple night
    }
    if (mood === 'peaceful' || mood === 'calm') {
      return { top: [10, 20, 40], bottom: [30, 50, 80] }; // Calm blue night
    }
    return { top: [15, 25, 45], bottom: [40, 50, 70] }; // Standard night
  }
  
  // Sunset/dusk
  if (time === 'sunset' || time === 'dusk' || time === 'evening') {
    if (mood === 'romantic' || mood === 'peaceful') {
      return { top: [80, 60, 100], bottom: [255, 150, 100] }; // Purple to orange
    }
    return { top: [60, 40, 80], bottom: [255, 120, 80] }; // Sunset
  }
  
  // Theme-based colors
  switch (theme) {
    case 'cyberpunk':
    case 'sci-fi':
    case 'futuristic':
      if (mood === 'dark' || mood === 'ominous') {
        return { top: [10, 5, 20], bottom: [40, 20, 60] }; // Dark cyberpunk
      }
      return { top: [20, 10, 40], bottom: [80, 30, 100] }; // Neon purple
      
    case 'forest':
    case 'woods':
    case 'nature':
      if (mood === 'mysterious' || mood === 'dark') {
        return { top: [30, 40, 30], bottom: [60, 70, 50] }; // Dark forest
      }
      return { top: [100, 150, 200], bottom: [150, 200, 150] }; // Bright forest
      
    case 'ocean':
    case 'sea':
    case 'beach':
      return { top: [100, 150, 220], bottom: [150, 200, 255] }; // Ocean blue
      
    case 'desert':
      return { top: [200, 180, 150], bottom: [255, 220, 180] }; // Sandy
      
    case 'japanese':
    case 'asian':
      if (time === 'night') {
        return { top: [30, 30, 60], bottom: [80, 60, 100] }; // Night Japan
      }
      return { top: [150, 200, 255], bottom: [255, 200, 220] }; // Cherry blossom
      
    case 'medieval':
    case 'castle':
      if (mood === 'dark' || mood === 'ominous') {
        return { top: [40, 40, 50], bottom: [80, 70, 70] }; // Dark medieval
      }
      return { top: [100, 150, 220], bottom: [200, 180, 150] }; // Day medieval
      
    case 'horror':
    case 'spooky':
      return { top: [10, 10, 15], bottom: [40, 30, 35] }; // Dark horror
      
    case 'space':
    case 'alien':
      return { top: [5, 5, 15], bottom: [30, 20, 50] }; // Deep space
      
    default:
      // Mood-based fallback
      switch (mood) {
        case 'dark':
        case 'ominous':
        case 'scary':
          return { top: [30, 30, 40], bottom: [60, 50, 55] };
        case 'peaceful':
        case 'calm':
          return { top: [120, 180, 220], bottom: [200, 230, 255] };
        case 'mysterious':
          return { top: [40, 30, 60], bottom: [100, 80, 120] };
        case 'epic':
        case 'grand':
          return { top: [80, 120, 180], bottom: [200, 150, 100] };
        default:
          return { top: [100, 150, 220], bottom: [180, 200, 255] }; // Default blue sky
      }
  }
}
