---
name: generating-story-from-logline
description: >
  Expands a short story logline or premise into a full structured narrative
  screenplay saved as story.md. Use when the user provides a story idea,
  logline, or premise and wants to generate a complete story with scenes,
  characters, dialogue, and visual descriptions for 3D animation production.
  Part of the Story-to-Animation pipeline (Step 1 of 5). After generating
  story.md, ALWAYS present the output and wait for explicit user approval.
  Do NOT automatically trigger the next pipeline step.
---

# Story Generation

Expand a user-provided logline into a structured animation screenplay saved as `story.md`.

## Step 0 — Project Configuration (MANDATORY, runs FIRST)

Before writing any story content, ask the user ALL of the following questions in a
single, well-formatted message. Wait for their answers before proceeding.

Present this EXACTLY:

```
🎬 Before we begin, let's configure your animation project. Please answer the
questions below — you can skip any by typing "default" or leaving it blank.

─────────────────────────────────────────
📐 OUTPUT SETTINGS
─────────────────────────────────────────
1. Aspect Ratio
   Options: 16:9 (landscape) | 9:16 (vertical/Reels) | 1:1 (square) | 4:3 (classic)
   Default: 16:9
   Your choice: ___

2. Resolution
   Options: 480p | 720p | 1080p | 4K
   Default: 720p
   Your choice: ___

─────────────────────────────────────────
📁 INPUT ASSETS
─────────────────────────────────────────
3. Input Images (optional)
   Do you have existing character or background images to use?
   Options: Yes (provide file paths) | No (AI will generate everything)
   Default: No
   Your answer: ___

4. Script / Narration Specifications (optional)
   Any specific dialogue, narration style, pacing, or tone requirements?
   e.g. "formal tone", "Hindi narration", "no dialogue, only narration"
   Default: Natural conversational dialogue
   Your answer: ___

─────────────────────────────────────────
🤖 AI GENERATION SETTINGS
─────────────────────────────────────────
5. Image Generation Style
   Options:
     a) Pixar 3D (default)
     b) Anime / Manga
     c) Realistic / Photographic
     d) Flat / 2D Illustration
     e) Watercolor / Painterly
     f) Custom (describe your style)
   Your choice: ___

6. Video Generation Quality
   Options:
     a) Standard — faster & cheaper (vidu/q3/turbo, default)
     b) High Quality — slower & costlier (vidu/q1)
   Your choice: ___

─────────────────────────────────────────
🎙️ AUDIO SETTINGS
─────────────────────────────────────────
7. Voiceover
   Options: Yes | No (default: Yes)
   If Yes — Voice style? e.g. "warm female", "authoritative male", "child-like"
   Language? e.g. English, Hindi, Spanish (default: English)
   Your answer: ___

8. Background Music
   Options: Yes | No (default: No — music generation not yet wired in pipeline)
   If Yes — Mood/genre? e.g. "uplifting orchestral", "calm acoustic", "cinematic epic"
   Your answer: ___

─────────────────────────────────────────
🎨 VISUAL STYLE & PRESENTATION
─────────────────────────────────────────
9. Subtitle Style
   Options:
     a) None
     b) Simple white text (default)
     c) Bold with drop shadow
     d) Styled lower-thirds (character name + dialogue)
     e) Custom (describe)
   Your choice: ___

10. Visual Style / Mode
    Options:
      Mode 1 — AI Video Animation (fal.ai video clips, full motion, default)
      Mode 2 — Motion Graphics (Remotion-powered, animated slides + branded overlays)
      Mode 3 — Slideshow (Ken Burns pan/zoom on composite images, no video API calls)
      Split Screen — side-by-side scenes (e.g. before/after, dual narrative)
    Your choice: ___

─────────────────────────────────────────
🎛️ PRESETS (optional shortcut)
─────────────────────────────────────────
11. Preset (overrides individual settings above if chosen)
    Options:
      • "YouTube Short"  → 9:16, 1080p, Mode 1, subtitles on, voiceover on
      • "Classroom"      → 16:9, 720p, Mode 2, subtitles on, formal narration
      • "Social Reel"    → 9:16, 720p, Mode 3, subtitles on, no voiceover
      • "Full Film"      → 16:9, 1080p, Mode 1, voiceover on, music on
      • "Custom"         → use your answers above
    Your choice: ___
─────────────────────────────────────────

Once you've answered, I'll save your choices to project.config.json and start
generating your story!
```

After receiving answers, save the configuration to `project.config.json` in the
project directory with this structure:

```json
{
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "input_images": [],
  "script_notes": "",
  "image_style": "Pixar 3D",
  "video_quality": "standard",
  "voiceover": {
    "enabled": true,
    "voice_style": "warm female",
    "language": "English"
  },
  "music": {
    "enabled": false,
    "mood": ""
  },
  "subtitle_style": "simple",
  "mode": 1,
  "preset": "Custom"
}
```

Apply any preset defaults before saving. Confirm to the user:
`✅ Configuration saved to project.config.json. Starting story generation...`

Then proceed to story generation below.

## Instructions

1. Analyze the logline: identify genre, tone, conflict arc, and resolution.
2. Expand into **8–15 scenes** (targets ~3–5 minutes at ~8 sec/shot).
3. Each scene must include:
   - **Scene number and title**
   - **Location**: detailed visual description (used for background image generation)
   - **Characters present**: with brief visual descriptions on first appearance
   - **Action and dialogue**: visual storytelling focus (show, don't tell)
   - **Shot Notes**: suggested camera angles/movements (wide, close-up, tracking, etc.)
   - **Tone/Pacing**: emotional beat
4. Write for 3D animation: visually descriptive and action-oriented.
5. Keep character count manageable (3–6 main characters).

## Output Format

Save as `story.md` in the project directory:

```markdown
# [Story Title]

## Logline
[Original logline]

## Characters
- **Name**: Brief description (age, appearance, personality)

## Scene 1: [Scene Title]
**Location**: [Detailed visual setting description]
**Characters**: [Characters present]
**Time of Day**: [Morning/Afternoon/Night]

[Narrative action and dialogue]

**Shot Notes**: [Camera angles and movements]
**Tone**: [Emotional beat]

---

## Scene 2: ...
```

## Review Gate (MANDATORY)

After saving `story.md`, present this EXACTLY:

```
✅ Story Generation complete. Output saved to story.md.

📋 Summary:
- Title: [Story Title]
- Scenes: [X]
- Characters introduced: [list names]
- Estimated animation length: [X scenes × ~8 sec/shot ≈ X seconds]

👉 Please review story.md. You can:
  - Approve as-is → say "approved" or "proceed"
  - Request changes → describe what to modify
  - Edit story.md directly → tell me when done

⏸️ Waiting for your approval before extracting characters and backgrounds.
```

**NEVER** proceed to the next skill automatically. Wait for explicit approval.

Approval keywords: `approved`, `approve`, `looks good`, `proceed`, `next step`,
`go ahead`, `continue`, `LGTM`, `ship it`, `all good`, `move on`, `next`

If changes requested: apply them, summarize what changed, ask for approval again.
