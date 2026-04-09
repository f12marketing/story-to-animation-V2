#!/usr/bin/env python3
"""
Generate a slideshow video from composite images using Remotion.

Reads shots.json + composites/ folder, applies Ken Burns effects and
cross-fade transitions, and renders final_animation.mp4 — no AI video
generation required.

Usage:
  cd /path/to/your/project
  python ~/.claude/skills/generating-slideshow-video/scripts/generate_slideshow.py

  # Custom output or transition:
  python ... --output final_animation.mp4 --fps 30 --transition 15

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
    os.path.expandvars(r"%APPDATA%\nvm\current"),
]
_extra = os.pathsep.join(d for d in _NODE_DIRS if os.path.isdir(d))
if _extra:
    os.environ["PATH"] = _extra + os.pathsep + os.environ.get("PATH", "")


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
    parser = argparse.ArgumentParser(description="Render slideshow video from composite images using Remotion.")
    parser.add_argument("--output",     default="final_animation.mp4", help="Output file (default: final_animation.mp4)")
    parser.add_argument("--fps",        default=30, type=int,           help="Frames per second (default: 30)")
    parser.add_argument("--transition", default=15, type=int,           help="Cross-fade frames (default: 15 = 0.5s at 30fps)")
    args = parser.parse_args()

    print("\n=== Story-to-Animation: Slideshow Video (Ken Burns + Transitions) ===\n")

    # ── Preflight checks ──────────────────────────────────────────────────────
    if not check_node() or not check_npm():
        print("ERROR: Node.js / npm not found in PATH.")
        print("  Windows: winget install OpenJS.NodeJS")
        print("  Mac:     brew install node")
        print("  Linux:   sudo apt install nodejs npm")
        raise SystemExit(1)

    if not Path("shots.json").exists():
        print("ERROR: shots.json not found. Run the shot list skill first.")
        raise SystemExit(1)

    composites_dir = Path("composites")
    if not composites_dir.exists():
        print("ERROR: composites/ folder not found.")
        print("  Run generate_composites_only.py first to generate composite images.")
        raise SystemExit(1)

    # ── Load shots ────────────────────────────────────────────────────────────
    shots_data = json.loads(Path("shots.json").read_text(encoding="utf-8"))
    shots      = shots_data.get("shots", [])
    if not shots:
        print("ERROR: No shots in shots.json")
        raise SystemExit(1)

    # Verify composites exist for all shots
    missing = []
    for shot in shots:
        img = composites_dir / f"{shot['shot_id']}.png"
        if not img.exists():
            missing.append(shot['shot_id'])
    if missing:
        print(f"WARNING: Missing composite images for: {', '.join(missing)}")
        print("  Run generate_composites_only.py to generate missing composites.")
        if len(missing) == len(shots):
            raise SystemExit(1)

    print(f"  Shots      : {len(shots)}")
    print(f"  Composites : {len(shots) - len(missing)} found, {len(missing)} missing")
    print(f"  FPS        : {args.fps}")
    print(f"  Transition : {args.transition} frames ({args.transition / args.fps:.1f}s cross-fade)\n")

    # ── Set up Remotion project ───────────────────────────────────────────────
    project_dir  = Path("slideshow_project")
    src_dir      = project_dir / "src"
    public_dir   = project_dir / "public"
    comp_pub_dir = public_dir / "composites"

    project_dir.mkdir(exist_ok=True)
    src_dir.mkdir(exist_ok=True)
    public_dir.mkdir(exist_ok=True)
    comp_pub_dir.mkdir(exist_ok=True)

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

    # Copy composite images to public/composites/
    print("  Copying composite images to slideshow_project/public/composites/...")
    copied = 0
    for shot in shots:
        src_img = composites_dir / f"{shot['shot_id']}.png"
        dst_img = comp_pub_dir  / f"{shot['shot_id']}.png"
        if src_img.exists():
            if not dst_img.exists() or dst_img.stat().st_size != src_img.stat().st_size:
                shutil.copy2(src_img, dst_img)
            copied += 1
    print(f"  Copied {copied} composites.\n")

    # ── Generate composition-data.json ────────────────────────────────────────
    composition_data = {
        "fps":              args.fps,
        "transition_frames": args.transition,
        "shots": [
            {
                "shot_id":          s.get("shot_id"),
                "duration_seconds": s.get("duration_seconds", 8),
                "dialogue":         s.get("dialogue", ""),
                "scene_title":      s.get("scene_title", ""),
                "mood":             s.get("mood", ""),
                "image_exists":     (composites_dir / f"{s.get('shot_id')}.png").exists(),
            }
            for s in shots
        ],
    }

    # Filter to only shots that have images
    composition_data["shots"] = [s for s in composition_data["shots"] if s["image_exists"]]
    for s in composition_data["shots"]:
        del s["image_exists"]

    comp_path = src_dir / "composition-data.json"
    comp_path.write_text(json.dumps(composition_data, indent=2), encoding="utf-8")
    print(f"  Composition data written ({len(composition_data['shots'])} shots).\n")

    # ── Calculate total duration ───────────────────────────────────────────────
    n = len(composition_data["shots"])
    total_frames = sum(
        round(s["duration_seconds"] * args.fps)
        for s in composition_data["shots"]
    ) - (n - 1) * args.transition
    total_secs = total_frames / args.fps
    print(f"  Total duration : {total_secs:.1f}s ({total_frames} frames)\n")

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
    render_output.unlink(missing_ok=True)

    print(f"  Rendering {n} shots -> {output_path}...\n")

    rc = run(
        ["npx", "remotion", "render", "src/index.ts", "SlideshowComposition", "output.mp4"],
        cwd=str(project_dir),
    )
    if rc != 0:
        print("\nERROR: Remotion render failed.")
        print(f"  Debug manually:")
        print(f"    cd {project_dir}")
        print(f"    npx remotion render src/index.ts SlideshowComposition output.mp4")
        raise SystemExit(1)

    if render_output.exists():
        shutil.copy2(render_output, output_path)
    else:
        print(f"\nERROR: Expected output not found at {render_output}")
        raise SystemExit(1)

    size_mb = output_path.stat().st_size / 1024 / 1024
    print(f"\n{'='*55}")
    print(f"  Output   : {output_path} ({size_mb:.1f} MB)")
    print(f"  Duration : {total_secs:.1f}s  ({n} shots)")
    print(f"  FPS      : {args.fps}")
    print(f"  Crossfade: {args.transition} frames ({args.transition / args.fps:.1f}s)")
    print(f"{'='*55}")
    print("\nSlideshow rendered! Review final_animation.mp4.")


if __name__ == "__main__":
    main()
