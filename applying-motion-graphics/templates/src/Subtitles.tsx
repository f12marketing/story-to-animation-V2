import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface Brand {
  accent_color:  string;
  text_color:    string;
  font_family:   string;
  primary_color: string;
}

export const Subtitles = ({ text, brand }: { text: string; brand: Brand }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const slideY = spring({ frame, fps, from: 30, to: 0, durationInFrames: 12, config: { damping: 14 } });
  const opacity = spring({ frame, fps, from: 0, to: 1, durationInFrames: 10 });

  const fadeFrames = 8;
  const fadeStart  = durationInFrames - fadeFrames;
  const finalOp    = frame >= fadeStart
    ? opacity * (1 - (frame - fadeStart) / fadeFrames)
    : opacity;

  const isVerse = text.length > 60;

  return (
    <AbsoluteFill style={{
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      padding: isVerse ? "0 80px 40px" : "0 120px 50px",
      pointerEvents: "none",
    }}>
      <div style={{
        opacity: finalOp,
        transform: `translateY(${slideY}px)`,
        background: isVerse
          ? `linear-gradient(180deg, ${brand.primary_color}e8 0%, ${brand.primary_color}f5 100%)`
          : "rgba(0,0,0,0.78)",
        backdropFilter: "blur(10px)",
        borderRadius: isVerse ? 10 : 8,
        padding: isVerse ? "20px 40px 22px" : "12px 28px",
        borderLeft:   isVerse ? `4px solid ${brand.accent_color}` : "none",
        borderBottom: isVerse ? "none" : `3px solid ${brand.accent_color}`,
        maxWidth: isVerse ? "88%" : "80%",
        textAlign: "center",
        boxShadow: `0 4px 30px rgba(0,0,0,0.5), 0 0 20px ${brand.accent_color}22`,
      }}>
        {isVerse && (
          <div style={{
            color: brand.accent_color, fontSize: 13, fontWeight: 600,
            letterSpacing: 4, textTransform: "uppercase", marginBottom: 8,
            opacity: 0.85, fontFamily: brand.font_family || "sans-serif",
          }}>
            Dhammapada
          </div>
        )}
        <span style={{
          color: brand.text_color || "#fff",
          fontSize: isVerse ? 28 : 34,
          fontWeight: isVerse ? 400 : 500,
          lineHeight: isVerse ? 1.65 : 1.45,
          fontFamily: brand.font_family || "sans-serif",
          fontStyle: isVerse ? "italic" : "normal",
          textShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}>
          {text}
        </span>
      </div>
    </AbsoluteFill>
  );
};
