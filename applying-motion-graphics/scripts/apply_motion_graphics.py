#!/usr/bin/env python3
"""
Apply Remotion motion graphics to final_animation.mp4.

Adds:
  - 3-second title card with institute name/logo (animated)
  - Per-shot subtitles synced to dialogue in shots.json
  - Character name lower thirds on first appearances
  - 5-second branded end screen with logo

Config — brand.json in your project directory (auto-created on first run):
  {
    "institute_name": "Your Institute Name",
    "tagline": "Empowering Minds",
    "primary_color": "#003087",
    "accent_color": "#FFD700",
    "text_color": "#FFFFFF",
    "logo_path": "./logo.png",
    "font_family": "Inter"
  }

Usage:
  cd /path/to/your/project
  python ~/.claude/skills/applying-motion-graphics/scripts/apply_motion_graphics.py

  # Custom input/output/brand:
  python ... --input final_animation.mp4 --output final_branded.mp4 --brand brand.json

Requirements:
  Node.js 18+ and npm installed.
    Windows: winget install OpenJS.NodeJS
    Mac:     brew install node
    Linux:   sudo apt install nodejs npm
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

SKILL_DIR     = Path(__file__).parent.parent
TEMPLATES_DIR = SKILL_DIR / "templates"

# Ensure Windows Node.js directories are on the PATH for subprocess calls
_NODE_DIRS = [
    r"C:\Program Files\nodejs",
    r"C:\Program Files (x86)\nodejs",
    os.path.expandvars(r"%APPDATA%\npm"),
]
_extra = os.pathsep.join(d for d in _NODE_DIRS if os.path.isdir(d))
if _extra:
    os.environ["PATH"] = _extra + os.pathsep + os.environ.get("PATH", "")

BRAND_TEMPLATE = {
    "institute_name": "Your Institute Name",
    "tagline":        "Empowering Minds",
    "primary_color":  "#003087",
    "accent_color":   "#FFD700",
    "text_color":     "#FFFFFF",
    "logo_path":      "./logo.png",
    "font_family":    "Inter",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

_IS_WIN = sys.platform == "win32"


def check_node() -> bool:
    try:
        r = subprocess.run(["node", "--version"], capture_output=True, text=True, shell=_IS_WIN)
        return r.returncode == 0
    except FileNotFoundError:
        return False


def check_npm() -> bool:
    try:
        r = subprocess.run(["npm", "--version"], capture_output=True, text=True, shell=_IS_WIN)
        return r.returncode == 0
    except FileNotFoundError:
        return False


def run(cmd: list, cwd: str = None) -> int:
    return subprocess.run(cmd, cwd=cwd, shell=_IS_WIN).returncode


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Apply Remotion motion graphics to final animation.")
    parser.add_argument("--input",  default="final_animation.mp4",          help="Input video  (default: final_animation.mp4)")
    parser.add_argument("--output", default="final_animation_branded.mp4",  help="Output video (default: final_animation_branded.mp4)")
    parser.add_argument("--brand",  default="brand.json",                   help="Brand config (default: brand.json)")
    args = parser.parse_args()

    print("\n=== Story-to-Animation: Phase 5 — Motion Graphics (Remotion) ===\n")

    # ── Preflight checks ──────────────────────────────────────────────────────
    if not check_node() or not check_npm():
        print("ERROR: Node.js / npm not found in PATH.")
        print("  Windows: winget install OpenJS.NodeJS")
        print("  Mac:     brew install node")
        print("  Linux:   sudo apt install nodejs npm")
        raise SystemExit(1)

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"ERROR: Input video not found: {input_path}")
        raise SystemExit(1)

    if not Path("shots.json").exists():
        print("ERROR: shots.json not found. Run the shot list skill first.")
        raise SystemExit(1)

    # ── Brand config ──────────────────────────────────────────────────────────
    brand_path = Path(args.brand)
    if not brand_path.exists():
        brand_path.write_text(json.dumps(BRAND_TEMPLATE, indent=2), encoding="utf-8")
        print("  brand.json created in your project directory.")
        print("  -> Edit brand.json with your institute details.")
        print("  -> Place your logo file at the path set in logo_path.")
        print("  -> Re-run this script.\n")
        raise SystemExit(0)

    brand = json.loads(brand_path.read_text(encoding="utf-8"))
    print(f"  Brand     : {brand.get('institute_name', '(not set)')}")

    # ── Load shots + characters ───────────────────────────────────────────────
    shots_data = json.loads(Path("shots.json").read_text(encoding="utf-8"))
    shots      = shots_data.get("shots", [])
    if not shots:
        print("ERROR: No shots in shots.json")
        raise SystemExit(1)

    characters = []
    if Path("characters.json").exists():
        char_data  = json.loads(Path("characters.json").read_text(encoding="utf-8"))
        characters = char_data.get("characters", [])

    print(f"  Shots     : {len(shots)}")
    print(f"  Characters: {len(characters)}")
    print(f"  Input     : {input_path}\n")

    # ── Set up Remotion project directory ─────────────────────────────────────
    project_dir = Path("remotion_project")
    src_dir     = project_dir / "src"
    public_dir  = project_dir / "public"

    project_dir.mkdir(exist_ok=True)
    src_dir.mkdir(exist_ok=True)
    public_dir.mkdir(exist_ok=True)

    # Copy template config files
    for cfg in ["package.json", "tsconfig.json", "remotion.config.ts"]:
        src = TEMPLATES_DIR / cfg
        if src.exists():
            shutil.copy2(src, project_dir / cfg)

    # Copy template React/TS source files
    templates_src = TEMPLATES_DIR / "src"
    if templates_src.exists():
        for f in templates_src.iterdir():
            if f.suffix in (".tsx", ".ts", ".json"):
                shutil.copy2(f, src_dir / f.name)

    # Copy input video to public/ (skip if already identical size)
    video_public = public_dir / "final_animation.mp4"
    if not video_public.exists() or video_public.stat().st_size != input_path.stat().st_size:
        print("  Copying video to remotion_project/public/...")
        shutil.copy2(input_path, video_public)

    # Handle logo file
    logo_filename = None
    logo_path_str = brand.get("logo_path", "")
    if logo_path_str:
        logo_src = Path(logo_path_str)
        if logo_src.exists():
            logo_filename = logo_src.name
            shutil.copy2(logo_src, public_dir / logo_src.name)
            print(f"  Logo      : {logo_src.name}")
        else:
            print(f"  Logo      : not found at '{logo_path_str}' — skipping")

    # ── Generate composition-data.json ────────────────────────────────────────
    composition_data = {
        "shots": [
            {
                "shot_id":    s.get("shot_id"),
                "dialogue":   s.get("dialogue", ""),
                "characters": s.get("characters", []),
                "mood":       s.get("mood", ""),
            }
            for s in shots
        ],
        "characters": [
            {
                "character_id": c.get("character_id"),
                "name":         c.get("name"),
            }
            for c in characters
        ],
        "brand": {
            "institute_name": brand.get("institute_name", ""),
            "tagline":        brand.get("tagline", ""),
            "primary_color":  brand.get("primary_color", "#003087"),
            "accent_color":   brand.get("accent_color",  "#FFD700"),
            "text_color":     brand.get("text_color",    "#FFFFFF"),
            "font_family":    brand.get("font_family",   "sans-serif"),
            "logo_filename":  logo_filename,
        },
        "video_path": "final_animation.mp4",
    }
    comp_path = src_dir / "composition-data.json"
    comp_path.write_text(json.dumps(composition_data, indent=2), encoding="utf-8")
    print("  Composition data written.\n")

    # ── npm install (first run only) ──────────────────────────────────────────
    node_modules = project_dir / "node_modules"
    if not node_modules.exists():
        print("  Installing Remotion dependencies (npm install)...")
        print("  This takes 1-2 minutes on first run.\n")
        rc = run(["npm", "install", "--prefer-offline"], cwd=str(project_dir))
        if rc != 0:
            print("\nERROR: npm install failed.")
            raise SystemExit(1)
        print()
    else:
        print("  node_modules found — skipping npm install.\n")

    # ── Remotion render ───────────────────────────────────────────────────────
    output_path   = Path(args.output)
    render_output = project_dir / "output.mp4"
    render_output.unlink(missing_ok=True)  # ensure clean render

    n_shots      = len(shots)
    video_s      = n_shots * 3
    total_s      = video_s + 3 + 5  # +title +end screen
    print(f"  Rendering: {n_shots} shots ({video_s}s) + 3s title + 5s end = {total_s}s total\n")

    rc = run(
        ["npx", "remotion", "render", "src/index.ts", "MainComposition", "output.mp4"],
        cwd=str(project_dir),
    )
    if rc != 0:
        print("\nERROR: Remotion render failed.")
        print(f"  Debug manually:")
        print(f"    cd {project_dir}")
        print(f"    npx remotion render src/index.ts MainComposition output.mp4")
        raise SystemExit(1)

    # Copy render output to project directory
    if render_output.exists():
        shutil.copy2(render_output, output_path)
    else:
        print(f"\nERROR: Expected output not found at {render_output}")
        raise SystemExit(1)

    size_mb = output_path.stat().st_size / 1024 / 1024
    print(f"\n{'='*55}")
    print(f"  Output   : {output_path} ({size_mb:.1f} MB)")
    print(f"  Duration : {total_s}s  ({3}s title + {video_s}s video + {5}s end screen)")
    print(f"  Brand    : {brand.get('institute_name')}")
    print(f"  Logo     : {'included' if logo_filename else 'not set'}")
    print(f"{'='*55}")
    print("\nMotion graphics applied! Review final_animation_branded.mp4.")


if __name__ == "__main__":
    main()
