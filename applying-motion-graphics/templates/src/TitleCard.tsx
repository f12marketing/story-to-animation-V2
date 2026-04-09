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

const LotusRing = ({ accent, frame, fps }: { accent: string; frame: number; fps: number }) => {
  const scale  = spring({ frame, fps, from: 0.4, to: 1, durationInFrames: 50, config: { damping: 12 } });
  const rotate = interpolate(frame, [0, 300], [0, 360]);
  const op     = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      {[340, 500, 680].map((size, i) => (
        <div key={i} style={{
          position: "absolute", width: size, height: size, borderRadius: "50%",
          border: `${i === 0 ? 2 : 1}px solid ${accent}`,
          opacity: op * (0.22 - i * 0.06),
          transform: `scale(${scale}) rotate(${rotate * (i % 2 === 0 ? 1 : -1) * (0.2 + i * 0.1)}deg)`,
        }} />
      ))}
    </div>
  );
};

const Particles = ({ accent, frame }: { accent: string; frame: number }) =>
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    {Array.from({ length: 14 }, (_, i) => {
      const angle  = (i / 14) * 360 + frame * 0.35;
      const r      = 260 + Math.sin((frame + i * 25) * 0.05) * 50;
      const x = 50 + Math.cos((angle * Math.PI) / 180) * (r / 19.2);
      const y = 50 + Math.sin((angle * Math.PI) / 180) * (r / 10.8);
      const op = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" })
               * (0.25 + 0.5 * Math.abs(Math.sin(frame * 0.06 + i)));
      return <div key={i} style={{
        position: "absolute", left: `${x}%`, top: `${y}%`,
        width: 5, height: 5, borderRadius: "50%",
        background: accent, opacity: op,
        transform: "translate(-50%,-50%)",
        boxShadow: `0 0 8px 3px ${accent}88`,
      }} />;
    })}
  </div>;

export const TitleCard = ({ brand }: { brand: Brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOp      = spring({ frame, fps, from: 0, to: 1, durationInFrames: 15 });
  const lineW     = spring({ frame, fps, from: 0, to: 1, durationInFrames: 40, config: { damping: 20 } });
  const titleSc   = spring({ frame, fps, from: 0.7, to: 1, durationInFrames: 35, config: { damping: 11 } });
  const titleY    = spring({ frame, fps, from: 70, to: 0, durationInFrames: 32 });
  const taglineOp = spring({ frame: Math.max(0, frame - 20), fps, from: 0, to: 1, durationInFrames: 25 });
  const taglineY  = spring({ frame: Math.max(0, frame - 20), fps, from: 28, to: 0, durationInFrames: 28 });

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 38%, ${brand.primary_color} 0%, #000 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: brand.font_family || "sans-serif",
      opacity: bgOp, overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.65) 100%)", pointerEvents: "none" }} />
      <LotusRing accent={brand.accent_color} frame={frame} fps={fps} />
      <Particles accent={brand.accent_color} frame={frame} />

      {brand.logo_filename && (
        <Img src={staticFile(brand.logo_filename)} style={{
          width: 160, height: "auto", borderRadius: 14, marginBottom: 18,
          transform: `scale(${titleSc})`,
          boxShadow: `0 0 50px ${brand.accent_color}55, 0 8px 32px rgba(0,0,0,0.55)`,
        }} />
      )}

      <h1 style={{
        color: brand.text_color || "#fff", fontSize: 92, fontWeight: 900,
        margin: "0 0 6px", textAlign: "center", maxWidth: 1300,
        transform: `translateY(${titleY}px) scale(${titleSc})`,
        textShadow: `0 0 80px ${brand.accent_color}55, 0 6px 30px rgba(0,0,0,0.7)`,
        letterSpacing: -1, lineHeight: 1.1,
      }}>
        {brand.institute_name}
      </h1>

      <div style={{
        width: `${lineW * 380}px`, height: 2, margin: "14px auto 18px",
        background: `linear-gradient(90deg, transparent, ${brand.accent_color}, transparent)`,
        opacity: taglineOp,
        boxShadow: `0 0 12px ${brand.accent_color}`,
      }} />

      {brand.tagline && (
        <p style={{
          color: brand.accent_color || "#FFD700", fontSize: 24, fontWeight: 400,
          margin: 0, letterSpacing: 6, textTransform: "uppercase",
          opacity: taglineOp, transform: `translateY(${taglineY}px)`,
          textShadow: `0 0 24px ${brand.accent_color}88`,
        }}>
          {brand.tagline}
        </p>
      )}
    </AbsoluteFill>
  );
};
