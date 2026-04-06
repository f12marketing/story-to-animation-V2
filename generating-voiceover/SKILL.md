---
name: generating-voiceover
description: >
  Generates per-shot voiceover audio from dialogue fields in shots.json using
  the ElevenLabs TTS API. Saves MP3 audio to ./audio/{shot_id}.mp3 and writes
  audio_path fields back into shots.json so merge_clips.py can mix the audio
  into the final animation. Use after shots.json exists and before or after
  video generation. Requires ELEVENLABS_API_KEY in .env. Supports custom voice
  selection via ELEVENLABS_VOICE_ID in .env. After generating, present a summary
  and wait for user approval before merging.
---

# Voiceover Generation with ElevenLabs

Reads `dialogue` fields from `shots.json`, calls ElevenLabs TTS API for each shot
that has dialogue, and saves audio files to `./audio/`. Updates `shots.json` with
`audio_path` fields so the merge script can mix them into the final video.

## Setup

No extra API key needed — uses the same `FAL_API_KEY` already in your `.env`
from the image and video generation steps.

Optional `.env` overrides:

```
TTS_VOICE=Rachel          # ElevenLabs voice name  (default: Rachel)
TTS_SPEED=1.0             # Speech speed 0.7–1.2   (default: 1.0)
TTS_LANGUAGE_CODE=en      # ISO 639-1 language code (default: en)
```

Browse available voices at: https://elevenlabs.io/voice-library

**Model:** `fal-ai/elevenlabs/tts/turbo-v2.5` — billed via fal.ai credits,
same account as the rest of the pipeline.

## Running

```bash
cd /path/to/your/project
python ~/.claude/skills/generating-voiceover/scripts/generate_voiceover.py
```

## What the Script Does

1. Reads `shots.json` for all shots with non-empty `dialogue` fields
2. Calls ElevenLabs `eleven_multilingual_v2` model per shot
3. Saves `./audio/{shot_id}.mp3`
4. Updates `shots.json` with `"audio_path": "./audio/{shot_id}.mp3"` for each shot
5. Skips shots where `./audio/{shot_id}.mp3` already exists

## Audio Mixing

After voiceover is generated, `merge_clips.py` will automatically detect
`audio_path` fields in `shots.json` and mix them into `final_animation_voiced.mp4`
using FFmpeg's `adelay` + `amix` filter graph.

The mixed output file is: `./final_animation_voiced.mp4`

## Voice Settings (top of script)

| Setting | Default | Description |
|---------|---------|-------------|
| `stability` | `0.5` | Voice stability (0–1) |
| `similarity_boost` | `0.75` | Clarity and similarity boost |
| `style` | `0.0` | Style exaggeration (0–1) |
| `use_speaker_boost` | `True` | Boost speaker clarity |

## Regenerating

Delete `./audio/{shot_id}.mp3` and re-run to regenerate that shot's audio.

## Review Gate (MANDATORY)

After generation completes, present:

```
🎙️ Voiceover generation complete!

📋 Summary:
- Generated : [X] audio clips
- Skipped   : [X] (already existed)
- Failed    : [X]
- Audio dir : ./audio/

👉 Review the audio files, then say:
  - "mix audio" → run merge with voiceover mixed in
  - "skip audio" → proceed without mixing
  - "redo [shot_id]" → delete audio/shot_id.mp3 and regenerate

⏸️ Waiting for your approval.
```
