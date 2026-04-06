#!/usr/bin/env python3
"""
Generate composite images and video clips for each shot — fully parallelized.

Both phases use fal.ai's queue API:

  Phase 1 — ALL composite images IN PARALLEL (fal-ai/flux-2-pro/edit)
    • Submits all shots simultaneously → each gets a unique requestId
    • Polls all tasks concurrently → total time ≈ slowest single composite
    • Uploads each composite to imgbb for a stable permanent URL
    • Downloads composites to ./composites/{shot_id}.png
    • Cost: $0.03/image (1MP) or $0.045/image (2MP 16:9)

  Phase 2 — ALL video clips IN PARALLEL (fal-ai/sora-2/image-to-video)
    • Submits all shots simultaneously → each gets a unique requestId
    • Polls all tasks concurrently → total time ≈ slowest single video
    • Downloads clips to ./clips/{shot_id}.mp4
    • Cost: $0.10/second of output video

Config — create a .env file in your project directory:
  IMGBB_API_KEY=your_imgbb_api_key_here
  FAL_API_KEY=your_fal_api_key_here

  On first run the script auto-creates a .env template if one is not found.

Usage:
  cd /path/to/your/project
  python ~/.claude/skills/generating-composite-and-video/scripts/generate_videos.py

Requirements:
  pip install requests
  characters.json and backgrounds.json must have image_url fields
  (populated by generate_images.py from Step 3 of the pipeline).
"""

import os
import json
import time
import threading
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import requests


# ── Config loading (.env) ─────────────────────────────────────────────────────

_ENV_TEMPLATE = """\
# Story-to-Animation — API Keys
# Get your fal.ai key from: https://fal.ai/dashboard/keys
# Get your R2 keys from:    Cloudflare Dashboard -> R2 -> Manage R2 API Tokens

FAL_API_KEY=your_fal_api_key_here
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
"""

def load_env() -> None:
    env_path = Path(".env")
    if not env_path.exists():
        env_path.write_text(_ENV_TEMPLATE, encoding="utf-8")
        print("\n  .env file created in your project directory.")
        print("  -> Open .env, fill in your API keys, then re-run this script.\n")
        raise SystemExit(0)

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key, val = key.strip(), val.strip()
        if key and key not in os.environ:
            os.environ[key] = val

    print("  Loaded API keys from .env")

def get_key(name: str) -> str:
    val = os.environ.get(name, "").strip()
    if not val or val.startswith("your_"):
        print(f"\nERROR: '{name}' is not set in .env")
        print(f"  Open .env in your project directory and set:  {name}=your_actual_key")
        raise SystemExit(1)
    return val

load_env()
FAL_API_KEY      = get_key("FAL_API_KEY")
R2_ACCOUNT_ID    = get_key("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = get_key("R2_ACCESS_KEY_ID")
R2_SECRET_KEY    = get_key("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME   = get_key("R2_BUCKET_NAME")
R2_PUBLIC_URL    = get_key("R2_PUBLIC_URL").rstrip("/")


# ── fal.ai API endpoints ──────────────────────────────────────────────────────

FAL_COMPOSITE_MODEL  = "fal-ai/flux-2-pro/edit"
FAL_VIDEO_MODEL      = "fal-ai/vidu/q3/image-to-video/turbo"

FAL_COMPOSITE_SUBMIT = f"https://queue.fal.run/{FAL_COMPOSITE_MODEL}"
FAL_VIDEO_SUBMIT     = f"https://queue.fal.run/{FAL_VIDEO_MODEL}"
# Note: status_url and response_url are read from each submit response directly.
# fal.ai strips variant suffixes (e.g. /edit) from these URLs so they cannot
# be reliably constructed from the model name.

FAL_HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Key {FAL_API_KEY}",
}


# ── Tunable settings ──────────────────────────────────────────────────────────

COMPOSITE_MAX_WORKERS = 5
VIDEO_MAX_WORKERS     = 5

FAL_POLL_INTERVAL     = 10    # seconds between fal.ai polls
FAL_MAX_POLLS         = 120   # max wait: 120 × 10s = 20 min per task

# Phase 1 — composite image settings
COMPOSITE_IMAGE_SIZE  = "landscape_16_9"   # 16:9 aspect for cinematic composites
COMPOSITE_FORMAT      = "jpeg"

# Phase 2 — video clip settings
VIDEO_DURATION        = 3      # seconds (1–16; vidu q3 turbo default is 5)
VIDEO_RESOLUTION      = "720p" # options: 360p, 540p, 720p, 1080p — 720p skips the Topaz upscale step
VIDEO_AUDIO           = True   # vidu q3 generates ambient audio by default


# ── Thread-safe print ─────────────────────────────────────────────────────────

_print_lock = threading.Lock()

def tprint(*args, **kwargs):
    with _print_lock:
        print(*args, **kwargs)

def fmt_elapsed(start: float) -> str:
    s = int(time.time() - start)
    return f"{s // 60}m{s % 60:02d}s" if s >= 60 else f"{s}s"


# ── fal.ai queue helpers ──────────────────────────────────────────────────────

def fal_submit(submit_url: str, payload: dict) -> tuple:
    """Submit a fal.ai queue job.
    Returns (status_url, response_url, None) or (None, None, error_str).
    Uses status_url/response_url from the submit response directly — fal.ai
    strips variant suffixes (e.g. /edit) from these URLs, so constructing
    them manually from the model name would produce a wrong path.
    """
    try:
        resp   = requests.post(submit_url, headers=FAL_HEADERS, json=payload, timeout=30)
        result = resp.json()
        if resp.status_code not in (200, 201):
            return None, None, result.get("detail", f"HTTP {resp.status_code}: {resp.text[:200]}")
        status_url   = result.get("status_url")
        response_url = result.get("response_url")
        request_id   = result.get("request_id", "")
        if not status_url or not response_url:
            return None, None, f"Missing status_url/response_url in submit response: {result}"
        tprint(f"    requestId: {request_id[:20]}...")
        return status_url, response_url, None
    except Exception as e:
        return None, None, str(e)


def fal_poll(status_url: str, result_url: str, label: str) -> tuple:
    """Poll a fal.ai request until done. Returns (raw_result_dict, None) or (None, error_str)."""
    for attempt in range(1, FAL_MAX_POLLS + 1):
        time.sleep(FAL_POLL_INTERVAL)
        try:
            resp = requests.get(status_url, headers=FAL_HEADERS, timeout=30)
            if not resp.content:
                # Empty body — still queued, keep polling silently
                continue
            data   = resp.json()
            status = data.get("status", "").upper()

            if status == "COMPLETED":
                r2 = requests.get(result_url, headers=FAL_HEADERS, timeout=30)
                return r2.json(), None

            elif status in ("FAILED", "ERROR"):
                err = data.get("error") or data.get("detail") or "Job failed"
                return None, str(err)

            else:
                elapsed_s = attempt * FAL_POLL_INTERVAL
                if elapsed_s % 60 == 0:
                    tprint(f"    [{label}] {status or 'IN_QUEUE'} — {elapsed_s}s elapsed...")

        except Exception as e:
            tprint(f"    [{label}] poll error: {e} (response: {resp.text[:80] if resp else 'n/a'})")

    timeout_s = FAL_MAX_POLLS * FAL_POLL_INTERVAL
    return None, f"Timed out after {timeout_s // 60}m{timeout_s % 60:02d}s"


# ── Cloudflare R2 upload helper ──────────────────────────────────────────────

def upload_to_r2(local_path: Path) -> str | None:
    """Upload a local image to Cloudflare R2 and return a permanent public URL, or None."""
    try:
        import boto3
        from botocore.config import Config

        s3 = boto3.client(
            "s3",
            endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_KEY,
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )
        content_type = "image/jpeg" if local_path.suffix.lower() in (".jpg", ".jpeg") else "image/png"
        with open(local_path, "rb") as f:
            s3.upload_fileobj(
                f,
                R2_BUCKET_NAME,
                local_path.name,
                ExtraArgs={"ContentType": content_type},
            )
        return f"{R2_PUBLIC_URL}/{local_path.name}"
    except Exception as e:
        tprint(f"    [R2] upload failed: {e}")
        return None


# ── Shared download helper ────────────────────────────────────────────────────

def download_file(url: str, output_path: Path) -> bool:
    try:
        resp = requests.get(url, timeout=120)
        output_path.write_bytes(resp.content)
        return output_path.stat().st_size > 0
    except Exception as e:
        tprint(f"    Download failed: {e}")
        return False


# ── Phase 1 worker: composite image (fal-ai/flux-2-pro/edit) ─────────────────

def run_composite(shot: dict, bg_map: dict, char_map: dict,
                  composite_path: Path) -> tuple:
    """Generate one composite image via fal.ai FLUX.2 [pro] edit.
    Returns (shot_id, stable_url, None) or (shot_id, None, error)."""
    sid = shot["shot_id"]
    t0  = time.time()

    # Build image_urls: background first, then characters
    bg         = bg_map.get(shot.get("background", ""), {})
    image_urls = []
    if bg.get("image_url"):
        image_urls.append(bg["image_url"])
    for cid in shot.get("characters", []):
        c = char_map.get(cid, {})
        if c.get("image_url"):
            image_urls.append(c["image_url"])

    if not image_urls:
        return sid, None, "No image_urls found for this shot"

    # Reference images by @image1, @image2 etc. in the prompt
    ref_tags    = " ".join(f"@image{i+1}" for i in range(len(image_urls)))
    char_names  = ", ".join(
        char_map[cid]["name"]
        for cid in shot.get("characters", [])
        if cid in char_map
    )
    prompt = (
        f"Pixar-style 3D animation composite scene using {ref_tags}. "
        f"Place {char_names + ' ' if char_names else ''}in the background setting. "
        f"{shot.get('action', '')} "
        f"Cinematic 16:9 composition, high quality render, no text, no UI elements, "
        f"warm natural lighting consistent with the scene."
    )

    status_url, result_url, err = fal_submit(FAL_COMPOSITE_SUBMIT, {
        "prompt":                prompt,
        "image_urls":            image_urls,
        "image_size":            COMPOSITE_IMAGE_SIZE,
        "output_format":         COMPOSITE_FORMAT,
        "safety_tolerance":      "2",
        "enable_safety_checker": True,
    })
    if not status_url:
        return sid, None, f"Submit failed: {err}"

    tprint(f"  [{sid}] composite submitted")

    result, err = fal_poll(status_url, result_url, f"{sid}/composite")
    if not result:
        return sid, None, err

    images = result.get("images", [])
    if not images or not images[0].get("url"):
        return sid, None, f"No images in result: {result}"

    fal_url = images[0]["url"]
    download_file(fal_url, composite_path)
    tprint(f"  [{sid}] composite done ({fmt_elapsed(t0)}) -> composites/{sid}.png")

    # Upload to Cloudflare R2 for a stable permanent URL (fal.ai URLs are temporary).
    # Retry up to 3 times — if R2 fails on all attempts the fal.ai URL may
    # have already expired by the time vidu tries to fetch it, causing
    # "Invalid image in input" errors in Phase 2.
    r2_url = None
    for attempt in range(1, 4):
        r2_url = upload_to_r2(composite_path)
        if r2_url:
            break
        if attempt < 3:
            tprint(f"    [{sid}] R2 upload failed (attempt {attempt}/3), retrying...")
            time.sleep(5)
    if not r2_url:
        return sid, None, "R2 upload failed after 3 attempts — cannot pass stable URL to video phase"
    return sid, r2_url, None


# ── Phase 2 worker: video clip (fal-ai/sora-2/image-to-video) ────────────────

def run_video(shot: dict, composite_url: str, clip_path: Path) -> tuple:
    """Generate one sora-2 video clip via fal.ai.
    Returns (shot_id, True, None) or (shot_id, False, error)."""
    sid = shot["shot_id"]
    t0  = time.time()

    status_url, result_url, err = fal_submit(FAL_VIDEO_SUBMIT, {
        "prompt":     shot.get("veo_prompt", shot.get("action", "")),
        "image_url":  composite_url,
        "duration":   VIDEO_DURATION,
        "resolution": VIDEO_RESOLUTION,
        "audio":      VIDEO_AUDIO,
    })
    if not status_url:
        return sid, False, f"Submit failed: {err}"

    tprint(f"  [{sid}] video submitted")

    result, err = fal_poll(status_url, result_url, f"{sid}/video")
    if not result:
        return sid, False, err

    video = result.get("video", {})
    url   = video.get("url") if isinstance(video, dict) else None
    if not url:
        return sid, False, f"No video.url in result: {result}"

    if download_file(url, clip_path):
        tprint(f"  [{sid}] video done ({fmt_elapsed(t0)}) -> clips/{sid}.mp4")
        return sid, True, None

    return sid, False, "Download failed"


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate composite images and video clips.")
    parser.add_argument(
        "--shot", metavar="SHOT_ID",
        help="Process a single shot only (e.g. --shot shot_001). "
             "Omit to process all pending shots at once.",
    )
    parser.add_argument(
        "--regenerate", metavar="SHOT_ID",
        help="Force-regenerate a shot by deleting its existing composite + clip, "
             "then re-running it (e.g. --regenerate shot_003).",
    )
    args = parser.parse_args()

    # --regenerate: delete existing files then run as --shot
    if args.regenerate:
        sid = args.regenerate
        comp = Path("composites") / f"{sid}.png"
        clip = Path("clips")      / f"{sid}.mp4"
        deleted = []
        for p in [comp, clip]:
            if p.exists():
                p.unlink()
                deleted.append(p.name)
        if deleted:
            print(f"  Deleted for regeneration: {', '.join(deleted)}")
        else:
            print(f"  No existing files found for {sid} — generating fresh.")
        args.shot = sid  # proceed as single-shot mode

    run_start = time.time()
    print("\n=== Story-to-Animation: Step 5 — Composite + Video Generation ===\n")

    for fname in ["shots.json", "characters.json", "backgrounds.json"]:
        if not Path(fname).exists():
            print(f"ERROR: {fname} not found in current directory")
            raise SystemExit(1)

    shots_data = json.loads(Path("shots.json").read_text(encoding="utf-8"))
    chars_data = json.loads(Path("characters.json").read_text(encoding="utf-8"))
    bgs_data   = json.loads(Path("backgrounds.json").read_text(encoding="utf-8"))

    char_map = {c["character_id"]: c for c in chars_data["characters"]}
    bg_map   = {b["bg_id"]:        b for b in bgs_data["backgrounds"]}

    missing = []
    for c in chars_data["characters"]:
        if not c.get("image_url"):
            missing.append(f"  characters/{c['character_id']} — missing image_url")
    for b in bgs_data["backgrounds"]:
        if not b.get("image_url"):
            missing.append(f"  backgrounds/{b['bg_id']} — missing image_url")
    if missing:
        print("ERROR: image_url fields missing. Run generate_images.py (Step 3) first.")
        for m in missing:
            print(m)
        raise SystemExit(1)

    all_shots = shots_data.get("shots", [])

    if args.shot:
        target = next((s for s in all_shots if s["shot_id"] == args.shot), None)
        if not target:
            print(f"ERROR: shot_id '{args.shot}' not found in shots.json")
            raise SystemExit(1)
        clip_path = Path("clips") / f"{args.shot}.mp4"
        if clip_path.exists():
            print(f"[{args.shot}] clip already exists — nothing to do.")
            return
        pending = [target]
        skipped = []
        print(f"  Mode    : single-shot  ({args.shot})")
    else:
        pending = [s for s in all_shots if not (Path("clips") / f"{s['shot_id']}.mp4").exists()]
        skipped = [s["shot_id"] for s in all_shots if s not in pending]
        print(f"  Mode    : bulk  ({len(pending)} pending, {len(skipped)} already done)")

    print(f"  Phase 1 : fal.ai {FAL_COMPOSITE_MODEL}  ({COMPOSITE_IMAGE_SIZE})")
    print(f"  Phase 2 : fal.ai {FAL_VIDEO_MODEL}  ({VIDEO_DURATION}s, {VIDEO_RESOLUTION})\n")

    if skipped:
        print(f"Skipping {len(skipped)} shot(s) with existing clips: {', '.join(skipped)}")
    if not pending:
        print("All clips already exist. Nothing to do.")
        return

    Path("composites").mkdir(exist_ok=True)
    Path("clips").mkdir(exist_ok=True)

    results        = {"success": [], "failed": [], "skipped": skipped}
    composite_urls = {}

    # ── Phase 1: Composites (fal.ai flux-2-pro/edit) ─────────────────────────
    p1_start = time.time()

    if args.shot:
        print(f"Phase 1 — Composite: generating {args.shot} via fal.ai...\n")
        sid, url, err = run_composite(
            pending[0], bg_map, char_map,
            Path("composites") / f"{args.shot}.png",
        )
        if url:
            composite_urls[sid] = url
        else:
            print(f"  [{sid}] composite FAILED: {err}")
            results["failed"].append(sid)
    else:
        print(f"Phase 1 — Composites: submitting {len(pending)} jobs in parallel...\n")
        with ThreadPoolExecutor(max_workers=COMPOSITE_MAX_WORKERS) as ex:
            futures = {
                ex.submit(
                    run_composite,
                    shot, bg_map, char_map,
                    Path("composites") / f"{shot['shot_id']}.png"
                ): shot["shot_id"]
                for shot in pending
            }
            for future in as_completed(futures):
                sid, url, err = future.result()
                if url:
                    composite_urls[sid] = url
                else:
                    tprint(f"  [{sid}] composite FAILED: {err}")
                    results["failed"].append(sid)

    print(f"\nPhase 1 done in {fmt_elapsed(p1_start)}: "
          f"{len(composite_urls)}/{len(pending)} composites ready.\n")

    # ── Phase 2: Videos (fal.ai sora-2-image-to-video) ───────────────────────
    video_shots = [s for s in pending if s["shot_id"] in composite_urls]

    if not video_shots:
        print("No composites succeeded — cannot generate any videos.")
    else:
        p2_start = time.time()

        if args.shot:
            print(f"Phase 2 — Video: generating {args.shot} via fal.ai...\n")
            sid, ok, err = run_video(
                video_shots[0],
                composite_urls[video_shots[0]["shot_id"]],
                Path("clips") / f"{video_shots[0]['shot_id']}.mp4",
            )
            if ok:
                results["success"].append(sid)
            else:
                print(f"  [{sid}] video FAILED: {err}")
                results["failed"].append(sid)
        else:
            print(f"Phase 2 — Videos: submitting {len(video_shots)} jobs in parallel "
                  f"(fal.ai sora-2-image-to-video)...\n")
            with ThreadPoolExecutor(max_workers=VIDEO_MAX_WORKERS) as ex:
                futures = {
                    ex.submit(
                        run_video,
                        shot,
                        composite_urls[shot["shot_id"]],
                        Path("clips") / f"{shot['shot_id']}.mp4"
                    ): shot["shot_id"]
                    for shot in video_shots
                }
                for future in as_completed(futures):
                    sid, ok, err = future.result()
                    if ok:
                        results["success"].append(sid)
                    else:
                        tprint(f"  [{sid}] video FAILED: {err}")
                        results["failed"].append(sid)

        print(f"\nPhase 2 done in {fmt_elapsed(p2_start)}: "
              f"{len(results['success'])}/{len(video_shots)} videos ready.")

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'='*55}")
    print(f"  Total run time : {fmt_elapsed(run_start)}")
    print(f"  Generated      : {len(results['success'])} clips")
    print(f"  Skipped        : {len(results['skipped'])} (clips already existed)")
    print(f"  Failed         : {len(results['failed'])}")
    print(f"{'='*55}")
    print(f"  Composites -> ./composites/")
    print(f"  Clips      -> ./clips/")

    if results["failed"]:
        print("\nFailed shots (delete composite + clip file then re-run):")
        for sid in results["failed"]:
            print(f"  - {sid}")
        raise SystemExit(1)
    else:
        print("\nAll done! The Story-to-Animation pipeline is complete.")


if __name__ == "__main__":
    main()
