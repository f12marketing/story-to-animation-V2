---
name: applying-motion-graphics
description: >
  Applies Remotion-powered motion graphics to final_animation.mp4, producing
  a fully-branded output video. Automatically runs after generating-composite-and-video
  completes. Adds a 3-second title card with institute name/logo, per-shot subtitles
  synced to dialogue in shots.json, character name lower thirds on first appearances,
  and a 5-second branded end screen with logo. Reads branding from brand.json (auto-
  created as a template on first run). Requires Node.js 18+ and npm. Use when the
  video pipeline is complete and final_animation.mp4 exists. Also use when the user
  asks to add a logo, branding, subtitles, title card, or end screen to a video.
  After rendering, ALWAYS present output and wait for explicit user approval.
---

# Motion Graphics with Remotion

Adds a branded intro, subtitles, lower thirds, and logo end screen to the
raw animation using Remotion (React-based video framework).

## Output Files

| File | Description |
|------|-------------|
| `final_animation_branded.mp4` | Final video with all motion graphics |
| `brand.json` | Branding config (auto-created on first run) |
| `remotion_project/` | Remotion project (can be deleted after render) |

## Timeline Structure

```
[Title Card 3s] → [Main Video + Overlays] → [End Screen 5s]
     ↑                      ↑                      ↑
  Institute name       Subtitles +            Logo + name
  + logo (if set)    lower thirds             + tagline
```

## Setup

### 1. brand.json (auto-created on first run)

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

Edit `brand.json` with your institute's details. Set `logo_path` to the path
of your logo file (PNG/JPG). If `logo_path` does not exist the logo is skipped
gracefully.

### 2. Node.js

Remotion requires Node.js 18+:

```bash
# Windows
winget install OpenJS.NodeJS

# Mac
brew install node

# Linux
sudo apt install nodejs npm
```

## Running

```bash
cd /path/to/your/project
python ~/.claude/skills/applying-motion-graphics/scripts/apply_motion_graphics.py
```

Optional flags:
```bash
--input   final_animation.mp4          # default: final_animation.mp4
--output  final_animation_branded.mp4  # default: final_animation_branded.mp4
--brand   brand.json                   # default: brand.json
```

## What the Script Does

1. Reads `shots.json` for dialogue and character data
2. Reads `brand.json` for branding (creates template if missing)
3. Copies logo to `remotion_project/public/` (if it exists)
4. Copies `final_animation.mp4` to `remotion_project/public/`
5. Generates `composition-data.json` with shots + brand config
6. Runs `npm install` in `remotion_project/` (first run only, ~1-2 min)
7. Runs `npx remotion render` to produce `final_animation_branded.mp4`

## Remotion Composition Components

| Component | What It Renders |
|-----------|----------------|
| `TitleCard` | Institute name, tagline, logo — animated fade-in |
| `Subtitles` | Shot dialogue — appears at bottom, synced to shots |
| `LowerThird` | Character name on first appearance — slides in from left |
| `EndScreen` | Logo + institute name — scale-in animation |

## Branding Customization

All visual parameters are driven by `brand.json`:

| Field | Default | Effect |
|-------|---------|--------|
| `primary_color` | `#003087` | Background of title/end screen, lower thirds |
| `accent_color` | `#FFD700` | Tagline color, subtitle border, lower third bar |
| `text_color` | `#FFFFFF` | All text |
| `font_family` | `Inter` | All typography |
| `logo_path` | `./logo.png` | Logo shown in title card and end screen |

## Re-rendering

To update branding and re-render:
1. Edit `brand.json`
2. Delete `final_animation_branded.mp4`
3. Re-run the script (npm install is skipped on subsequent runs)

To update for a new video:
1. Delete `remotion_project/public/final_animation.mp4`
2. Re-run the script

## Review Gate (MANDATORY)

After the render completes, present this EXACTLY:

```
🎬 Motion graphics applied!

- Output     : ./final_animation_branded.mp4
- Size       : [X] MB
- Duration   : [X]s ([3s title] + [Xs video] + [5s end screen])
- Brand      : [institute_name]
- Logo       : [included / not found]

👉 Please review final_animation_branded.mp4. You can:
  - Approve   → say "done" or "looks great"
  - Adjust    → edit brand.json and say "re-render"
  - New logo  → place logo.png in project folder and say "re-render"

⏸️ Waiting for your approval.
```

**NEVER** mark the pipeline as complete without explicit user approval.
