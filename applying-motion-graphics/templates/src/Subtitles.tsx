import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface Brand {
  accent_color: string;
  text_color:   string;
  font_family:  string;
}

export const Subtitles = ({ text, brand }: { text: string; brand: Brand }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Fade in
  const opacity = spring({ frame, fps, from: 0, to: 1, durationInFrames: 8 });

  // Fade out near end of shot
  const fadeFrames = 6;
  const fadeStart  = durationInFrames - fadeFrames;
  const finalOpacity = frame >= fadeStart
    ? opacity * (1 - (frame - fadeStart) / fadeFrames)
    : opacity;

  return (
    <AbsoluteFill
      style={{
        display:        "flex",
        alignItems:     "flex-end",
        justifyContent: "center",
        padding:        "0 120px 52px",
        pointerEvents:  "none",
      }}
    >
      <div
        style={{
          opacity:        finalOpacity,
          background:     "rgba(0, 0, 0, 0.72)",
          backdropFilter: "blur(6px)",
          borderRadius:   8,
          padding:        "12px 28px",
          borderBottom:   `3px solid ${brand.accent_color || "#FFD700"}`,
          maxWidth:       "82%",
          textAlign:      "center",
        }}
      >
        <span
          style={{
            color:      brand.text_color || "#fff",
            fontSize:   34,
            fontWeight: 500,
            lineHeight: 1.45,
            fontFamily: brand.font_family || "sans-serif",
          }}
        >
          {text}
        </span>
      </div>
    </AbsoluteFill>
  );
};
