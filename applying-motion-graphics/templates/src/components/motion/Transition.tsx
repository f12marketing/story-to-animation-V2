import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { INTENSITY_SPEED, MotionIntensity, TransitionType } from "../../types/video";

interface TransitionProps {
  type: TransitionType;
  /** Total frames allocated to this transition overlay */
  durationInFrames: number;
  /** "in" = entering this scene, "out" = leaving this scene */
  direction?: "in" | "out";
  accentColor?: string;
  intensity?: MotionIntensity;
}

export const Transition: React.FC<TransitionProps> = ({
  type,
  durationInFrames,
  direction = "in",
  accentColor = "#c8860a",
  intensity = "medium",
}) => {
  const frame = useCurrentFrame();
  const speed = INTENSITY_SPEED[intensity];
  const half = Math.round(durationInFrames / 2);
  const end = durationInFrames;

  // For "in": animate 1 → 0 (overlay disappears)
  // For "out": animate 0 → 1 (overlay appears)
  const progress =
    direction === "in"
      ? interpolate(frame, [0, Math.round(half * speed)], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : interpolate(frame, [Math.round((end - half) * speed), end], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  if (type === "fade") {
    return (
      <AbsoluteFill
        style={{ background: "#000", opacity: progress, pointerEvents: "none" }}
      />
    );
  }

  if (type === "zoom") {
    const scale = interpolate(progress, [0, 1], [1, 1.25]);
    return (
      <AbsoluteFill
        style={{
          background: "#000",
          opacity: progress,
          transform: `scale(${scale})`,
          pointerEvents: "none",
        }}
      />
    );
  }

  if (type === "whip") {
    const translateX = interpolate(progress, [0, 1], [0, -120]);
    return (
      <AbsoluteFill
        style={{
          background: "linear-gradient(90deg, #000 60%, transparent 100%)",
          opacity: progress,
          transform: `translateX(${translateX}%)`,
          pointerEvents: "none",
        }}
      />
    );
  }

  if (type === "glitch") {
    // Three offset layers cycling fast
    const slice = frame % 4;
    const offsetX = slice === 0 ? 8 : slice === 1 ? -6 : slice === 2 ? 4 : 0;
    const offsetY = slice === 0 ? -4 : slice === 1 ? 3 : slice === 2 ? -2 : 0;
    const hueR = slice === 0 ? 255 : 0;
    const hueB = slice === 1 ? 255 : 0;

    return (
      <AbsoluteFill style={{ opacity: progress, pointerEvents: "none" }}>
        {/* Red channel */}
        <AbsoluteFill
          style={{
            background: `rgba(${hueR},0,0,0.5)`,
            transform: `translate(${offsetX}px, ${offsetY}px)`,
            mixBlendMode: "screen",
          }}
        />
        {/* Blue channel */}
        <AbsoluteFill
          style={{
            background: `rgba(0,0,${hueB},0.5)`,
            transform: `translate(${-offsetX}px, ${-offsetY}px)`,
            mixBlendMode: "screen",
          }}
        />
        {/* Scanline */}
        <AbsoluteFill
          style={{
            background:
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 2px, transparent 2px, transparent 4px)",
          }}
        />
        {/* Base dark overlay */}
        <AbsoluteFill style={{ background: `rgba(0,0,0,${progress * 0.6})` }} />
        {/* Accent flash */}
        <AbsoluteFill
          style={{ background: accentColor, opacity: progress * 0.15 }}
        />
      </AbsoluteFill>
    );
  }

  return null;
};
