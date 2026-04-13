# SceneForge AI

**ElevenLabs × turbopuffer Hackathon Entry**

AI-powered game scene generator. Type a description, get a playable Three.js game with AI-generated audio and visuals.

![SceneForge AI](https://sceneforge-hackathon.onrender.com/og-image.png)

**🔗 Live demo:** https://sceneforge-hackathon.onrender.com

## 🎮 How It Works

1. **Describe your scene** (e.g., "Dark forest at night with a creepy cabin")
2. **AI parses** your description into structured scene data
3. **turbopuffer searches** for similar scenes with proven audio profiles
4. **ElevenLabs generates** background music, sound effects, and voice narration
5. **Three.js renders** a playable game scene
6. **Play instantly** in your browser with WASD controls and interactive objects

## ✨ New Features

### 🔍 Enhanced turbopuffer Integration
- **Vector search**: Every generated scene is saved to turbopuffer with embeddings
- **Find similar scenes**: Discover related scenes based on vector similarity
- **Smart recommendations**: Get scene suggestions based on your prompts

### 🎵 Real ElevenLabs Music API
- **Composed soundtracks**: Uses ElevenLabs `/v1/music` to compose a 30s track per scene (not just ambient SFX)
- **Compositional briefs**: GPT-4o writes a musical direction (instrumentation, tempo, key, dynamics) for each scene before the Music API is called
- **Graceful fallback**: Falls back to sound-generation if the Music API is unavailable

### 🎙️ ElevenLabs Voice Narration
- **Cinematic narration**: GPT-4o writes a 2-3 sentence second-person intro for each scene; ElevenLabs TTS voices it automatically as part of the build pipeline
- **Audio mixing**: Background music + positional SFX + narration

### 🧱 Procedural Scene Direction
- **GPT-4o as scene director**: Parses a short prompt into 8-15 objects across natural clusters, plus named procedural layers (ground texture, weather, fog, silhouettes, foreground props)
- **Decisive model calls**: The model is instructed to err on the side of MORE detail and to justify each procedural layer, not settle for a thin scene

### 🖼️ Scene Gallery
- **Browse all scenes**: Visual gallery showcasing all generated scenes
- **Filter by theme**: Filter scenes by adventure, horror, scifi, fantasy, etc.
- **Scene cards**: Thumbnails with metadata (theme, mood, object count)

### 🚀 Social & Sharing
- **Shareable links**: Each scene has a unique URL
- **Open Graph tags**: Rich previews when sharing on social media
- **Copy link**: Quick copy-to-clipboard for scene URLs
- **Native share**: Mobile share sheet support

### 🎨 Remix Feature
- **Fork scenes**: "Remix this scene" button to create variations
- **Edit prompts**: Start with an existing prompt and modify it
- **Build community**: Iterate on popular scene ideas

### 🎮 Improved Game Experience
- **Day/night cycle**: Toggle between day and night modes
- **Camera modes**: Follow camera and orbit camera
- **Interactive objects**: Click objects to play sounds and animations
- **Better controls**: WASD movement, mouse look, space to jump
- **Progress indicator**: Step-by-step generation progress

## 🏗️ Architecture

```
User Prompt → LLM Parser → turbopuffer Search → ElevenLabs Audio → Three.js Game
                ↓                ↓                      ↓
           Save Scene    Find Similar          Voice Narration
           (Vector DB)    Scenes                + SFX + Music
```

### Tech Stack
- **Frontend:** Next.js 14, React, TypeScript, Tailwind
- **3D Engine:** Three.js, React Three Fiber
- **Audio:** ElevenLabs Music API + Sound Effects API + TTS API
- **Vector Search:** turbopuffer
- **LLM:** OpenAI GPT-4
- **Images:** Replicate (Stable Diffusion)
- **Hosting:** Render

## 🚀 Deployment

### Prerequisites
Get API keys from:
- [ElevenLabs](https://elevenlabs.io) - Music, SFX, and TTS
- [turbopuffer](https://turbopuffer.com) - Vector search
- [OpenAI](https://platform.openai.com) - Scene parsing & embeddings
- [Replicate](https://replicate.com) - Skybox generation

### Local Development
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run dev server
npm run dev
```

### Deploy to Render
1. Push code to GitHub
2. Connect repo to Render
3. Add environment variables in Render Dashboard
4. Deploy!

## 📁 Project Structure

```
app/
├── api/
│   ├── parse-scene/        # LLM scene parsing
│   ├── search-scenes/      # turbopuffer vector search
│   ├── generate-audio/     # ElevenLabs audio generation
│   ├── generate-narration/ # ElevenLabs TTS
│   ├── generate-skybox/    # Replicate skybox generation
│   ├── build-scene/        # Main orchestrator
│   ├── list-scenes/        # Gallery API
│   ├── similar-scenes/     # Find similar scenes
│   └── get-scene/          # Load single scene
├── page.tsx                # Landing page with generator
├── gallery/                # Scene gallery page
├── play/[id]/              # Scene player page
└── layout.tsx              # Root layout with OG tags

components/                 # Three.js game components
├── GameRenderer.tsx        # Main game renderer with controls

lib/                        # API clients
├── turbopuffer.ts          # Vector search client
├── openai.ts               # LLM & embeddings
├── elevenlabs.ts           # Audio generation
└── seed-turbopuffer.ts     # Initial data seeding

data/scenes/                # Generated scene JSON files
public/generated/           # Generated audio & images
```

## 🔑 Environment Variables

```env
ELEVENLABS_API_KEY=your_key_here
TURBOPUFFER_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
REPLICATE_API_TOKEN=your_token_here
NEXT_PUBLIC_URL=https://your-domain.com
```

## 📝 API Routes

| Endpoint | Description |
|----------|-------------|
| `POST /api/parse-scene` | Parse natural language to scene JSON |
| `POST /api/search-scenes` | Find similar scenes via turbopuffer |
| `POST /api/generate-audio` | Generate music/SFX via ElevenLabs |
| `POST /api/generate-narration` | Generate voice narration via ElevenLabs TTS |
| `POST /api/generate-skybox` | Generate skybox via Replicate |
| `POST /api/build-scene` | Full pipeline orchestrator |
| `GET /api/list-scenes` | List all generated scenes |
| `GET /api/similar-scenes` | Find similar scenes for a given scene |
| `GET /api/get-scene` | Load a single scene by ID |

## 🎯 Example Prompts

Try these prompts to see SceneForge AI in action:

- "A peaceful Japanese garden with cherry blossoms and a koi pond at sunset"
- "Cyberpunk city street with neon signs, rain, and flying cars at night"
- "Medieval castle courtyard with torches and knights preparing for battle"
- "Alien planet with purple crystals, floating rocks, and two moons"
- "Abandoned spaceship corridor with flickering lights and steam vents"

## 🏆 Hackathon Judging Criteria

- ✅ Uses **ElevenLabs APIs** (Music + Sound Effects + TTS)
- ✅ Uses **turbopuffer** (vector search for scene similarity)
- ✅ Creative combination of both services
- ✅ Working demo with viral potential
- ✅ Shareable scenes with social features
- ✅ Voice narration showcases ElevenLabs TTS

## 📅 Timeline

- Submissions close: April 16, 2026
- Winners announced: April 21, 2026

---

Built with ❤️ for the ElevenLabs Hackathon
