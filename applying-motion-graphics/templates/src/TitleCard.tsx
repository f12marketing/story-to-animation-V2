import { AbsoluteFill, Img, staticFile, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface Brand {
  institute_name: string;
  tagline:        string;
  primary_color:  string;
  accent_color:   string;
  text_color:     string;
  logo_filename:  string | null;
  font_family:    string;
}

export const TitleCard = ({ brand }: { brand: Brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity  = spring({ frame, fps, from: 0, to: 1, durationInFrames: 20 });
  const titleY   = spring({ frame, fps, from: 40, to: 0, durationInFrames: 25 });
  const taglineY = spring({ frame, fps, from: 20, to: 0, durationInFrames: 30, config: { damping: 15 } });

  return (
    <AbsoluteFill
      style={{
        background:     `linear-gradient(145deg, ${brand.primary_color} 0%, ${brand.primary_color}cc 60%, ${brand.accent_color}22 100%)`,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        fontFamily:     brand.font_family || "sans-serif",
        opacity,
        gap:            32,
      }}
    >
      {brand.logo_filename && (
        <Img
          src={staticFile(brand.logo_filename)}
          style={{
            width:        220,
            height:       "auto",
            borderRadius: 16,
            boxShadow:    "0 8px 32px rgba(0,0,0,0.35)",
            marginBottom: 8,
          }}
        />
      )}

      <h1
        style={{
          color:      brand.text_color || "#fff",
          fontSize:   72,
          fontWeight: 800,
          margin:     0,
          textAlign:  "center",
          maxWidth:   1400,
          transform:  `translateY(${titleY}px)`,
          textShadow: "0 4px 24px rgba(0,0,0,0.4)",
          lineHeight: 1.15,
        }}
      >
        {brand.institute_name}
      </h1>

      {brand.tagline && (
        <p
          style={{
            color:          brand.accent_color || "#FFD700",
            fontSize:       30,
            fontWeight:     400,
            margin:         0,
            letterSpacing:  3,
            textTransform:  "uppercase",
            transform:      `translateY(${taglineY}px)`,
          }}
        >
          {brand.tagline}
        </p>
      )}
    </AbsoluteFill>
  );
};
