import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { MotionIntensity } from "../../types/video";

interface ProgressBarProps {
  durationInFrames: number;
  /** Where the bar sits */
  position?: "top" | "bottom";
  /** Fixed end value 0–100; if omitted, animates from 0→100 over duration */
  progress?: number;
  color?: string;
  bgColor?: string;
  height?: number;
  showLabel?: boolean;
  intensity?: MotionIntensity;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  durationInFrames,
  position = "top",
  progress,
  color = "#c8860a",
  bgColor = "rgba(255,255,255,0.12)",
  height = 4,
  showLabel = false,
  intensity = "medium",
}) => {
  const frame = useCurrentFrame();

  const speedMap: Record<MotionIntensity, number> = { low: 0.6, medium: 1, high: 1.5 };
  const speed = speedMap[intensity];

  // Animate progress: either fixed target or auto 0→100
  const targetPct = progress ?? 100;
  const animDuration = durationInFrames * speed;
  const currentPct = interpolate(frame, [0, animDuration], [0, targetPct], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade in/out
  const fadeIn = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const yPos = position === "top" ? 0 : undefined;
  const yBot = position === "bottom" ? 0 : undefined;

  return (
    <AbsoluteFill
      style={{ pointerEvents: "none", opacity: fadeIn * fadeOut }}
    >
      {/* Track */}
      <div
        style={{
          position: "absolute",
          top: yPos,
          bottom: yBot,
          left: 0,
          right: 0,
          height,
          background: bgColor,
        }}
      />
      {/* Fill */}
      <div
        style={{
          position: "absolute",
          top: yPos,
          bottom: yBot,
          left: 0,
          width: `${currentPct}%`,
          height,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 8px ${color}88`,
          transition: "none",
        }}
      />
      {/* Label */}
      {showLabel && (
        <div
          style={{
            position: "absolute",
            top: position === "top" ? height + 6 : undefined,
            bottom: position === "bottom" ? height + 6 : undefined,
            right: 16,
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            color: color,
            fontWeight: 700,
          }}
        >
          {Math.round(currentPct)}%
        </div>
      )}
    </AbsoluteFill>
  );
};
