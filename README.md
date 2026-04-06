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

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

🔵 Modified Files (Changes to Existing Scripts)
1. generating-composite-and-video/scripts/generate_videos.py
#	What Changed	Before	After
1	Default video resolution	VIDEO_RESOLUTION = "360p"	VIDEO_RESOLUTION = "720p"
2	New CLI flag	(none)	--regenerate SHOT_ID argument added to argparse
3	Regenerate logic	Manual delete required	--regenerate deletes composites/{id}.png + clips/{id}.mp4 then re-runs as --shot
2. generating-composite-and-video/scripts/merge_clips.py
#	What Changed	Before	After
1	New function	(none)	mix_voiceover() added — builds FFmpeg adelay + amix filter graph to place each shot's audio at the correct timestamp
2	Auto-detection	(none)	End of main() checks if any shot in shots.json has an audio_path field pointing to an existing file
3	Voiced output	(none)	If audio detected, produces final_animation_voiced.mp4 alongside final_animation.mp4
3. generating-composite-and-video/SKILL.md
#	What Changed
1	Frontmatter description updated to mention motion graphics auto-trigger
2	VIDEO_RESOLUTION default updated to 720p in the settings table
3	Added --regenerate SHOT_ID usage example and explanation
4	Added Phase 4 — Voiceover mixing (auto-detected from audio_path fields)
5	Added Phase 5 — Motion graphics via Remotion (marked MANDATORY, runs automatically after merge approval)
6	Added Phase 6 — Upscale (now optional since 720p is generated by default)
7	Review gate for Phase 3 updated: now says "Proceeding to motion graphics (Phase 5)..." immediately after merge
4. ~/.claude/settings.json
#	What Changed	Before	After
1	Added hooks section	{"autoUpdatesChannel": "latest"}	Added UserPromptSubmit hook that fires a reminder whenever a message mentions video/animation creation
🟢 New Skills Created (Entirely New Files)
5. applying-motion-graphics/ — 12 new files
File	Purpose
SKILL.md	Skill definition; auto-triggers after generating-composite-and-video
scripts/apply_motion_graphics.py	Reads shots.json + brand.json, scaffolds Remotion project, runs npm install + npx remotion render
templates/package.json	Remotion 4.x + React 18 dependencies
templates/tsconfig.json	TypeScript config with resolveJsonModule: true
templates/remotion.config.ts	Sets codec H264, pixel format yuv420p, overwrites output
templates/src/index.ts	Calls registerRoot(RemotionRoot)
templates/src/Root.tsx	Calculates total frames (title + video + end screen), registers <Composition>
templates/src/MainComposition.tsx	Orchestrates all layers: video, subtitles, lower thirds, end screen
templates/src/TitleCard.tsx	3s animated intro — institute name, tagline, logo (spring fade-in)
templates/src/EndScreen.tsx	5s branded outro — logo scale-in, accent bars top/bottom
templates/src/LowerThird.tsx	Character name slides in from left on first appearance, fades out
templates/src/Subtitles.tsx	Shot dialogue at bottom, synced to 3s shots, fade in/out
Also creates brand.json template on first run with: institute_name, tagline, primary_color, accent_color, text_color, logo_path, font_family.

6. generating-voiceover/ — 2 new files
File	Purpose
SKILL.md	Skill definition for ElevenLabs TTS via fal.ai
scripts/generate_voiceover.py	Initially written for ElevenLabs direct API, then updated to use fal.run/fal-ai/elevenlabs/tts/turbo-v2.5 — uses same FAL_API_KEY as the rest of the pipeline, no separate ElevenLabs account needed. Reads dialogue from shots.json, saves ./audio/{shot_id}.mp3, writes audio_path back to shots.json
🟡 New Repo Files
File	Purpose
README.md	Full pipeline docs — pipeline diagram, skill table, setup, cost estimate (~$3.60/30s video)
.gitignore	Excludes .env, node_modules, composites/, clips/, audio/, generated MP4s
Summary by Impact
Impact	Files
New capability	applying-motion-graphics/ (Remotion branding), generating-voiceover/ (TTS)
Quality improvement	generate_videos.py (720p default — skips Topaz upscale)
UX improvement	generate_videos.py (--regenerate flag)
Feature addition	merge_clips.py (auto voiceover mixing)
Pipeline wiring	SKILL.md (motion graphics as mandatory Phase 5)
Auto-trigger	settings.json (UserPromptSubmit hook)
