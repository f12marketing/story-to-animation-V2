import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface Brand {
  primary_color: string;
  accent_color:  string;
  text_color:    string;
  font_family:   string;
}

export const LowerThird = ({ name, brand }: { name: string; brand: Brand }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Slide in from left
  const x = spring({ frame, fps, from: -500, to: 0, durationInFrames: 18, config: { damping: 14 } });

  // Fade out near the end of this sequence
  const fadeFrames = 8;
  const fadeStart  = durationInFrames - fadeFrames;
  const opacity    = frame >= fadeStart ? 1 - (frame - fadeStart) / fadeFrames : 1;

  return (
    <AbsoluteFill
      style={{
        display:        "flex",
        alignItems:     "flex-end",
        justifyContent: "flex-start",
        padding:        "0 80px 110px",
        pointerEvents:  "none",
      }}
    >
      <div
        style={{
          transform:  `translateX(${x}px)`,
          opacity,
          display:    "flex",
          alignItems: "center",
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            width:        7,
            height:       52,
            background:   brand.accent_color || "#FFD700",
            marginRight:  14,
            borderRadius: 2,
          }}
        />
        {/* Name plate */}
        <div
          style={{
            background:   `${brand.primary_color}e8`,
            padding:      "10px 22px",
            borderRadius: 4,
            backdropFilter: "blur(4px)",
          }}
        >
          <span
            style={{
              color:       brand.text_color || "#fff",
              fontSize:    30,
              fontWeight:  700,
              letterSpacing: 0.5,
              fontFamily:  brand.font_family || "sans-serif",
            }}
          >
            {name}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
