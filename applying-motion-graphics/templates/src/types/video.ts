// ─── Motion Graphics Types ───────────────────────────────────────────────────

export type MotionType =
  | "KINETIC_TYPOGRAPHY"
  | "LOWER_THIRD"
  | "TRANSITION"
  | "UI_ANIMATION"
  | "SHAPE_ANIMATION"
  | "PROGRESS_BAR"
  | "CTA_ANIMATION"
  | "BROLL_OVERLAY"
  | "LOGO_ANIMATION"
  | "INFOGRAPHIC_ANIMATION";

export type MotionIntensity = "low" | "medium" | "high";

export type TransitionType = "fade" | "zoom" | "whip" | "glitch";

// ─── Scene ────────────────────────────────────────────────────────────────────

export interface Scene {
  scene_number: number;
  /** Duration in seconds */
  duration: number;
  /** What this scene achieves narratively */
  purpose: string;
  /** Spoken narration or dialogue */
  voiceover: string;
  /** Visual description — drives background style */
  visual: string;
  /** Ordered list of motion graphics to layer on this scene */
  motion_graphics: MotionType[];
  /** Transition at the START of this scene (from previous) */
  transition: TransitionType;
  /** Controls animation speed and aggressiveness */
  motion_intensity?: MotionIntensity;
}

export type VideoPlan = Scene[];

// ─── Brand ───────────────────────────────────────────────────────────────────

export interface Brand {
  institute_name?: string;
  tagline?: string;
  primary_color?: string;
  accent_color?: string;
  text_color?: string;
  logo_filename?: string | null;
  font_family?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const INTENSITY_SPRING: Record<
  MotionIntensity,
  { damping: number; stiffness: number; mass: number }
> = {
  low:    { damping: 24, stiffness:  60, mass: 1.5 },
  medium: { damping: 14, stiffness: 100, mass: 1.0 },
  high:   { damping:  8, stiffness: 200, mass: 0.5 },
};

export const INTENSITY_SPEED: Record<MotionIntensity, number> = {
  low:    0.6,
  medium: 1.0,
  high:   1.8,
};
