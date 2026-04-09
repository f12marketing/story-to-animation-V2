import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { MotionIntensity } from "../../types/video";

type ShapeType = "circle" | "square" | "triangle" | "line";

interface ShapeDef {
  type?: ShapeType;
  color?: string;
  size?: number;
  /** CSS percentage strings, e.g. "20%" */
  position?: { x: string; y: string };
  opacity?: number;
}

interface ShapeAnimationProps {
  durationInFrames: number;
  shapes?: ShapeDef[];
  accentColor?: string;
  intensity?: MotionIntensity;
}

const DEFAULT_SHAPES: ShapeDef[] = [
  { type: "circle", size: 320, position: { x: "10%",  y: "15%" }, opacity: 0.08 },
  { type: "circle", size: 180, position: { x: "85%",  y: "70%" }, opacity: 0.12 },
  { type: "square", size: 120, position: { x: "75%",  y: "12%" }, opacity: 0.07 },
  { type: "line",   size: 400, position: { x: "50%",  y: "50%" }, opacity: 0.06 },
  { type: "circle", size: 60,  position: { x: "30%",  y: "80%" }, opacity: 0.15 },
  { type: "triangle", size: 100, position: { x: "60%", y: "25%" }, opacity: 0.08 },
];

const speedMap: Record<MotionIntensity, number> = { low: 0.4, medium: 0.8, high: 1.6 };

export const ShapeAnimation: React.FC<ShapeAnimationProps> = ({
  durationInFrames,
  shapes = DEFAULT_SHAPES,
  accentColor = "#c8860a",
  intensity = "medium",
}) => {
  const frame = useCurrentFrame();
  const speed = speedMap[intensity];

  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut, pointerEvents: "none" }}>
      {shapes.map((s, i) => {
        const t = frame * speed;
        const floatY = Math.sin(t * 0.05 + i * 1.2) * 18;
        const floatX = Math.cos(t * 0.04 + i * 0.9) * 12;
        const rotate = t * (i % 2 === 0 ? 0.3 : -0.2) + i * 45;

        const color = s.color ?? accentColor;
        const size = s.size ?? 100;
        const op = s.opacity ?? 0.1;
        const pos = s.position ?? { x: "50%", y: "50%" };

        const sharedStyle: React.CSSProperties = {
          position: "absolute",
          left: pos.x,
          top: pos.y,
          transform: `translate(-50%, -50%) translate(${floatX}px, ${floatY}px) rotate(${rotate}deg)`,
          opacity: op,
        };

        if (s.type === "circle") {
          return (
            <div
              key={i}
              style={{
                ...sharedStyle,
                width: size,
                height: size,
                borderRadius: "50%",
                border: `2px solid ${color}`,
              }}
            />
          );
        }

        if (s.type === "square") {
          return (
            <div
              key={i}
              style={{
                ...sharedStyle,
                width: size,
                height: size,
                border: `2px solid ${color}`,
                borderRadius: 6,
              }}
            />
          );
        }

        if (s.type === "triangle") {
          return (
            <div
              key={i}
              style={{
                ...sharedStyle,
                width: 0,
                height: 0,
                borderLeft: `${size * 0.5}px solid transparent`,
                borderRight: `${size * 0.5}px solid transparent`,
                borderBottom: `${size * 0.87}px solid ${color}`,
                border: undefined,
                opacity: op,
              }}
            />
          );
        }

        if (s.type === "line") {
          return (
            <div
              key={i}
              style={{
                ...sharedStyle,
                width: size,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
              }}
            />
          );
        }

        return null;
      })}
    </AbsoluteFill>
  );
};
