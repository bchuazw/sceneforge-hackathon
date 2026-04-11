// Seed data for turbopuffer
// Run this after setting up your turbopuffer account to populate initial scenes

export const seedScenes = [
  {
    id: "horror_forest_001",
    description: "Dark forest at night with creepy cabin and wolf howls",
    theme: "horror",
    mood: "creepy",
    time: "night",
    audio_profile: {
      music_prompt: "Dark ambient drone, low rumble, eerie strings, horror atmosphere",
      music_duration: 60,
      sfx_prompts: {
        wind: "Wind howling through trees at night, spooky",
        wolf: "Distant wolf howl, echoing in forest",
        cabin: "Creaky wooden door, old house ambience"
      }
    },
    lighting: {
      type: "moonlight",
      color: "#1a1a2e",
      intensity: 0.3
    }
  },
  {
    id: "racing_speedway_001",
    description: "NASCAR oval speedway with packed grandstands and roaring engines",
    theme: "racing",
    mood: "exciting",
    time: "day",
    audio_profile: {
      music_prompt: "Fast-paced southern rock, electric guitar riffs, high energy racing theme, 140 BPM",
      music_duration: 60,
      sfx_prompts: {
        engine: "V8 stock car engine, deep rumble at idle, high RPM scream",
        crowd: "Roaring stadium crowd, 10,000 people cheering, NASCAR energy",
        tires: "Tires screeching on asphalt, sharp turn"
      }
    },
    lighting: {
      type: "daylight",
      color: "#ffffff",
      intensity: 1.0
    }
  },
  {
    id: "scifi_space_station_001",
    description: "Futuristic space station interior with neon lights and holographic displays",
    theme: "scifi",
    mood: "mysterious",
    time: "space",
    audio_profile: {
      music_prompt: "Ambient synthwave, futuristic electronic, space atmosphere, slow tempo",
      music_duration: 60,
      sfx_prompts: {
        ambience: "Space station hum, machinery, air vents",
        computer: "Holographic interface beeps, sci-fi UI sounds",
        door: "Pneumatic sci-fi door sliding open"
      }
    },
    lighting: {
      type: "neon",
      color: "#00ffff",
      intensity: 0.7
    }
  },
  {
    id: "fantasy_castle_001",
    description: "Medieval castle courtyard with torchlight and distant dragon roar",
    theme: "fantasy",
    mood: "epic",
    time: "sunset",
    audio_profile: {
      music_prompt: "Epic orchestral fantasy, medieval instruments, adventurous",
      music_duration: 60,
      sfx_prompts: {
        dragon: "Distant dragon roar, echoing, mythical beast",
        torch: "Fire crackling, medieval torch ambience",
        wind: "Wind through castle towers, flags flapping"
      }
    },
    lighting: {
      type: "sunset",
      color: "#ff6b35",
      intensity: 0.6
    }
  }
];

// Usage: Import and upload to turbopuffer after creating your index
// This gives the vector search some initial data to work with