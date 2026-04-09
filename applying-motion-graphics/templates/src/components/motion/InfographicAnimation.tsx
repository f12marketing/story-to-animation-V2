import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { INTENSITY_SPRING, MotionIntensity } from "../../types/video";

type InfographicType = "counter" | "bar" | "pie" | "list";

interface DataPoint {
  label: string;
  value: number | string;
  color?: string;
}

interface InfographicAnimationProps {
  type: InfographicType;
  data: DataPoint[];
  title?: string;
  durationInFrames: number;
  accentColor?: string;
  textColor?: string;
  fontFamily?: string;
  intensity?: MotionIntensity;
}

export const InfographicAnimation: React.FC<InfographicAnimationProps> = ({
  type,
  data,
  title,
  durationInFrames,
  accentColor = "#c8860a",
  textColor = "#ffffff",
  fontFamily = "Inter, sans-serif",
  intensity = "medium",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const springCfg = INTENSITY_SPRING[intensity];

  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const containerEntry = spring({ frame, fps, config: springCfg });
  const containerOp = interpolate(containerEntry, [0, 1], [0, 1]);
  const containerY = interpolate(containerEntry, [0, 1], [40, 0]);

  const firstDataValue = typeof data[0]?.value === "number" ? (data[0].value as number) : 100;

  // ── Counter ────────────────────────────────────────────────────────────────
  if (type === "counter") {
    const currentVal = interpolate(frame, [0, durationInFrames * 0.75], [0, firstDataValue], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return (
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: containerOp * fadeOut,
          pointerEvents: "none",
        }}
      >
        {title && (
          <p style={{ fontFamily, fontSize: 22, color: accentColor, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {title}
          </p>
        )}
        <div
          style={{
            fontFamily,
            fontSize: 120,
            fontWeight: 900,
            color: textColor,
            transform: `translateY(${containerY}px)`,
            lineHeight: 1,
            textShadow: `0 0 40px ${accentColor}66`,
          }}
        >
          {Math.round(currentVal)}
          <span style={{ fontSize: 48, color: accentColor, marginLeft: 8 }}>
            {data[0]?.label ?? ""}
          </span>
        </div>
      </AbsoluteFill>
    );
  }

  // ── Bar Chart ──────────────────────────────────────────────────────────────
  if (type === "bar") {
    const maxVal = Math.max(...data.map((d) => (typeof d.value === "number" ? d.value : 0)));

    return (
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: containerOp * fadeOut,
          pointerEvents: "none",
          padding: "0 15%",
        }}
      >
        {title && (
          <p style={{ fontFamily, fontSize: 24, color: accentColor, margin: "0 0 20px", fontWeight: 700 }}>
            {title}
          </p>
        )}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-end", height: 200, width: "100%" }}>
          {data.map((d, i) => {
            const delay = i * 8;
            const barSpring = spring({ frame: Math.max(0, frame - delay), fps, config: springCfg });
            const pct = ((typeof d.value === "number" ? d.value : 0) / maxVal) * 100;
            const barH = interpolate(barSpring, [0, 1], [0, pct * 2]);
            const barColor = d.color ?? accentColor;

            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily, fontSize: 16, color: textColor, fontWeight: 700 }}>
                  {d.value}
                </span>
                <div
                  style={{
                    width: "100%",
                    height: barH,
                    background: `linear-gradient(180deg, ${barColor}, ${barColor}88)`,
                    borderRadius: "4px 4px 0 0",
                    boxShadow: `0 0 12px ${barColor}66`,
                  }}
                />
                <span style={{ fontFamily, fontSize: 13, color: `${textColor}99`, textAlign: "center" }}>
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ── List ───────────────────────────────────────────────────────────────────
  if (type === "list") {
    return (
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          opacity: fadeOut,
          pointerEvents: "none",
          padding: "0 12%",
        }}
      >
        {title && (
          <p style={{ fontFamily, fontSize: 26, color: accentColor, margin: "0 0 20px", fontWeight: 700 }}>
            {title}
          </p>
        )}
        {data.map((d, i) => {
          const delay = i * 10;
          const itemSpring = spring({ frame: Math.max(0, frame - delay), fps, config: springCfg });
          const itemX = interpolate(itemSpring, [0, 1], [-60, 0]);
          const itemOp = interpolate(itemSpring, [0, 1], [0, 1]);
          const dotColor = d.color ?? accentColor;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 18,
                opacity: itemOp,
                transform: `translateX(${itemX}px)`,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: dotColor,
                  boxShadow: `0 0 8px ${dotColor}`,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontFamily, fontSize: 22, color: textColor, fontWeight: 600 }}>
                {d.label}
              </span>
              {d.value !== "" && (
                <span style={{ fontFamily, fontSize: 22, color: dotColor, fontWeight: 800, marginLeft: "auto" }}>
                  {d.value}
                </span>
              )}
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }

  // ── Pie (simplified as donut) ──────────────────────────────────────────────
  if (type === "pie") {
    const total = data.reduce((s, d) => s + (typeof d.value === "number" ? d.value : 0), 0);
    let cumulative = 0;
    const segments = data.map((d) => {
      const val = typeof d.value === "number" ? d.value : 0;
      const pct = val / total;
      const start = cumulative;
      cumulative += pct;
      return { ...d, pct, start };
    });

    const animPct = interpolate(frame, [0, durationInFrames * 0.7], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    const R = 90;
    const cx = 150;
    const cy = 150;
    const circumference = 2 * Math.PI * R;

    return (
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
          opacity: containerOp * fadeOut,
          pointerEvents: "none",
        }}
      >
        <div>
          {title && (
            <p style={{ fontFamily, fontSize: 22, color: accentColor, margin: "0 0 16px", fontWeight: 700 }}>
              {title}
            </p>
          )}
          <svg width={300} height={300} viewBox="0 0 300 300">
            {segments.map((seg, i) => {
              const visiblePct = Math.max(0, Math.min(1, (animPct - seg.start) / seg.pct));
              const strokeLen = visiblePct * seg.pct * circumference;
              const gapLen = circumference - strokeLen;
              const offset = -circumference * seg.start;
              const color = seg.color ?? (i === 0 ? accentColor : `hsl(${i * 60}, 60%, 55%)`);

              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={R}
                  fill="none"
                  stroke={color}
                  strokeWidth={40}
                  strokeDasharray={`${strokeLen} ${gapLen}`}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
                />
              );
            })}
            {/* Centre hole */}
            <circle cx={cx} cy={cy} r={50} fill="#000" />
          </svg>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {segments.map((seg, i) => {
            const color = seg.color ?? (i === 0 ? accentColor : `hsl(${i * 60}, 60%, 55%)`);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: color }} />
                <span style={{ fontFamily, fontSize: 18, color: textColor }}>
                  {seg.label}
                </span>
                <span style={{ fontFamily, fontSize: 18, color, fontWeight: 700, marginLeft: 6 }}>
                  {seg.value}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  return null;
};
