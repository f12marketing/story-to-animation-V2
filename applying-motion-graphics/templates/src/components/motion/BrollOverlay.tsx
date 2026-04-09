import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { INTENSITY_SPRING, MotionIntensity } from "../../types/video";

interface HighlightArea {
  /** CSS percentage strings */
  x: string;
  y: string;
  width: string;
  height: string;
}

interface BrollOverlayProps {
  durationInFrames: number;
  /** Area to spotlight/highlight */
  highlightArea?: HighlightArea;
  /** Optional label text */
  label?: string;
  accentColor?: string;
  textColor?: string;
  fontFamily?: string;
  intensity?: MotionIntensity;
}

export const BrollOverlay: React.FC<BrollOverlayProps> = ({
  durationInFrames,
  highlightArea = { x: "25%", y: "20%", width: "50%", height: "60%" },
  label,
  accentColor = "#c8860a",
  textColor = "#ffffff",
  fontFamily = "Inter, sans-serif",
  intensity = "medium",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const springCfg = INTENSITY_SPRING[intensity];

  const entrySpring = spring({ frame, fps, config: springCfg });

  // Border draws in
  const borderOpacity = interpolate(entrySpring, [0, 1], [0, 1]);
  const borderScale = interpolate(entrySpring, [0, 1], [0.88, 1]);

  // Label slides up
  const labelY = interpolate(entrySpring, [0, 1], [20, 0]);

  // Fade out
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Dim vignette outside highlight
  const dimOpacity = interpolate(frame, [0, 12], [0, 0.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Corner tick pulse
  const tickPulse = 0.85 + Math.sin(frame * 0.14) * 0.15;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: fadeOut }}>
      {/* Dim layer */}
      <AbsoluteFill
        style={{ background: "rgba(0,0,0,0.45)", opacity: dimOpacity }}
      />

      {/* Highlight box */}
      <div
        style={{
          position: "absolute",
          left: highlightArea.x,
          top: highlightArea.y,
          width: highlightArea.width,
          height: highlightArea.height,
          border: `2px solid ${accentColor}`,
          borderRadius: 6,
          opacity: borderOpacity,
          transform: `scale(${borderScale * tickPulse})`,
          transformOrigin: "center center",
          boxShadow: `0 0 20px ${accentColor}66, inset 0 0 30px ${accentColor}11`,
        }}
      />

      {/* Corner decorators — top-left */}
      <div
        style={{
          position: "absolute",
          left: `calc(${highlightArea.x} - 4px)`,
          top: `calc(${highlightArea.y} - 4px)`,
          width: 20,
          height: 20,
          borderTop: `3px solid ${accentColor}`,
          borderLeft: `3px solid ${accentColor}`,
          opacity: borderOpacity,
        }}
      />
      {/* Corner — bottom-right */}
      <div
        style={{
          position: "absolute",
          right: `calc(100% - (${highlightArea.x}) - ${highlightArea.width} - 4px)`,
          bottom: `calc(100% - (${highlightArea.y}) - ${highlightArea.height} - 4px)`,
          width: 20,
          height: 20,
          borderBottom: `3px solid ${accentColor}`,
          borderRight: `3px solid ${accentColor}`,
          opacity: borderOpacity,
        }}
      />

      {/* Label */}
      {label && (
        <div
          style={{
            position: "absolute",
            left: highlightArea.x,
            top: `calc(${highlightArea.y} + ${highlightArea.height} + 10px)`,
            background: accentColor,
            color: textColor,
            fontFamily,
            fontSize: 16,
            fontWeight: 700,
            padding: "4px 14px",
            borderRadius: 4,
            opacity: borderOpacity,
            transform: `translateY(${labelY}px)`,
            whiteSpace: "nowrap",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      )}
    </AbsoluteFill>
  );
};
