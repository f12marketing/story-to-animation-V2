#!/usr/bin/env python3
"""
Generate per-shot voiceover audio using fal.ai ElevenLabs TTS Turbo v2.5.

Uses the same FAL_API_KEY already in .env — no separate ElevenLabs account needed.

Reads dialogue from shots.json, generates MP3 per shot via fal.ai,
downloads audio to ./audio/{shot_id}.mp3, and updates shots.json with
audio_path fields so merge_clips.py can mix them into the final video.

Config — .env in your project directory (same file used by other pipeline steps):
  FAL_API_KEY=your_fal_api_key_here

Optional .env settings:
  TTS_VOICE=Rachel          # ElevenLabs voice name (default: Rachel)
  TTS_SPEED=1.0             # Speech speed 0.7–1.2 (default: 1.0)
  TTS_LANGUAGE_CODE=en      # ISO 639-1 language code (default: en)

Usage:
  cd /path/to/your/project
  python ~/.claude/skills/generating-voiceover/scripts/generate_voiceover.py

Requirements:
  pip install requests
"""

import json
import os
import time
from pathlib import Path
import requests


# ── Config loading (.env) ─────────────────────────────────────────────────────

def load_env() -> None:
    env_path = Path(".env")
    if not env_path.exists():
        print("\nERROR: .env not found. Create one with:\n  FAL_API_KEY=your_key_here\n")
        raise SystemExit(1)
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key, val = key.strip(), val.strip()
        if key and key not in os.environ:
            os.environ[key] = val

def get_key(name: str, required: bool = True, default: str = "") -> str:
    val = os.environ.get(name, "").strip()
    if required and (not val or val.startswith("your_")):
        print(f"\nERROR: '{name}' not set in .env")
        print(f"  Add:  {name}=your_actual_key")
        raise SystemExit(1)
    return val or default


load_env()
FAL_API_KEY   = get_key("FAL_API_KEY")
TTS_VOICE     = get_key("TTS_VOICE",         required=False, default="Rachel")
TTS_SPEED     = float(get_key("TTS_SPEED",   required=False, default="1.0"))
TTS_LANGUAGE  = get_key("TTS_LANGUAGE_CODE", required=False, default="en")

# fal.ai ElevenLabs TTS endpoint (synchronous — no polling needed)
FAL_TTS_URL = "https://fal.run/fal-ai/elevenlabs/tts/turbo-v2.5"

FAL_HEADERS = {
    "Authorization": f"Key {FAL_API_KEY}",
    "Content-Type":  "application/json",
}

# Voice quality settings
TTS_SETTINGS = {
    "stability":        0.5,
    "similarity_boost": 0.75,
    "style":            0.0,
}


# ── TTS call (fal.ai direct endpoint) ────────────────────────────────────────

def generate_audio(text: str, shot_id: str, out_path: Path) -> bool:
    """
    Call fal.ai ElevenLabs TTS endpoint (synchronous), download MP3.
    Returns True on success.
    """
    payload = {
        "text":                    text,
        "voice":                   TTS_VOICE,
        "stability":               TTS_SETTINGS["stability"],
        "similarity_boost":        TTS_SETTINGS["similarity_boost"],
        "style":                   TTS_SETTINGS["style"],
        "speed":                   TTS_SPEED,
        "language_code":           TTS_LANGUAGE,
        "apply_text_normalization": "auto",
    }

    try:
        # Step 1: Generate audio via fal.ai
        resp = requests.post(FAL_TTS_URL, headers=FAL_HEADERS, json=payload, timeout=60)
        if resp.status_code != 200:
            try:
                detail = resp.json().get("detail", resp.text[:200])
            except Exception:
                detail = resp.text[:200]
            print(f"  [{shot_id}] ERROR: HTTP {resp.status_code} — {detail}")
            return False

        result    = resp.json()
        audio_obj = result.get("audio", {})
        audio_url = audio_obj.get("url") if isinstance(audio_obj, dict) else None

        if not audio_url:
            print(f"  [{shot_id}] ERROR: No audio.url in response: {result}")
            return False

        # Step 2: Download audio file
        dl_resp = requests.get(audio_url, timeout=60)
        if dl_resp.status_code != 200:
            print(f"  [{shot_id}] ERROR: Download failed (HTTP {dl_resp.status_code})")
            return False

        out_path.write_bytes(dl_resp.content)
        size_kb = out_path.stat().st_size / 1024
        print(f"  [{shot_id}] -> {out_path.name} ({size_kb:.0f} KB)")
        return True

    except Exception as e:
        print(f"  [{shot_id}] ERROR: {e}")
        return False


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("\n=== Story-to-Animation: Voiceover Generation (fal.ai ElevenLabs TTS) ===\n")
    print(f"  Model    : fal-ai/elevenlabs/tts/turbo-v2.5")
    print(f"  Voice    : {TTS_VOICE}")
    print(f"  Speed    : {TTS_SPEED}")
    print(f"  Language : {TTS_LANGUAGE}\n")

    if not Path("shots.json").exists():
        print("ERROR: shots.json not found.")
        raise SystemExit(1)

    shots_data     = json.loads(Path("shots.json").read_text(encoding="utf-8"))
    shots          = shots_data.get("shots", [])
    dialogue_shots = [s for s in shots if s.get("dialogue", "").strip()]

    print(f"  Total shots        : {len(shots)}")
    print(f"  Shots with dialogue: {len(dialogue_shots)}\n")

    if not dialogue_shots:
        print("No dialogue found in shots.json. Nothing to generate.")
        raise SystemExit(0)

    Path("audio").mkdir(exist_ok=True)

    results    = {"success": [], "skipped": [], "failed": []}
    json_dirty = False

    for shot in dialogue_shots:
        sid  = shot["shot_id"]
        text = shot["dialogue"].strip()
        out  = Path("audio") / f"{sid}.mp3"

        if out.exists():
            shot["audio_path"] = str(out)
            json_dirty = True
            results["skipped"].append(sid)
            print(f"  [{sid}] already exists — skipping")
            continue

        ok = generate_audio(text, sid, out)
        if ok:
            shot["audio_path"] = str(out)
            json_dirty = True
            results["success"].append(sid)
        else:
            results["failed"].append(sid)

        # Brief pause between requests to avoid rate limits
        time.sleep(0.3)

    # Write audio_path fields back to shots.json
    if json_dirty:
        Path("shots.json").write_text(
            json.dumps(shots_data, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print("\n  shots.json updated with audio_path fields")

    print(f"\n{'='*55}")
    print(f"  Generated : {len(results['success'])}")
    print(f"  Skipped   : {len(results['skipped'])} (already existed)")
    print(f"  Failed    : {len(results['failed'])}")
    print(f"{'='*55}")
    print(f"\nAudio files -> ./audio/")
    if results["success"] or results["skipped"]:
        print("Run merge_clips.py to mix voiceover into the final animation.")

    if results["failed"]:
        print("\nFailed shots:")
        for sid in results["failed"]:
            print(f"  - {sid}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
