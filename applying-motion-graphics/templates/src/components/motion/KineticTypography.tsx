import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { INTENSITY_SPRING, MotionIntensity } from "../../types/video";

interface KineticTypographyProps {
  text: string;
  durationInFrames: number;
  position?: "top" | "center" | "bottom";
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  intensity?: MotionIntensity;
}

export const KineticTypography: React.FC<KineticTypographyProps> = ({
  text,
  durationInFrames,
  position = "bottom",
  fontSize = 72,
  color = "#ffffff",
  fontFamily = "Inter, sans-serif",
  intensity = "medium",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const springCfg = INTENSITY_SPRING[intensity];

  const words = text.trim().split(/\s+/);
  const framesPerWord = Math.max(4, Math.floor((durationInFrames * 0.7) / words.length));

  // Fade out last 12 frames
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const justifyMap = { top: "flex-start", center: "center", bottom: "flex-end" };
  const paddingMap = { top: "10%", center: "0", bottom: "12%" };

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: justifyMap[position],
        alignItems: "center",
        paddingBottom: paddingMap[position],
        pointerEvents: "none",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: `0 ${fontSize * 0.28}px`,
          maxWidth: "85%",
          lineHeight: 1.25,
        }}
      >
        {words.map((word, i) => {
          const delay = i * framesPerWord;
          const wordFrame = Math.max(0, frame - delay);

          const sc = spring({ frame: wordFrame, fps, config: springCfg });
          const opacity = interpolate(wordFrame, [0, 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const translateY = interpolate(wordFrame, [0, 10], [fontSize * 0.5, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <span
              key={i}
              style={{
                fontFamily,
                fontSize,
                fontWeight: 800,
                color,
                opacity,
                display: "inline-block",
                transform: `translateY(${translateY}px) scale(${sc})`,
                textShadow: "0 2px 20px rgba(0,0,0,0.6)",
                letterSpacing: "-0.02em",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
