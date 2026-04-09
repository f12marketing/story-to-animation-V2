import {
  AbsoluteFill, Img, staticFile,
  spring, interpolate, useCurrentFrame, useVideoConfig,
} from "remotion";

interface Brand {
  institute_name: string;
  tagline:        string;
  primary_color:  string;
  accent_color:   string;
  text_color:     string;
  logo_filename:  string | null;
  font_family:    string;
}

const FINAL_VERSE = "The mind is the forerunner of all actions.\nAll deeds are led by mind, created by mind.";

export const EndScreen = ({ brand }: { brand: Brand }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const bgOp    = spring({ frame, fps, from: 0, to: 1, durationInFrames: 20 });
  const logoSc  = spring({ frame, fps, from: 0.5, to: 1, durationInFrames: 32, config: { damping: 9 } });
  const titleOp = spring({ frame: Math.max(0, frame - 12), fps, from: 0, to: 1, durationInFrames: 22 });
  const titleY  = spring({ frame: Math.max(0, frame - 12), fps, from: 30, to: 0, durationInFrames: 24 });
  const verseOp = spring({ frame: Math.max(0, frame - 28), fps, from: 0, to: 1, durationInFrames: 30 });
  const verseY  = spring({ frame: Math.max(0, frame - 28), fps, from: 20, to: 0, durationInFrames: 28 });
  const lineW   = spring({ frame: Math.max(0, frame - 20), fps, from: 0, to: 1, durationInFrames: 35, config: { damping: 18 } });
  const pulse   = 0.7 + 0.3 * Math.sin(frame * 0.12);
  const finalOp = frame > durationInFrames - 20
    ? interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 45%, ${brand.primary_color} 0%, #000 100%)`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: brand.font_family || "sans-serif",
      opacity: bgOp * finalOp, overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)", pointerEvents: "none" }} />

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, transparent, ${brand.accent_color}, transparent)`, boxShadow: `0 0 20px ${brand.accent_color}`, opacity: pulse }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, transparent, ${brand.accent_color}, transparent)`, boxShadow: `0 0 20px ${brand.accent_color}`, opacity: pulse }} />

      {[420, 580].map((size, i) => (
        <div key={i} style={{ position: "absolute", width: size, height: size, borderRadius: "50%", border: `1px solid ${brand.accent_color}`, opacity: 0.08 + 0.04 * pulse }} />
      ))}

      {brand.logo_filename && (
        <Img src={staticFile(brand.logo_filename)} style={{
          width: 140, height: "auto", borderRadius: 14,
          transform: `scale(${logoSc})`,
          boxShadow: `0 0 60px ${brand.accent_color}55, 0 10px 40px rgba(0,0,0,0.5)`,
          marginBottom: 20,
        }} />
      )}

      <div style={{ opacity: verseOp, transform: `translateY(${verseY}px)`, textAlign: "center", marginBottom: 24, maxWidth: 960, padding: "0 60px" }}>
        <div style={{ color: brand.accent_color, fontSize: 12, letterSpacing: 5, textTransform: "uppercase", marginBottom: 14, opacity: 0.9, fontWeight: 600 }}>
          Dhammapada · Citta Vagga
        </div>
        {FINAL_VERSE.split("\n").map((line, i) => (
          <p key={i} style={{
            color: brand.text_color || "#fff", fontSize: 24, fontWeight: 400, fontStyle: "italic",
            margin: i === 0 ? "0 0 6px" : 0, lineHeight: 1.6,
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          }}>
            {line}
          </p>
        ))}
      </div>

      <div style={{ width: `${lineW * 300}px`, height: 1, margin: "0 auto 22px", background: `linear-gradient(90deg, transparent, ${brand.accent_color}, transparent)`, boxShadow: `0 0 8px ${brand.accent_color}`, opacity: titleOp }} />

      <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: "center" }}>
        <h2 style={{ color: brand.text_color || "#fff", fontSize: brand.logo_filename ? 48 : 64, fontWeight: 800, margin: "0 0 10px", textShadow: `0 0 40px ${brand.accent_color}44, 0 4px 16px rgba(0,0,0,0.5)`, letterSpacing: -0.5 }}>
          {brand.institute_name}
        </h2>
        {brand.tagline && (
          <p style={{ color: brand.accent_color, fontSize: 18, fontWeight: 400, margin: 0, letterSpacing: 5, textTransform: "uppercase", textShadow: `0 0 16px ${brand.accent_color}88` }}>
            {brand.tagline}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};
