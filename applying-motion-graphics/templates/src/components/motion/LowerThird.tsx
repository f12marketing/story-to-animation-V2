import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { INTENSITY_SPRING, MotionIntensity } from "../../types/video";

type LowerThirdPosition = "bottom-left" | "bottom-right" | "bottom-center";

interface LowerThirdProps {
  title: string;
  subtitle?: string;
  durationInFrames: number;
  position?: LowerThirdPosition;
  accentColor?: string;
  bgColor?: string;
  textColor?: string;
  fontFamily?: string;
  intensity?: MotionIntensity;
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  title,
  subtitle,
  durationInFrames,
  position = "bottom-left",
  accentColor = "#c8860a",
  bgColor = "#1a1a2e",
  textColor = "#ffffff",
  fontFamily = "Inter, sans-serif",
  intensity = "medium",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const springCfg = INTENSITY_SPRING[intensity];

  // Slide in
  const slideX = spring({ frame, fps, config: springCfg });
  const translateX = interpolate(slideX, [0, 1], [-520, 0]);

  // Bar height
  const barH = spring({ frame, fps, config: { ...springCfg, damping: springCfg.damping + 4 } });
  const barHeight = interpolate(barH, [0, 1], [0, subtitle ? 72 : 56]);

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 14, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const alignMap: Record<LowerThirdPosition, React.CSSProperties["alignItems"]> = {
    "bottom-left": "flex-start",
    "bottom-right": "flex-end",
    "bottom-center": "center",
  };

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: alignMap[position],
        padding: "0 80px 72px",
        pointerEvents: "none",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          transform: `translateX(${translateX}px)`,
          overflow: "hidden",
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            width: 5,
            height: barHeight,
            background: accentColor,
            borderRadius: "4px 0 0 4px",
            flexShrink: 0,
          }}
        />

        {/* Text box */}
        <div
          style={{
            background: bgColor,
            backdropFilter: "blur(8px)",
            padding: "10px 20px",
            borderRadius: "0 6px 6px 0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minWidth: 280,
          }}
        >
          {subtitle && (
            <span
              style={{
                fontFamily,
                fontSize: 14,
                fontWeight: 600,
                color: accentColor,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: 3,
              }}
            >
              {subtitle}
            </span>
          )}
          <span
            style={{
              fontFamily,
              fontSize: 26,
              fontWeight: 700,
              color: textColor,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
