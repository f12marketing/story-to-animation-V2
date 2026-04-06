#!/usr/bin/env python3
"""
Generate character and background images using the fal.ai nano-banana API,
then upload each image to Cloudflare R2 for permanent public hosting.

Pipeline per image:
  1. POST https://queue.fal.run/fal-ai/nano-banana -> fal.ai generates image
  2. Poll status_url until COMPLETED -> get fal.ai image URL
  3. Download PNG to ./characters/ or ./backgrounds/
  4. Upload PNG to Cloudflare R2 -> get permanent public URL
  5. Store R2 URL as image_url in characters.json / backgrounds.json

Config — create a .env file in your project directory:
  FAL_API_KEY=your_fal_api_key_here
  R2_ACCOUNT_ID=your_cloudflare_account_id
  R2_ACCESS_KEY_ID=your_r2_access_key_id
  R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
  R2_BUCKET_NAME=your_bucket_name
  R2_PUBLIC_URL=https://pub-xxxx.r2.dev

  On first run the script auto-creates a .env template if one is not found.
  Real environment variables always take precedence over .env values.

Usage:
  cd /path/to/your/project
  python ~/.claude/skills/generating-character-and-background-images/scripts/generate_images.py

Requirements:
  pip install requests boto3
"""

import os
import json
import time
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
        print(f"  Open .env in your project directory and set:  {name}=your_actual_value")
        raise SystemExit(1)
    return val


load_env()
FAL_API_KEY        = get_key("FAL_API_KEY")
R2_ACCOUNT_ID      = get_key("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID   = get_key("R2_ACCESS_KEY_ID")
R2_SECRET_KEY      = get_key("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME     = get_key("R2_BUCKET_NAME")
R2_PUBLIC_URL      = get_key("R2_PUBLIC_URL").rstrip("/")


# ── fal.ai API constants ──────────────────────────────────────────────────────

FAL_IMAGE_MODEL  = "fal-ai/nano-banana"
FAL_IMAGE_SUBMIT = f"https://queue.fal.run/{FAL_IMAGE_MODEL}"

FAL_HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Key {FAL_API_KEY}",
}

FAL_POLL_INTERVAL = 5     # seconds between fal.ai polls
FAL_MAX_POLLS     = 60    # max ~5 minutes per image


# ── Cloudflare R2 upload ──────────────────────────────────────────────────────

def upload_to_r2(local_path: Path, object_key: str) -> str | None:
    """Upload a local file to Cloudflare R2. Returns permanent public URL or None."""
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
                object_key,
                ExtraArgs={"ContentType": content_type},
            )
        return f"{R2_PUBLIC_URL}/{object_key}"
    except Exception as e:
        print(f"    [R2] upload failed: {e}")
        return None


# ── fal.ai queue helpers ──────────────────────────────────────────────────────

def fal_submit(payload: dict) -> tuple:
    """Submit a fal.ai nano-banana job.
    Returns (status_url, response_url, None) or (None, None, error_str).
    """
    try:
        resp   = requests.post(FAL_IMAGE_SUBMIT, headers=FAL_HEADERS, json=payload, timeout=30)
        result = resp.json()
        if resp.status_code not in (200, 201):
            return None, None, result.get("detail", f"HTTP {resp.status_code}: {resp.text[:200]}")
        status_url   = result.get("status_url")
        response_url = result.get("response_url")
        if not status_url or not response_url:
            return None, None, f"Missing status_url/response_url: {result}"
        return status_url, response_url, None
    except Exception as e:
        return None, None, str(e)


def fal_poll(status_url: str, result_url: str, label: str) -> tuple:
    """Poll a fal.ai request until done. Returns (image_url, None) or (None, error_str)."""
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
                images = result.get("images", [])
                if images and images[0].get("url"):
                    return images[0]["url"], None
                return None, f"No images in result: {result}"

            elif status in ("FAILED", "ERROR"):
                err = data.get("error") or data.get("detail") or "Job failed"
                return None, str(err)

            else:
                elapsed_s = attempt * FAL_POLL_INTERVAL
                if elapsed_s % 30 == 0:
                    print(f"    [{label}] {status or 'IN_QUEUE'} — {elapsed_s}s elapsed...")

        except Exception as e:
            print(f"    [{label}] poll error: {e}")

    timeout_s = FAL_MAX_POLLS * FAL_POLL_INTERVAL
    return None, f"Timed out after {timeout_s}s"


# ── Download locally ──────────────────────────────────────────────────────────

def download_file(url: str, output_path: Path) -> bool:
    try:
        resp = requests.get(url, timeout=60)
        output_path.write_bytes(resp.content)
        return output_path.stat().st_size > 0
    except Exception as e:
        print(f"    Download failed: {e}")
        return False


# ── Full per-image pipeline ───────────────────────────────────────────────────

def generate_and_host(prompt: str, aspect_ratio: str, out_path: Path, label: str) -> tuple:
    """
    Full pipeline: generate via fal.ai -> download -> upload to Cloudflare R2.
    Returns:
      ("SKIP", None)    — file already exists, skip
      (r2_url, None)    — success, permanent R2 public URL
      (None, error)     — failure
    """
    if out_path.exists():
        return "SKIP", None

    # Submit to fal.ai nano-banana
    status_url, result_url, err = fal_submit({
        "prompt":           prompt,
        "aspect_ratio":     aspect_ratio,
        "output_format":    "png",
        "safety_tolerance": "4",
        "num_images":       1,
    })
    if not status_url:
        return None, f"Submit failed: {err}"

    # Poll until complete
    fal_url, err = fal_poll(status_url, result_url, label)
    if not fal_url:
        return None, err

    # Download locally
    if not download_file(fal_url, out_path):
        return None, "Download failed"

    # Upload to Cloudflare R2 (retry up to 3 times)
    r2_url = None
    for attempt in range(1, 4):
        r2_url = upload_to_r2(out_path, out_path.name)
        if r2_url:
            break
        if attempt < 3:
            print(f"    [{label}] R2 upload failed (attempt {attempt}/3), retrying...")
            time.sleep(5)

    if not r2_url:
        return None, "R2 upload failed after 3 attempts"

    print(f"    [{label}] R2: {r2_url}")
    return r2_url, None


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("\n=== Story-to-Animation: Step 3 — Image Generation ===\n")
    print(f"  Model  : fal.ai {FAL_IMAGE_MODEL}")
    print(f"  Storage: Cloudflare R2 ({R2_BUCKET_NAME})\n")

    for fname in ["characters.json", "backgrounds.json"]:
        if not Path(fname).exists():
            print(f"ERROR: {fname} not found in current directory")
            raise SystemExit(1)

    chars_data = json.loads(Path("characters.json").read_text(encoding="utf-8"))
    bgs_data   = json.loads(Path("backgrounds.json").read_text(encoding="utf-8"))

    Path("characters").mkdir(exist_ok=True)
    Path("backgrounds").mkdir(exist_ok=True)

    results    = {"success": [], "skipped": [], "failed": []}
    json_dirty = {"chars": False, "bgs": False}

    # ── Character images (1:1 reference sheets) ───────────────────────────────
    characters = chars_data.get("characters", [])
    print(f"Generating {len(characters)} character image(s)...\n")

    for char in characters:
        cid = char["character_id"]
        out = Path("characters") / f"{cid}.png"
        print(f"  [{cid}] {char['name']}...")

        url, err = generate_and_host(char["prompt"], "1:1", out, cid)

        if url == "SKIP":
            print(f"         -> already exists, skipping (delete to regenerate)")
            results["skipped"].append(f"characters/{cid}.png")
        elif url:
            char["image_url"] = url
            json_dirty["chars"] = True
            print(f"         -> saved to characters/{cid}.png")
            results["success"].append(f"characters/{cid}.png")
        else:
            print(f"         -> FAILED: {err}")
            results["failed"].append(f"characters/{cid}.png")

    # ── Background images (16:9 cinematic) ────────────────────────────────────
    backgrounds = bgs_data.get("backgrounds", [])
    print(f"\nGenerating {len(backgrounds)} background image(s)...\n")

    for bg in backgrounds:
        bid = bg["bg_id"]
        out = Path("backgrounds") / f"{bid}.png"
        print(f"  [{bid}] {bg['name']}...")

        url, err = generate_and_host(bg["prompt"], "16:9", out, bid)

        if url == "SKIP":
            print(f"         -> already exists, skipping (delete to regenerate)")
            results["skipped"].append(f"backgrounds/{bid}.png")
        elif url:
            bg["image_url"] = url
            json_dirty["bgs"] = True
            print(f"         -> saved to backgrounds/{bid}.png")
            results["success"].append(f"backgrounds/{bid}.png")
        else:
            print(f"         -> FAILED: {err}")
            results["failed"].append(f"backgrounds/{bid}.png")

    # ── Write image_url back into JSON files ──────────────────────────────────
    if json_dirty["chars"]:
        Path("characters.json").write_text(
            json.dumps(chars_data, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print("\n  characters.json updated with image_url (R2)")
    if json_dirty["bgs"]:
        Path("backgrounds.json").write_text(
            json.dumps(bgs_data, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print("  backgrounds.json updated with image_url (R2)")

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'='*50}")
    print(f"  Generated : {len(results['success'])}")
    print(f"  Skipped   : {len(results['skipped'])} (already existed)")
    print(f"  Failed    : {len(results['failed'])}")
    print(f"{'='*50}")

    if results["skipped"]:
        print("\nNote: Skipped images have no image_url in JSON.")
        print("      Delete the PNG file and re-run to generate + host a fresh URL.")

    if results["failed"]:
        print("\nFailed images (update prompt in JSON, delete PNG, re-run):")
        for f in results["failed"]:
            print(f"  - {f}")
        raise SystemExit(1)
    else:
        print("\nAll done! image_url fields are permanent Cloudflare R2 URLs.")
        print("Next step: create the shot list (Skill 4), then run generate_videos.py (Skill 5).")


if __name__ == "__main__":
    main()
