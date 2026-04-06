---
name: creating-shot-list
description: >
  Reads story.md, characters.json, and backgrounds.json to decompose the story
  into individual 3-second shots. Each shot maps to specific character IDs, a
  background ID, camera movement, action description, and a self-contained video
  generation prompt. Saves output as shots.json. Part of the
  Story-to-Animation pipeline (Step 4 of 5). Use when story and asset JSON files
  exist and the user wants to create the shot-by-shot breakdown for video
  generation. After generating shots.json, ALWAYS present the output and wait
  for explicit user approval. Do NOT automatically trigger the next pipeline step.
---

# Shot List Creation

Decompose the story into discrete 3-second shots mapped to asset IDs and video
generation prompts. Save as `shots.json`.

## Shot Count Calculation

Each video clip is exactly **3 seconds** long. Calculate the number of shots
based on the user's desired video length:

```
shots = desired_length_seconds / 3
```

Examples:
- 30-second video → 10 shots (10 × 3s = 30s)
- 60-second video → 20 shots (20 × 3s = 60s)
- 90-second video → 30 shots (30 × 3s = 90s)

If the user has not specified a desired length, ask them before generating the
shot list.

## Instructions

1. Read `story.md`, `characters.json`, and `backgrounds.json`.
2. Ask the user how long they want the final video to be (if not already specified).
3. Calculate the required number of shots: `shots = desired_seconds / 3`.
4. Distribute shots across scenes proportionally to their importance/length.
5. Break each scene into **1–3 shots** of exactly **3 seconds** each.
6. Assign sequential IDs: `shot_001`, `shot_002`, ...
7. For each shot:
   - **characters**: List of `character_id`s present (must match characters.json IDs)
   - **background**: The `bg_id` for this location (must match backgrounds.json IDs)
   - **action**: Clear visual description of what happens in this 3-second clip
   - **camera_movement**: e.g., `"static wide shot"`, `"slow dolly-in"`, `"pan left"`, `"close-up on face"`, `"tracking shot"`
   - **dialogue**: Spoken line if any, or `""` if none
   - **mood**: Emotional tone
   - **veo_prompt**: Self-contained video generation prompt (see format below)

## Video Prompt Format

Each `veo_prompt` must be fully self-contained — describe the shot as if standalone.
Do NOT use asset IDs (char_001, bg_001) — the video model reads this directly.

Pattern:
```
[Art style], [shot type + camera movement], [character description + action],
[setting description], [lighting and mood], [duration hint]
```

Example:
```
Pixar-style 3D animation, slow dolly-in from wide to medium shot, a 12-year-old
girl with curly auburn hair and teal jacket steps into a magical sunlit forest
clearing, bioluminescent mushrooms and golden sunbeams, sense of wonder, 3 seconds
```

## Output File: shots.json

```json
{
  "shots": [
    {
      "shot_id": "shot_001",
      "scene_number": 1,
      "scene_title": "Scene title from story.md",
      "shot_number_in_scene": 1,
      "duration_seconds": 3,
      "characters": ["char_001"],
      "background": "bg_001",
      "action": "Luna steps into the forest clearing, eyes wide with wonder",
      "camera_movement": "Slow dolly-in from wide shot to medium shot",
      "dialogue": "",
      "mood": "Wonder and discovery",
      "veo_prompt": "Pixar-style 3D animation, slow dolly-in from wide to medium shot, a 12-year-old girl with curly auburn hair and teal adventure jacket steps cautiously into a magical forest clearing with bioluminescent mushrooms, warm golden sunbeams filter through ancient oak trees, sense of awe and discovery, 3 seconds"
    }
  ]
}
```

## Review Gate (MANDATORY)

After saving `shots.json`, present this EXACTLY:

```
✅ Shot List Creation complete. Output saved to shots.json.

📋 Summary:
- Total shots: [X]
- Scenes covered: [X]
- Characters referenced: [list unique char_ids used]
- Backgrounds referenced: [list unique bg_ids used]
- Estimated total video length: [X shots × 3 sec = X seconds (~X min)]

👉 Please review shots.json. Key things to check:
  - Does each shot's action match the story flow?
  - Are veo_prompts detailed and fully self-contained (no asset ID references)?
  - Are all character_ids and bg_ids valid (match the JSON files)?
  - Is the pacing right (shots per scene)?

You can:
  - Approve → say "approved" or "proceed"
  - Request changes → e.g., "add a close-up of Luna's face after shot_003"
  - Edit shots.json directly → tell me when done

⏸️ Waiting for your approval before generating video clips.
```

**NEVER** proceed to the next skill automatically. Wait for explicit approval.

Allow iterative refinement — add, remove, or reorder shots as needed.
