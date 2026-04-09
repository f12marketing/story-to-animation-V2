import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { INTENSITY_SPRING, MotionIntensity } from "../../types/video";

type CTAPosition = "bottom-center" | "center" | "bottom-right";

interface CTAAnimationProps {
  text: string;
  durationInFrames: number;
  position?: CTAPosition;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  showArrow?: boolean;
  intensity?: MotionIntensity;
}

export const CTAAnimation: React.FC<CTAAnimationProps> = ({
  text,
  durationInFrames,
  position = "bottom-center",
  backgroundColor = "#c8860a",
  textColor = "#ffffff",
  fontFamily = "Inter, sans-serif",
  showArrow = true,
  intensity = "medium",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const springCfg = INTENSITY_SPRING[intensity];

  // Entry spring
  const entrySpring = spring({ frame, fps, config: springCfg });
  const scale = interpolate(entrySpring, [0, 1], [0.3, 1]);
  const opacity = interpolate(entrySpring, [0, 1], [0, 1]);

  // Pulsing glow
  const pulse = Math.sin(frame * 0.12) * 0.15 + 0.85;

  // Arrow bounce
  const arrowX = Math.sin(frame * 0.18) * 4;

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 14, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const posStyles: Record<CTAPosition, React.CSSProperties> = {
    "bottom-center": {
      justifyContent: "flex-end",
      alignItems: "center",
      paddingBottom: "10%",
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
    "bottom-right": {
      justifyContent: "flex-end",
      alignItems: "flex-end",
      paddingBottom: "8%",
      paddingRight: "6%",
    },
  };

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        ...posStyles[position],
        pointerEvents: "none",
        opacity: opacity * fadeOut,
      }}
    >
      <button
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: backgroundColor,
          color: textColor,
          fontFamily,
          fontSize: 28,
          fontWeight: 700,
          padding: "18px 42px",
          borderRadius: 50,
          border: "none",
          cursor: "default",
          transform: `scale(${scale * pulse})`,
          boxShadow: `0 0 30px ${backgroundColor}88, 0 8px 24px rgba(0,0,0,0.4)`,
          letterSpacing: "0.02em",
        }}
      >
        {text}
        {showArrow && (
          <span
            style={{
              display: "inline-block",
              transform: `translateX(${arrowX}px)`,
              fontSize: 26,
            }}
          >
            →
          </span>
        )}
      </button>
    </AbsoluteFill>
  );
};
