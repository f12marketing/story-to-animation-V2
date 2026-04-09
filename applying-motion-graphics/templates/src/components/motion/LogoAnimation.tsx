import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { INTENSITY_SPRING, MotionIntensity } from "../../types/video";

type LogoVariant = "intro" | "outro" | "watermark";

interface LogoAnimationProps {
  durationInFrames: number;
  variant?: LogoVariant;
  logoSrc?: string;
  name?: string;
  tagline?: string;
  primaryColor?: string;
  accentColor?: string;
  textColor?: string;
  fontFamily?: string;
  intensity?: MotionIntensity;
}

export const LogoAnimation: React.FC<LogoAnimationProps> = ({
  durationInFrames,
  variant = "intro",
  logoSrc,
  name = "",
  tagline = "",
  primaryColor = "#1a0a00",
  accentColor = "#c8860a",
  textColor = "#ffffff",
  fontFamily = "Inter, sans-serif",
  intensity = "medium",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const springCfg = INTENSITY_SPRING[intensity];

  // ── Watermark ─────────────────────────────────────────────────────────────
  if (variant === "watermark") {
    const opacity = interpolate(frame, [0, 10], [0, 0.35], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            bottom: 20,
            right: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity,
          }}
        >
          {logoSrc && (
            <Img
              src={staticFile(logoSrc)}
              style={{ height: 28, width: "auto", objectFit: "contain" }}
            />
          )}
          {name && (
            <span
              style={{
                fontFamily,
                fontSize: 14,
                fontWeight: 600,
                color: textColor,
                letterSpacing: "0.06em",
              }}
            >
              {name}
            </span>
          )}
        </div>
      </AbsoluteFill>
    );
  }

  // ── Intro / Outro ──────────────────────────────────────────────────────────
  const isIntro = variant === "intro";

  // Background fade
  const bgOpacity = isIntro
    ? interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  // Logo spring
  const logoEntry = spring({ frame: isIntro ? frame : frame, fps, config: springCfg });
  const logoScale = interpolate(logoEntry, [0, 1], [isIntro ? 0.4 : 1.1, 1]);
  const logoOp = interpolate(logoEntry, [0, 1], [0, 1]);

  // Name slide
  const nameEntry = spring({ frame: Math.max(0, frame - 12), fps, config: springCfg });
  const nameY = interpolate(nameEntry, [0, 1], [30, 0]);
  const nameOp = interpolate(nameEntry, [0, 1], [0, 1]);

  // Tagline
  const tagEntry = spring({ frame: Math.max(0, frame - 22), fps, config: springCfg });
  const tagOp = interpolate(tagEntry, [0, 1], [0, 1]);

  // Decorative accent line
  const lineW = interpolate(frame, [10, 30], [0, 260], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Outro fade
  const outroFade =
    !isIntro
      ? 1
      : interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  return (
    <AbsoluteFill style={{ opacity: outroFade, pointerEvents: "none" }}>
      {/* Background */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${primaryColor}ee 0%, #000 100%)`,
          opacity: bgOpacity,
        }}
      />

      {/* Content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          opacity: bgOpacity,
        }}
      >
        {logoSrc && (
          <Img
            src={staticFile(logoSrc)}
            style={{
              height: 120,
              width: "auto",
              objectFit: "contain",
              opacity: logoOp,
              transform: `scale(${logoScale})`,
            }}
          />
        )}

        {name && (
          <h1
            style={{
              fontFamily,
              fontSize: 56,
              fontWeight: 800,
              color: textColor,
              margin: 0,
              opacity: nameOp,
              transform: `translateY(${nameY}px)`,
              letterSpacing: "-0.02em",
              textAlign: "center",
            }}
          >
            {name}
          </h1>
        )}

        {/* Accent line */}
        <div
          style={{
            width: lineW,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          }}
        />

        {tagline && (
          <p
            style={{
              fontFamily,
              fontSize: 22,
              color: accentColor,
              margin: 0,
              opacity: tagOp,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            {tagline}
          </p>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
