import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { MotionType, Scene } from "../types/video";
import { BrollOverlay } from "./motion/BrollOverlay";
import { CTAAnimation } from "./motion/CTAAnimation";
import { InfographicAnimation } from "./motion/InfographicAnimation";
import { KineticTypography } from "./motion/KineticTypography";
import { LogoAnimation } from "./motion/LogoAnimation";
import { LowerThird } from "./motion/LowerThird";
import { ProgressBar } from "./motion/ProgressBar";
import { ShapeAnimation } from "./motion/ShapeAnimation";
import { Transition } from "./motion/Transition";
import { UIAnimation } from "./motion/UIAnimation";

interface SceneRendererProps {
  scene: Scene;
  /** Optional brand overrides */
  brand?: {
    primary_color?: string;
    accent_color?: string;
    text_color?: string;
    font_family?: string;
    logo_filename?: string | null;
    institute_name?: string;
    tagline?: string;
  };
}

// ── Visual → background colour/gradient mapping ───────────────────────────────
function visualToBackground(visual: string): string {
  const v = visual.toLowerCase();
  if (v.includes("dark"))       return "radial-gradient(ellipse at 30% 40%, #0d0d1a 0%, #000 100%)";
  if (v.includes("amber") || v.includes("warm"))
                                return "radial-gradient(ellipse at 60% 30%, #1a0a00 0%, #0a0500 100%)";
  if (v.includes("teal") || v.includes("blue"))
                                return "radial-gradient(ellipse at 50% 50%, #001a1a 0%, #000 100%)";
  if (v.includes("white") || v.includes("clean") || v.includes("light"))
                                return "#f0f0f0";
  if (v.includes("purple") || v.includes("vibrant"))
                                return "radial-gradient(ellipse at 40% 40%, #1a0028 0%, #000 100%)";
  if (v.includes("golden") || v.includes("gold"))
                                return "radial-gradient(ellipse at 50% 40%, #1a1200 0%, #000 100%)";
  return "radial-gradient(ellipse at 50% 50%, #0d0d1a 0%, #000 100%)";
}

// ── Per-motion-type default prop builders ─────────────────────────────────────
function renderMotionComponent(
  motionType: MotionType,
  scene: Scene,
  durationInFrames: number,
  brand: SceneRendererProps["brand"],
  key: string | number
): React.ReactNode {
  const accent  = brand?.accent_color  ?? "#c8860a";
  const primary = brand?.primary_color ?? "#1a0a00";
  const text    = brand?.text_color    ?? "#ffffff";
  const font    = brand?.font_family   ?? "Inter, sans-serif";
  const logo    = brand?.logo_filename ?? undefined;
  const name    = brand?.institute_name ?? "";
  const tagline = brand?.tagline ?? "";
  const intensity = scene.motion_intensity ?? "medium";

  switch (motionType) {
    case "KINETIC_TYPOGRAPHY":
      return (
        <KineticTypography
          key={key}
          text={scene.voiceover || scene.purpose}
          durationInFrames={durationInFrames}
          position="bottom"
          color={text}
          fontFamily={font}
          intensity={intensity}
        />
      );

    case "LOWER_THIRD":
      return (
        <LowerThird
          key={key}
          title={scene.purpose}
          subtitle="SCENE"
          durationInFrames={durationInFrames}
          position="bottom-left"
          accentColor={accent}
          bgColor={primary}
          textColor={text}
          fontFamily={font}
          intensity={intensity}
        />
      );

    case "TRANSITION":
      return (
        <Transition
          key={key}
          type={scene.transition}
          durationInFrames={Math.min(durationInFrames, 20)}
          direction="in"
          accentColor={accent}
          intensity={intensity}
        />
      );

    case "UI_ANIMATION":
      return (
        <UIAnimation
          key={key}
          type="click"
          durationInFrames={durationInFrames}
          position={{ x: 55, y: 50 }}
          accentColor={accent}
          intensity={intensity}
        />
      );

    case "SHAPE_ANIMATION":
      return (
        <ShapeAnimation
          key={key}
          durationInFrames={durationInFrames}
          accentColor={accent}
          intensity={intensity}
        />
      );

    case "PROGRESS_BAR":
      return (
        <ProgressBar
          key={key}
          durationInFrames={durationInFrames}
          position="top"
          color={accent}
          height={5}
          intensity={intensity}
        />
      );

    case "CTA_ANIMATION":
      return (
        <CTAAnimation
          key={key}
          text="Get Started →"
          durationInFrames={durationInFrames}
          position="bottom-center"
          backgroundColor={accent}
          textColor={primary || "#000"}
          fontFamily={font}
          showArrow={false}
          intensity={intensity}
        />
      );

    case "BROLL_OVERLAY":
      return (
        <BrollOverlay
          key={key}
          durationInFrames={durationInFrames}
          label="HIGHLIGHT"
          accentColor={accent}
          textColor={text}
          fontFamily={font}
          intensity={intensity}
        />
      );

    case "LOGO_ANIMATION": {
      const isOutroScene = scene.motion_graphics.includes("LOGO_ANIMATION") &&
        scene.scene_number > 1;
      return (
        <LogoAnimation
          key={key}
          durationInFrames={durationInFrames}
          variant={isOutroScene ? "outro" : "intro"}
          logoSrc={logo ?? undefined}
          name={name}
          tagline={tagline}
          primaryColor={primary}
          accentColor={accent}
          textColor={text}
          fontFamily={font}
          intensity={intensity}
        />
      );
    }

    case "INFOGRAPHIC_ANIMATION":
      return (
        <InfographicAnimation
          key={key}
          type="counter"
          data={[{ label: "%", value: 90, color: accent }]}
          title="Retention Rate"
          durationInFrames={durationInFrames}
          accentColor={accent}
          textColor={text}
          fontFamily={font}
          intensity={intensity}
        />
      );

    default:
      return null;
  }
}

// ── SceneRenderer ─────────────────────────────────────────────────────────────

export const SceneRenderer: React.FC<SceneRendererProps> = ({ scene, brand }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // Scene-level fade in/out
  const sceneOpacity = interpolate(frame, [0, Math.round(fps * 0.2)], [0.6, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const background = visualToBackground(scene.visual);
  const isLightBg = scene.visual.toLowerCase().includes("white") ||
    scene.visual.toLowerCase().includes("light") ||
    scene.visual.toLowerCase().includes("clean");

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* ── Background ─────────────────────────────────────────── */}
      <AbsoluteFill style={{ background }} />

      {/* ── Motion graphics stack ──────────────────────────────── */}
      {scene.motion_graphics.map((motionType, i) =>
        renderMotionComponent(motionType, scene, durationInFrames, brand, `${motionType}-${i}`)
      )}

      {/* ── Scene number debug badge (dev only) ─────────────────── */}
      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            fontFamily: "monospace",
            fontSize: 12,
            padding: "4px 8px",
            borderRadius: 4,
            pointerEvents: "none",
          }}
        >
          Scene {scene.scene_number} · {scene.transition} · {scene.motion_intensity}
        </div>
      )}
    </AbsoluteFill>
  );
};
