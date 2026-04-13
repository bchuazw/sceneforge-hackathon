# SceneForge AI — Hack #4 (turbopuffer × ElevenLabs) Submission

## One-line pitch
Type one sentence. Get a playable 3D scene with a GPT-4o-directed procedural world, an ElevenLabs-composed soundtrack, positional SFX, and a narrated intro — all retrieved-augmented against a turbopuffer vector library of past scenes.

## Why this fits the hackathon
- **turbopuffer**: every generated scene is embedded (OpenAI `text-embedding-3-small`) and upserted. The build pipeline runs a similarity search on each new prompt to pull audio/visual priors from the nearest 3 scenes.
- **ElevenLabs Music API** (`/v1/music`): composes a 30-second soundtrack per scene from a compositional brief (instrumentation, tempo, key, dynamics) that GPT-4o writes alongside the scene.
- **ElevenLabs Sound Effects API** (`/v1/sound-generation`): one call per positional audio zone (wind, thunder, crowd, machinery, etc.).
- **ElevenLabs TTS**: cinematic 2-3 sentence narration voiced automatically on scene build.

## Live demo
https://sceneforge-hackathon.onrender.com

## Submission deliverables checklist

- [ ] **Viral-style video** (30-90s, vertical). Suggested beats:
  - [ ] 0:00-0:03 hook: "I typed one sentence and got a playable game"
  - [ ] 0:03-0:12 type a prompt on camera, watch loading
  - [ ] 0:12-0:45 jump into the scene, narration plays, show music + SFX
  - [ ] 0:45-0:60 montage of 3-4 different themed scenes (horror → cyberpunk → fantasy)
  - [ ] 0:60-end CTA: "Try it — link in bio"
- [ ] **Post on X** — tag @elevenlabsio @turbopuffer, include demo link + video
- [ ] **Post on LinkedIn** — tech breakdown: "GPT-4o directs → turbopuffer recalls → ElevenLabs composes"
- [ ] **Post on Instagram** — reel of the video
- [ ] **Post on TikTok** — same vertical video
- [ ] **Official submission form** — repo link + live demo + video link + description

Each social post is +50 points. All four = +200.

## Recording tips
- Record at 1080x1920 (portrait) for IG/TikTok; also export a 16:9 cut for X/LinkedIn.
- Use the built-in browser capture (Windows `Win+G` → Xbox Game Bar) or OBS.
- Let the narration carry the first 10s — don't talk over it.
- Pick visually distinct prompts: "abandoned mall overtaken by vines at dusk", "neon night market on a rainy Shibuya street", "dragon skeleton in a desert canyon at golden hour", "subnautical research station with bioluminescent kelp".

## Architecture (for the description field)

```
prompt ─▶ GPT-4o scene director ─▶ { objects, procedural layers, music brief, narration }
            │
            ├─▶ text-embedding-3-small ─▶ turbopuffer upsert + similarity search (top-3 priors)
            │
            ├─▶ ElevenLabs /v1/music  (30s composed soundtrack)
            ├─▶ ElevenLabs /v1/sound-generation  (N positional SFX)
            ├─▶ ElevenLabs /v1/text-to-speech   (cinematic narration)
            └─▶ Replicate SDXL (skybox)
                      │
                      ▼
             Three.js / R3F playable scene
```

## Known limitations (be honest in submission)
- Render cold starts can take ~15s on the free tier — keep the tab open during recording.
- Music API composes ~30s loops; we loop on the client.
- Skybox uses Replicate, which occasionally 429s; scene still plays without it.
