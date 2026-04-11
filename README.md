# SceneForge AI

**ElevenLabs × turbopuffer Hackathon Entry**

AI-powered game scene generator. Type a description, get a playable Three.js game with AI-generated audio and visuals.

## 🎮 How It Works

1. **Describe your scene** (e.g., "Dark forest at night with a creepy cabin")
2. **AI parses** your description into structured scene data
3. **turbopuffer searches** for similar scenes with proven audio profiles
4. **ElevenLabs generates** background music and sound effects
5. **Three.js renders** a playable game scene
6. **Play instantly** in your browser

## 🏗️ Architecture

```
User Prompt → LLM Parser → turbopuffer Search → ElevenLabs Audio → Three.js Game
```

### Tech Stack
- **Frontend:** Next.js 14, React, TypeScript, Tailwind
- **3D Engine:** Three.js, React Three Fiber
- **Audio:** ElevenLabs Music API + Sound Effects API
- **Vector Search:** turbopuffer
- **LLM:** OpenAI GPT-4
- **Images:** Replicate (Stable Diffusion)
- **Hosting:** Render

## 🚀 Deployment

### Prerequisites
Get API keys from:
- [ElevenLabs](https://elevenlabs.io)
- [turbopuffer](https://turbopuffer.com)
- [OpenAI](https://platform.openai.com)
- [Replicate](https://replicate.com)

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
│   ├── parse-scene/      # LLM scene parsing
│   ├── search-scenes/    # turbopuffer vector search
│   ├── generate-audio/   # ElevenLabs audio generation
│   ├── generate-image/   # Replicate skybox generation
│   └── build-scene/      # Main orchestrator
├── page.tsx              # Landing page
├── layout.tsx            # Root layout
└── globals.css           # Global styles

components/               # Three.js game components
lib/                      # API clients
public/generated/         # Generated assets (audio, images)
```

## 🔑 Environment Variables

```env
ELEVENLABS_API_KEY=your_key_here
TURBOPUFFER_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
REPLICATE_API_TOKEN=your_token_here
```

## 📝 API Routes

| Endpoint | Description |
|----------|-------------|
| `POST /api/parse-scene` | Parse natural language to scene JSON |
| `POST /api/search-scenes` | Find similar scenes via turbopuffer |
| `POST /api/generate-audio` | Generate music/SFX via ElevenLabs |
| `POST /api/generate-image` | Generate skybox via Replicate |
| `POST /api/build-scene` | Full pipeline orchestrator |

## 🎯 Hackathon Judging Criteria

- ✅ Uses **ElevenLabs APIs** (Music + Sound Effects)
- ✅ Uses **turbopuffer** (vector search for scene similarity)
- ✅ Creative combination of both services
- ✅ Working demo with viral potential

## 🏆 Prizes

- **1st Place:** $9,182 + LEGO kit + 3 months ElevenLabs Scale
- **2nd Place:** $4,756 + 2 months ElevenLabs Scale
- **3rd Place:** $1,354 + 1 month ElevenLabs Scale

## 📅 Timeline

- Submissions close: April 16, 2026
- Winners announced: April 21, 2026

---

Built with ❤️ for the ElevenLabs Hackathon