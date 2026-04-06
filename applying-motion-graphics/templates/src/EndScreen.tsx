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

export const EndScreen = ({ brand }: { brand: Brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity    = spring({ frame, fps, from: 0, to: 1, durationInFrames: 18 });
  const logoScale  = spring({ frame, fps, from: 0.6, to: 1, durationInFrames: 28, config: { damping: 10 } });
  const textOpacity = spring({ frame, fps, from: 0, to: 1, durationInFrames: 22, config: { delay: 10 } });

  return (
    <AbsoluteFill
      style={{
        background:     brand.primary_color,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        fontFamily:     brand.font_family || "sans-serif",
        opacity,
        gap:            28,
      }}
    >
      {/* Decorative accent bar */}
      <div
        style={{
          position:   "absolute",
          top:        0,
          left:       0,
          right:      0,
          height:     8,
          background: brand.accent_color,
        }}
      />
      <div
        style={{
          position:   "absolute",
          bottom:     0,
          left:       0,
          right:      0,
          height:     8,
          background: brand.accent_color,
        }}
      />

      {brand.logo_filename && (
        <Img
          src={staticFile(brand.logo_filename)}
          style={{
            width:        300,
            height:       "auto",
            transform:    `scale(${logoScale})`,
            borderRadius: 20,
            boxShadow:    "0 20px 60px rgba(0,0,0,0.4)",
          }}
        />
      )}

      <div style={{ opacity: textOpacity, textAlign: "center" }}>
        <h2
          style={{
            color:      brand.text_color || "#fff",
            fontSize:   brand.logo_filename ? 52 : 68,
            fontWeight: 800,
            margin:     0,
            textShadow: "0 2px 12px rgba(0,0,0,0.3)",
          }}
        >
          {brand.institute_name}
        </h2>

        {brand.tagline && (
          <p
            style={{
              color:         brand.accent_color || "#FFD700",
              fontSize:      24,
              fontWeight:    400,
              marginTop:     14,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {brand.tagline}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};
