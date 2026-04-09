import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { INTENSITY_SPRING, MotionIntensity } from "../../types/video";

type UIAnimationType = "click" | "scroll" | "hover" | "type";

interface UIAnimationProps {
  type?: UIAnimationType;
  durationInFrames: number;
  /** 0–100 percentage position */
  position?: { x: number; y: number };
  /** Text to type (for "type" mode) */
  text?: string;
  accentColor?: string;
  intensity?: MotionIntensity;
}

const CursorSVG: React.FC<{ color: string; scale: number }> = ({ color, scale }) => (
  <svg
    width={28 * scale}
    height={36 * scale}
    viewBox="0 0 28 36"
    fill="none"
    style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }}
  >
    <path d="M4 2L4 28L10 22L14.5 32L18 30.5L13.5 20.5L22 20.5L4 2Z" fill={color} stroke="#000" strokeWidth={1.5} />
  </svg>
);

export const UIAnimation: React.FC<UIAnimationProps> = ({
  type = "click",
  durationInFrames,
  position = { x: 50, y: 50 },
  text = "Hello World",
  accentColor = "#c8860a",
  intensity = "medium",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const springCfg = INTENSITY_SPRING[intensity];

  const fadeIn = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: "translate(-50%, -50%)",
    opacity: fadeIn * fadeOut,
    pointerEvents: "none",
  };

  // ── Click ────────────────────────────────────────────────────────────────
  if (type === "click") {
    const clickCycle = frame % 40;
    const isClicking = clickCycle > 20;
    const rippleProgress = isClicking
      ? interpolate(clickCycle - 20, [0, 20], [0, 1], { extrapolateRight: "clamp" })
      : 0;
    const rippleSize = interpolate(rippleProgress, [0, 1], [0, 100]);
    const rippleOpacity = interpolate(rippleProgress, [0, 0.5, 1], [0.6, 0.3, 0]);

    return (
      <div style={baseStyle}>
        {/* Ripple */}
        <div
          style={{
            position: "absolute",
            width: rippleSize,
            height: rippleSize,
            borderRadius: "50%",
            background: accentColor,
            opacity: rippleOpacity,
            transform: "translate(-50%, -50%)",
            left: "50%",
            top: "50%",
          }}
        />
        <CursorSVG color="#ffffff" scale={isClicking ? 0.85 : 1} />
      </div>
    );
  }

  // ── Hover ────────────────────────────────────────────────────────────────
  if (type === "hover") {
    const hoverBob = Math.sin(frame * 0.08) * 6;
    return (
      <div style={{ ...baseStyle, transform: `translate(-50%, calc(-50% + ${hoverBob}px))` }}>
        <CursorSVG color="#ffffff" scale={1} />
        <div
          style={{
            position: "absolute",
            top: -34,
            left: 20,
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            fontSize: 13,
            padding: "4px 10px",
            borderRadius: 4,
            whiteSpace: "nowrap",
            fontFamily: "Inter, sans-serif",
            border: `1px solid ${accentColor}`,
          }}
        >
          {text || "Hover"}
        </div>
      </div>
    );
  }

  // ── Scroll ───────────────────────────────────────────────────────────────
  if (type === "scroll") {
    const scrollY = interpolate(frame, [0, durationInFrames], [0, 200]);
    return (
      <div style={{ ...baseStyle, width: 14, height: 24 }}>
        <div
          style={{
            width: 14,
            height: 24,
            border: "2px solid rgba(255,255,255,0.7)",
            borderRadius: 8,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 4,
              height: 6,
              background: accentColor,
              borderRadius: 3,
              left: 3,
              top: interpolate(scrollY % 24, [0, 24], [3, 14]),
            }}
          />
        </div>
      </div>
    );
  }

  // ── Type ─────────────────────────────────────────────────────────────────
  if (type === "type") {
    const charsToShow = Math.floor(interpolate(frame, [0, durationInFrames * 0.8], [0, text.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }));
    const showCursor = frame % 30 < 18;

    return (
      <div
        style={{
          ...baseStyle,
          fontFamily: "monospace",
          fontSize: 28,
          color: "#fff",
          background: "rgba(0,0,0,0.55)",
          padding: "10px 18px",
          borderRadius: 6,
          border: `1px solid ${accentColor}`,
          whiteSpace: "nowrap",
        }}
      >
        {text.slice(0, charsToShow)}
        {showCursor && <span style={{ color: accentColor, fontWeight: 700 }}>|</span>}
      </div>
    );
  }

  return null;
};
