#!/usr/bin/env python3
"""
Upscale the merged animation to 720p using fal.ai Topaz Video Upscale.

Pipeline:
  1. Upload local video to fal.ai storage -> get a temporary public URL
  2. Submit fal-ai/topaz/upscale/video job via fal.ai queue API
  3. Poll until COMPLETED
  4. Download upscaled video -> ./final_animation_720p.mp4

Config — .env in your project directory:
  FAL_API_KEY=your_fal_api_key_here

Usage:
  cd /path/to/your/project
  python ~/.claude/skills/generating-composite-and-video/scripts/upscale_video.py

  # Upscale a specific file:
  python ~/.claude/skills/generating-composite-and-video/scripts/upscale_video.py --input my_video.mp4

Requirements:
  pip install requests
"""

import os
import time
import argparse
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
    print("  Loaded API keys from .env")

def get_key(name: str) -> str:
    val = os.environ.get(name, "").strip()
    if not val or val.startswith("your_"):
        print(f"\nERROR: '{name}' is not set in .env")
        raise SystemExit(1)
    return val


load_env()
FAL_API_KEY = get_key("FAL_API_KEY")

FAL_HEADERS = {
    "Authorization": f"Key {FAL_API_KEY}",
}

FAL_UPSCALE_MODEL  = "fal-ai/topaz/upscale/video"
FAL_UPSCALE_SUBMIT = f"https://queue.fal.run/{FAL_UPSCALE_MODEL}"

# Upscale settings
UPSCALE_FACTOR  = 2        # 360p x2 = 720p
UPSCALE_MODEL   = "Proteus"  # best general-purpose model
H264_OUTPUT     = True     # H264 for broad compatibility (vs default H265)

FAL_POLL_INTERVAL = 15     # Topaz jobs take longer — poll every 15s
FAL_MAX_POLLS     = 120    # up to 30 minutes


# ── Helpers ───────────────────────────────────────────────────────────────────

def fmt_elapsed(start: float) -> str:
    s = int(time.time() - start)
    return f"{s // 60}m{s % 60:02d}s" if s >= 60 else f"{s}s"


def upload_to_fal_storage(local_path: Path) -> str:
    """Upload a local file to fal.ai storage. Returns a temporary public URL."""
    print(f"  Uploading {local_path.name} to fal.ai storage...")
    size = local_path.stat().st_size
    print(f"  File size: {size / 1024 / 1024:.1f} MB")

    # Step 1: Request an upload URL from fal.ai storage
    init_resp = requests.post(
        "https://rest.fal.run/storage/upload/initiate",
        headers={**FAL_HEADERS, "Content-Type": "application/json"},
        json={"file_name": local_path.name, "content_type": "video/mp4"},
        timeout=30,
    )
    init_resp.raise_for_status()
    init_data  = init_resp.json()
    upload_url = init_data.get("upload_url")
    file_url   = init_data.get("file_url")

    if not upload_url or not file_url:
        raise RuntimeError(f"Unexpected storage initiate response: {init_data}")

    # Step 2: PUT the file bytes to the upload URL
    with open(local_path, "rb") as f:
        put_resp = requests.put(
            upload_url,
            data=f,
            headers={"Content-Type": "video/mp4"},
            timeout=600,
        )
    put_resp.raise_for_status()
    print(f"  Uploaded -> {file_url}")
    return file_url


def fal_submit(video_url: str) -> tuple:
    """Submit Topaz upscale job. Returns (status_url, response_url, None) or (None, None, err)."""
    payload = {
        "video_url":      video_url,
        "model":          UPSCALE_MODEL,
        "upscale_factor": UPSCALE_FACTOR,
        "H264_output":    H264_OUTPUT,
    }
    try:
        resp   = requests.post(
            FAL_UPSCALE_SUBMIT,
            headers={**FAL_HEADERS, "Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
        result = resp.json()
        if resp.status_code not in (200, 201):
            return None, None, result.get("detail", f"HTTP {resp.status_code}: {resp.text[:200]}")
        status_url   = result.get("status_url")
        response_url = result.get("response_url")
        request_id   = result.get("request_id", "")
        if not status_url or not response_url:
            return None, None, f"Missing status_url/response_url: {result}"
        print(f"    requestId: {request_id[:20]}...")
        return status_url, response_url, None
    except Exception as e:
        return None, None, str(e)


def fal_poll(status_url: str, result_url: str) -> tuple:
    """Poll until COMPLETED. Returns (video_url, None) or (None, error)."""
    for attempt in range(1, FAL_MAX_POLLS + 1):
        time.sleep(FAL_POLL_INTERVAL)
        try:
            resp = requests.get(status_url, headers=FAL_HEADERS, timeout=30)
            if not resp.content:
                continue
            data   = resp.json()
            status = data.get("status", "").upper()

            if status == "COMPLETED":
                r2     = requests.get(result_url, headers=FAL_HEADERS, timeout=30)
                result = r2.json()
                video  = result.get("video", {})
                url    = video.get("url") if isinstance(video, dict) else None
                if url:
                    return url, None
                return None, f"No video.url in result: {result}"

            elif status in ("FAILED", "ERROR"):
                err = data.get("error") or data.get("detail") or "Job failed"
                return None, str(err)

            else:
                elapsed_s = attempt * FAL_POLL_INTERVAL
                if elapsed_s % 60 == 0:
                    print(f"    {status or 'IN_QUEUE'} — {elapsed_s}s elapsed...")

        except Exception as e:
            print(f"    poll error: {e}")

    timeout_s = FAL_MAX_POLLS * FAL_POLL_INTERVAL
    return None, f"Timed out after {timeout_s // 60}m{timeout_s % 60:02d}s"


def download_file(url: str, output_path: Path) -> bool:
    try:
        resp = requests.get(url, timeout=300)
        output_path.write_bytes(resp.content)
        return output_path.stat().st_size > 0
    except Exception as e:
        print(f"  Download failed: {e}")
        return False


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Upscale final animation to 720p via Topaz.")
    parser.add_argument(
        "--input", metavar="FILE", default="final_animation.mp4",
        help="Input video file (default: final_animation.mp4)",
    )
    parser.add_argument(
        "--output", metavar="FILE", default="final_animation_720p.mp4",
        help="Output file (default: final_animation_720p.mp4)",
    )
    args = parser.parse_args()

    input_path  = Path(args.input)
    output_path = Path(args.output)

    print("\n=== Story-to-Animation: Phase 4 — Video Upscale ===\n")
    print(f"  Input   : {input_path}")
    print(f"  Output  : {output_path}")
    print(f"  Model   : fal.ai {FAL_UPSCALE_MODEL}")
    print(f"  Scale   : {UPSCALE_FACTOR}x ({UPSCALE_MODEL}) -> 720p\n")

    if not input_path.exists():
        print(f"ERROR: Input file not found: {input_path}")
        raise SystemExit(1)

    if output_path.exists():
        print(f"  {output_path} already exists — delete it to re-upscale.")
        raise SystemExit(0)

    run_start = time.time()

    # Step 1: Upload to fal.ai storage
    try:
        video_url = upload_to_fal_storage(input_path)
    except Exception as e:
        print(f"\nERROR: Upload failed: {e}")
        raise SystemExit(1)

    # Step 2: Submit upscale job
    print("\n  Submitting upscale job...")
    status_url, result_url, err = fal_submit(video_url)
    if not status_url:
        print(f"\nERROR: Submit failed: {err}")
        raise SystemExit(1)
    print("  Upscale job submitted — polling for completion...\n")

    # Step 3: Poll
    upscaled_url, err = fal_poll(status_url, result_url)
    if not upscaled_url:
        print(f"\nERROR: Upscale failed: {err}")
        raise SystemExit(1)

    # Step 4: Download
    print(f"\n  Downloading upscaled video...")
    if not download_file(upscaled_url, output_path):
        print("ERROR: Download failed")
        raise SystemExit(1)

    size_mb = output_path.stat().st_size / 1024 / 1024
    print(f"\n{'='*55}")
    print(f"  Total run time : {fmt_elapsed(run_start)}")
    print(f"  Output         : {output_path} ({size_mb:.1f} MB)")
    print(f"{'='*55}")
    print("\nUpscale complete! final_animation_720p.mp4 is ready.")


if __name__ == "__main__":
    main()
