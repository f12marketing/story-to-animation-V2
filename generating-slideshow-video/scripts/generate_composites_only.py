#!/usr/bin/env python3
"""
Phase 1 only: Generate composite images for all shots in shots.json.

Uses fal-ai/flux-2-pro/edit to blend character + background images per shot.
Saves to ./composites/{shot_id}.png and uploads to Cloudflare R2 (optional,
only needed if you're also running generate_videos.py later).

Run this before generate_slideshow.py if composites don't exist yet.

Usage:
  cd /path/to/your/project
  python ~/.claude/skills/generating-slideshow-video/scripts/generate_composites_only.py

  # Single shot:
  python ... --shot shot_001

Requirements:
  pip install requests boto3
  .env with FAL_API_KEY (R2 keys optional — composites saved locally regardless)
"""

import argparse
import json
import os
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
COMPOSITE_MAX_WORKERS = 5
FAL_POLL_INTERVAL     = 10
FAL_MAX_POLLS         = 120
FAL_SUBMIT_URL        = "https://queue.fal.run/fal-ai/flux-2-pro/edit"


# ── Env / .env loader ─────────────────────────────────────────────────────────
def load_env():
    env_path = Path(".env")
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def get_env(key: str, required: bool = True) -> str:
    v = os.environ.get(key, "")
    if required and not v:
        print(f"ERROR: {key} not set in .env or environment.")
        raise SystemExit(1)
    return v


# ── fal.ai helpers ────────────────────────────────────────────────────────────
import urllib.request as req_lib

def fal_post(url: str, payload: dict, api_key: str) -> dict:
    import json as _json
    data  = _json.dumps(payload).encode()
    r     = req_lib.Request(url, data=data, headers={
        "Content-Type":  "application/json",
        "Authorization": f"Key {api_key}",
    })
    with req_lib.urlopen(r, timeout=60) as resp:
        return _json.loads(resp.read())


def fal_get(url: str, api_key: str) -> dict:
    import json as _json
    r = req_lib.Request(url, headers={"Authorization": f"Key {api_key}"})
    with req_lib.urlopen(r, timeout=30) as resp:
        return _json.loads(resp.read())


def fal_poll(status_url: str, response_url: str, api_key: str) -> dict:
    for _ in range(FAL_MAX_POLLS):
        status = fal_get(status_url, api_key)
        s = status.get("status", "")
        if s == "COMPLETED":
            return fal_get(response_url, api_key)
        if s in ("FAILED", "ERROR"):
            raise RuntimeError(f"fal.ai job failed: {status}")
        time.sleep(FAL_POLL_INTERVAL)
    raise TimeoutError("fal.ai job timed out")


def download_file(url: str, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    with req_lib.urlopen(url, timeout=60) as resp:
        dest.write_bytes(resp.read())


# ── Per-shot composite generation ─────────────────────────────────────────────
def generate_composite(shot: dict, chars: dict, bgs: dict,
                        composites_dir: Path, api_key: str) -> tuple[str, bool, str]:
    shot_id = shot["shot_id"]
    out_path = composites_dir / f"{shot_id}.png"

    if out_path.exists():
        return shot_id, True, "skipped (exists)"

    # Gather image URLs
    char_ids = shot.get("characters", [])
    bg_id    = shot.get("background", "")

    image_urls = []
    if bg_id and bg_id in bgs:
        url = bgs[bg_id].get("image_url", "")
        if url:
            image_urls.append(url)

    for cid in char_ids:
        if cid in chars:
            url = chars[cid].get("image_url", "")
            if url:
                image_urls.append(url)

    if not image_urls:
        return shot_id, False, "no image_urls found in characters/backgrounds JSON"

    prompt = (
        shot.get("action", "") +
        " Pixar-style 3D animation, cinematic 16:9 composition, "
        "high quality, consistent character design."
    )

    payload = {
        "prompt":     prompt,
        "image_urls": image_urls,
        "image_size": "landscape_16_9",
    }

    try:
        submit  = fal_post(FAL_SUBMIT_URL, payload, api_key)
        result  = fal_poll(submit["status_url"], submit["response_url"], api_key)
        img_url = result["images"][0]["url"]
        download_file(img_url, out_path)
        return shot_id, True, f"saved → {out_path}"
    except Exception as e:
        return shot_id, False, str(e)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Generate composite images for shots.")
    parser.add_argument("--shot", default=None, help="Generate a single shot by ID")
    args = parser.parse_args()

    load_env()
    api_key = get_env("FAL_API_KEY")

    print("\n=== Slideshow Pipeline: Phase 1 — Composite Image Generation ===\n")

    for fname in ["shots.json", "characters.json", "backgrounds.json"]:
        if not Path(fname).exists():
            print(f"ERROR: {fname} not found.")
            raise SystemExit(1)

    shots_data = json.loads(Path("shots.json").read_text(encoding="utf-8"))
    shots      = shots_data.get("shots", [])

    char_data  = json.loads(Path("characters.json").read_text(encoding="utf-8"))
    chars      = {c["character_id"]: c for c in char_data.get("characters", [])}

    bg_data    = json.loads(Path("backgrounds.json").read_text(encoding="utf-8"))
    bgs        = {b.get("bg_id", b.get("background_id", "")): b for b in bg_data.get("backgrounds", [])}

    composites_dir = Path("composites")
    composites_dir.mkdir(exist_ok=True)

    if args.shot:
        shots = [s for s in shots if s["shot_id"] == args.shot]
        if not shots:
            print(f"ERROR: Shot '{args.shot}' not found in shots.json")
            raise SystemExit(1)

    print(f"  Shots to process : {len(shots)}")
    print(f"  Output directory : ./composites/\n")

    results = {}
    with ThreadPoolExecutor(max_workers=COMPOSITE_MAX_WORKERS) as pool:
        futures = {
            pool.submit(generate_composite, shot, chars, bgs, composites_dir, api_key): shot["shot_id"]
            for shot in shots
        }
        for future in as_completed(futures):
            shot_id, ok, msg = future.result()
            results[shot_id] = (ok, msg)
            status = "OK" if ok else "FAIL"
            print(f"  [{status}] {shot_id}: {msg}")

    ok_count   = sum(1 for ok, _ in results.values() if ok)
    fail_count = len(results) - ok_count
    print(f"\n{'='*50}")
    print(f"  Done: {ok_count} composites generated, {fail_count} failed")
    print(f"  Output: ./composites/")
    print(f"{'='*50}\n")

    if fail_count:
        print("Re-run to retry failed shots (successful ones are skipped).")


if __name__ == "__main__":
    main()
