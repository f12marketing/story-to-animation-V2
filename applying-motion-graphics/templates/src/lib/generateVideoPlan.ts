/**
 * generateVideoPlan — AI integration layer
 *
 * Uses fal.ai's OpenRouter integration to call Claude Sonnet 4.6 and produce
 * a structured VideoPlan JSON from a high-level brief.
 *
 * API: https://fal.ai/models/openrouter/router/api
 * Model: anthropic/claude-sonnet-4-6
 *
 * Required env var:
 *   FAL_KEY  — same key used by the rest of the pipeline (image/video generation)
 *
 * Falls back to sampleVideoPlan.json if the API call or JSON parse fails.
 */

import { fal } from "@fal-ai/client";
import type { MotionIntensity, MotionType, Scene, TransitionType, VideoPlan } from "../types/video";
import samplePlan from "../data/sampleVideoPlan.json";

// ─── Model ────────────────────────────────────────────────────────────────────

const FAL_ROUTE   = "openrouter/router";
const LLM_MODEL   = "anthropic/claude-sonnet-4-6";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VideoPlanBrief {
  topic: string;
  audience: string;
  platform: "youtube" | "instagram_reel" | "linkedin" | "presentation" | "general";
  durationTarget?: number; // total seconds, e.g. 60
  style?: string;          // e.g. "corporate", "energetic", "educational"
}

interface FalOpenRouterOutput {
  output: string;
  reasoning?: string;
  partial?: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost?: number;
  };
}

// ─── Master Prompt ────────────────────────────────────────────────────────────

const PLATFORM_GUIDELINES: Record<VideoPlanBrief["platform"], string> = {
  youtube:         "Aim for 60–90 seconds. Use hook in scene 1. End with CTA.",
  instagram_reel:  "Keep under 60 seconds. Hook in first 3s. High energy throughout.",
  linkedin:        "45–75 seconds. Professional tone. Data-driven. Subtle motion.",
  presentation:    "Can be 90–180 seconds. Structured sections. Clear transitions.",
  general:         "30–90 seconds. Balanced energy. Clear narrative arc.",
};

function buildSystemPrompt(brief: VideoPlanBrief): string {
  const guide = PLATFORM_GUIDELINES[brief.platform];

  return `You are a world-class motion graphics director and video production expert.
Your task is to design a scene-by-scene video production plan in strict JSON format.

PLATFORM: ${brief.platform.toUpperCase()}
PLATFORM GUIDANCE: ${guide}
TOPIC: ${brief.topic}
AUDIENCE: ${brief.audience}
STYLE: ${brief.style ?? "professional, modern"}
TARGET DURATION: ${brief.durationTarget ?? 60} seconds

AVAILABLE MOTION TYPES (use these exact strings):
- KINETIC_TYPOGRAPHY   → word-by-word animated text overlay; ideal for spoken key phrases
- LOWER_THIRD          → sliding name/label bar at bottom-left; ideal for speaker IDs, data labels
- TRANSITION           → scene-entry transition (ALWAYS include in every scene)
- UI_ANIMATION         → cursor/click/typing simulation; ideal for product demos
- SHAPE_ANIMATION      → floating geometric shapes in background; adds visual energy
- PROGRESS_BAR         → thin animated progress strip top or bottom; ideal for tutorials/steps
- CTA_ANIMATION        → pulsing call-to-action button; use in action scenes only
- BROLL_OVERLAY        → spotlight/highlight box over a visual area; ideal for demos
- LOGO_ANIMATION       → branded logo intro/outro — ONLY in scene 1 and the final scene
- INFOGRAPHIC_ANIMATION → animated counter/bar/pie/list; ideal for data-heavy scenes

TRANSITION TYPES: "fade" | "zoom" | "whip" | "glitch"
INTENSITY: "low" | "medium" | "high"

STRICT RULES:
1. LOGO_ANIMATION ONLY in scene 1 (intro) and the very last scene (outro)
2. TRANSITION must appear in every single scene
3. KINETIC_TYPOGRAPHY for any scene with key spoken/written phrases
4. Vary motion_intensity: "high" for energy scenes, "low" for calm/speaker scenes
5. Each scene duration: 3–8 seconds
6. Total scene durations must sum to approximately ${brief.durationTarget ?? 60} seconds
7. Write voiceover as natural, conversational speech
8. Keep motion_graphics arrays to 2–4 items per scene

OUTPUT REQUIREMENT:
Return ONLY a valid JSON array. No markdown code fences, no explanation text, no preamble.

Schema for each element:
{
  "scene_number": number,
  "duration": number,
  "purpose": "one sentence — what this scene achieves",
  "voiceover": "exact narration text the narrator speaks",
  "visual": "background visual description (drives colour/gradient)",
  "motion_graphics": ["MOTION_TYPE", ...],
  "transition": "fade" | "zoom" | "whip" | "glitch",
  "motion_intensity": "low" | "medium" | "high"
}`;
}

// ─── JSON Validation + Coercion ───────────────────────────────────────────────

const VALID_MOTION_TYPES = new Set<MotionType>([
  "KINETIC_TYPOGRAPHY", "LOWER_THIRD", "TRANSITION", "UI_ANIMATION",
  "SHAPE_ANIMATION", "PROGRESS_BAR", "CTA_ANIMATION", "BROLL_OVERLAY",
  "LOGO_ANIMATION", "INFOGRAPHIC_ANIMATION",
]);

const VALID_TRANSITIONS = new Set<TransitionType>(["fade", "zoom", "whip", "glitch"]);
const VALID_INTENSITY   = new Set<MotionIntensity>(["low", "medium", "high"]);

function validateAndCoerce(raw: unknown[]): VideoPlan {
  return raw.map((item: unknown, i: number): Scene => {
    const s = item as Record<string, unknown>;

    const motionGraphics = (Array.isArray(s.motion_graphics) ? s.motion_graphics : [])
      .filter((m: unknown): m is MotionType => VALID_MOTION_TYPES.has(m as MotionType));

    // Guarantee every scene has a TRANSITION
    if (!motionGraphics.includes("TRANSITION")) {
      motionGraphics.unshift("TRANSITION");
    }

    const transition: TransitionType = VALID_TRANSITIONS.has(s.transition as TransitionType)
      ? (s.transition as TransitionType)
      : "fade";

    const motionIntensity: MotionIntensity = VALID_INTENSITY.has(s.motion_intensity as MotionIntensity)
      ? (s.motion_intensity as MotionIntensity)
      : "medium";

    return {
      scene_number:     typeof s.scene_number === "number" ? s.scene_number : i + 1,
      duration:         typeof s.duration === "number" && s.duration > 0 ? s.duration : 5,
      purpose:          typeof s.purpose === "string"   ? s.purpose   : `Scene ${i + 1}`,
      voiceover:        typeof s.voiceover === "string" ? s.voiceover : "",
      visual:           typeof s.visual === "string"    ? s.visual    : "dark cinematic background",
      motion_graphics:  motionGraphics,
      transition,
      motion_intensity: motionIntensity,
    };
  });
}

// ─── fal.ai OpenRouter call ───────────────────────────────────────────────────

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error("FAL_KEY env var not set.");

  fal.config({ credentials: falKey });

  const result = await fal.subscribe(FAL_ROUTE, {
    input: {
      model:         LLM_MODEL,
      system_prompt: systemPrompt,
      prompt:        userPrompt,
      temperature:   0.7,
      max_tokens:    4096,
    },
  });

  const data = result.data as FalOpenRouterOutput;

  if (!data?.output) {
    throw new Error(`fal.ai returned no output. Full response: ${JSON.stringify(result)}`);
  }

  if (data.usage) {
    console.log(
      `📊 Tokens — prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens}` +
      (data.usage.cost != null ? `, cost: $${data.usage.cost.toFixed(6)}` : "")
    );
  }

  return data.output;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Generate a structured VideoPlan from a brief using Claude Sonnet 4.6
 * via fal.ai's OpenRouter integration.
 *
 * Falls back to sampleVideoPlan.json on any failure.
 *
 * @example
 * const plan = await generateVideoPlan({
 *   topic: 'Understanding fractions for Grade 3 students',
 *   audience: 'Primary school children aged 8–9',
 *   platform: 'youtube',
 *   durationTarget: 60,
 *   style: 'fun, colourful, educational',
 * });
 */
export async function generateVideoPlan(brief: VideoPlanBrief): Promise<VideoPlan> {
  const systemPrompt = buildSystemPrompt(brief);
  const userPrompt   =
    `Create a complete video production plan for: "${brief.topic}"\n` +
    `Target audience: ${brief.audience}\n` +
    `Platform: ${brief.platform}\n` +
    `Duration: ~${brief.durationTarget ?? 60} seconds\n\n` +
    `Generate the full scene-by-scene JSON plan now. Return ONLY the JSON array.`;

  try {
    console.log(`🤖 Calling ${LLM_MODEL} via fal.ai OpenRouter…`);
    const rawText = await callClaude(systemPrompt, userPrompt);

    // Extract JSON array — handle any accidental prose before/after
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in model response.");

    const parsed = JSON.parse(jsonMatch[0]) as unknown[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Model returned an empty or non-array JSON value.");
    }

    const plan = validateAndCoerce(parsed);
    const totalSecs = plan.reduce((a, s) => a + s.duration, 0);
    console.log(`✅ Generated ${plan.length}-scene video plan (~${totalSecs}s) via Claude Sonnet 4.6`);
    return plan;
  } catch (err) {
    console.warn("⚠️  AI video plan generation failed — falling back to sampleVideoPlan.json:", err);
    return validateAndCoerce(samplePlan);
  }
}

/**
 * Write a generated plan to a JSON file for use with the Remotion render.
 * Call from a Node.js script, not from within Remotion components.
 *
 * @example
 * const plan = await generateVideoPlan({ ... });
 * await writePlanToFile(plan, './src/data/generatedPlan.json');
 */
export async function writePlanToFile(plan: VideoPlan, outputPath: string): Promise<void> {
  const { writeFileSync } = await import("fs");
  writeFileSync(outputPath, JSON.stringify(plan, null, 2), "utf-8");
  console.log(`📄 Video plan saved to ${outputPath}`);
}
