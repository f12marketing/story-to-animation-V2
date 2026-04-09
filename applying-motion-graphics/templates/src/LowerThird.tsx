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

  const x      = spring({ frame, fps, from: -600, to: 0, durationInFrames: 22, config: { damping: 13 } });
  const barH   = spring({ frame, fps, from: 0, to: 1, durationInFrames: 16, config: { damping: 18 } });
  const textOp = spring({ frame: Math.max(0, frame - 8), fps, from: 0, to: 1, durationInFrames: 14 });

  const fadeFrames = 10;
  const fadeStart  = durationInFrames - fadeFrames;
  const opacity    = frame >= fadeStart ? 1 - (frame - fadeStart) / fadeFrames : 1;

  return (
    <AbsoluteFill style={{
      display: "flex", alignItems: "flex-end", justifyContent: "flex-start",
      padding: "0 72px 100px", pointerEvents: "none",
    }}>
      <div style={{ transform: `translateX(${x}px)`, opacity, display: "flex", alignItems: "stretch" }}>
        <div style={{
          width: 5,
          height: `${barH * 58}px`,
          background: brand.accent_color || "#FFD700",
          marginRight: 0,
          borderRadius: "2px 0 0 2px",
          boxShadow: `0 0 12px ${brand.accent_color}`,
          alignSelf: "center",
        }} />
        <div style={{
          background: `linear-gradient(90deg, ${brand.primary_color}f2, ${brand.primary_color}cc)`,
          padding: "10px 26px 10px 20px",
          borderRadius: "0 6px 6px 0",
          backdropFilter: "blur(8px)",
          opacity: textOp,
          borderTop: `1px solid ${brand.accent_color}33`,
          borderBottom: `1px solid ${brand.accent_color}33`,
        }}>
          <div style={{
            color: brand.accent_color, fontSize: 11, fontWeight: 700,
            letterSpacing: 3, textTransform: "uppercase", marginBottom: 3,
            fontFamily: brand.font_family || "sans-serif", opacity: 0.9,
          }}>
            Character
          </div>
          <span style={{
            color: brand.text_color || "#fff", fontSize: 28, fontWeight: 700,
            letterSpacing: 0.5, fontFamily: brand.font_family || "sans-serif",
            textShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}>
            {name}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
