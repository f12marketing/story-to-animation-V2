# Story-to-Animation — Claude Code Skills

A full AI-powered pipeline that turns a one-line story idea into a branded
animated video — entirely from within Claude Code.

## Pipeline Overview

```
Logline
  │
  ▼ generating-story-from-logline
story.md  (8–15 scenes)
  │
  ▼ extracting-characters-and-backgrounds
characters.json + backgrounds.json
  │
  ▼ generating-character-and-background-images
Pixar-style PNGs → Cloudflare R2
  │
  ▼ creating-shot-list
shots.json  (3-second shots with veo_prompts)
  │
  ▼ generating-composite-and-video
composites/ + clips/ → final_animation.mp4
  │
  ├─▶ generating-voiceover  (optional)
  │   ElevenLabs TTS via fal.ai → audio/ → final_animation_voiced.mp4
  │
  ▼ applying-motion-graphics
final_animation_branded.mp4
  ├── 3s title card  (institute name + logo)
  ├── subtitles      (synced to shot dialogue)
  ├── lower thirds   (character name on first appearance)
  └── 5s end screen  (logo + institute name)
```

## Skills

| Skill | Purpose |
|-------|---------|
| `generating-story-from-logline` | Expand a logline into a full screenplay (`story.md`) |
| `extracting-characters-and-backgrounds` | Extract characters & locations → JSON with Pixar-style prompts |
| `generating-character-and-background-images` | Generate reference images via fal.ai → Cloudflare R2 |
| `creating-shot-list` | Decompose story into 3-second shots with `veo_prompt` fields |
| `generating-composite-and-video` | Composite + video generation via fal.ai, merge with FFmpeg |
| `generating-voiceover` | Per-shot narration via fal.ai ElevenLabs TTS Turbo v2.5 |
| `applying-motion-graphics` | Branded overlays via Remotion (title card, subtitles, end screen) |

## Setup

### 1. API Keys — `.env` in your project directory

```
FAL_API_KEY=your_fal_api_key_here
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

# Optional voiceover settings
TTS_VOICE=Rachel
TTS_SPEED=1.0
TTS_LANGUAGE_CODE=en
```

- **fal.ai key**: https://fal.ai/dashboard/keys
- **Cloudflare R2**: Cloudflare Dashboard → R2 → Manage R2 API Tokens

### 2. Python dependencies

```bash
pip install requests boto3
```

### 3. FFmpeg (for merging clips)

```bash
# Windows
winget install ffmpeg

# Mac
brew install ffmpeg

# Linux
sudo apt install ffmpeg
```

### 4. Node.js 18+ (for motion graphics)

```bash
# Windows
winget install OpenJS.NodeJS

# Mac
brew install node
```

## Usage

Start a new animation project by giving Claude Code a story logline:

> *"Create a 30-second animation about a wise owl mascot named Owly who helps a student understand fractions"*

Claude will automatically run the full pipeline and apply motion graphics at the end.

### Branding / Personalization

On first run, `apply_motion_graphics.py` creates `brand.json`:

```json
{
  "institute_name": "Your Institute Name",
  "tagline": "Empowering Minds",
  "primary_color": "#003087",
  "accent_color": "#FFD700",
  "text_color": "#FFFFFF",
  "logo_path": "./logo.png",
  "font_family": "Inter"
}
```

Place your logo at `logo.png` (PNG/JPG) in your project directory — it appears
in both the title card and end screen.

### Regenerating a shot

```bash
python ~/.claude/skills/generating-composite-and-video/scripts/generate_videos.py --regenerate shot_003
```

## APIs Used

| Service | Purpose | Docs |
|---------|---------|------|
| fal.ai nano-banana | Character & background image generation | https://fal.ai |
| fal.ai flux-2-pro/edit | Composite scene images | https://fal.ai |
| fal.ai vidu/q3/turbo | 3-second video clip generation | https://fal.ai |
| fal.ai elevenlabs/tts/turbo-v2.5 | Voiceover narration | https://fal.ai/models/fal-ai/elevenlabs/tts/turbo-v2.5 |
| fal.ai topaz/upscale/video | Optional 720p→1080p upscale | https://fal.ai |
| Cloudflare R2 | Permanent image/composite hosting | https://developers.cloudflare.com/r2 |
| Remotion | Motion graphics rendering | https://remotion.dev |

## Cost Estimate (30-second video = 10 shots)

| Step | Cost |
|------|------|
| 10 character + background images | ~$0.10 |
| 10 composite images (16:9) | ~$0.45 |
| 10 × 3s video clips | ~$3.00 |
| Voiceover (10 shots) | ~$0.05 |
| Motion graphics render | Free (local Node.js) |
| **Total** | **~$3.60** |

## License

MIT
