import {
  AbsoluteFill, OffthreadVideo, Sequence, staticFile,
  spring, interpolate, useCurrentFrame, useVideoConfig,
} from "remotion";
import data from "./composition-data.json";
import { TitleCard }  from "./TitleCard";
import { LowerThird } from "./LowerThird";
import { EndScreen }  from "./EndScreen";
import { Subtitles }  from "./Subtitles";

const FPS                = 30;
const TITLE_FRAMES       = 5 * FPS;
const END_FRAMES         = 8 * FPS;
const SHOT_FRAMES        = 3 * FPS;
const LOWER_THIRD_FRAMES = Math.floor(2 * FPS);
const SCENE_TITLE_FRAMES = Math.floor(1.5 * FPS);

const TopBar = ({ brand }: { brand: any }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 48,
      opacity: op, pointerEvents: "none",
      background: "linear-gradient(180deg, rgba(0,0,0,0.72) 0%, transparent 100%)",
      display: "flex", alignItems: "center", padding: "0 32px",
      borderTop: `2px solid ${brand.accent_color}88`,
    }}>
      <span style={{
        color: brand.accent_color, fontSize: 11, fontWeight: 700,
        letterSpacing: 4, textTransform: "uppercase",
        fontFamily: brand.font_family || "sans-serif",
        textShadow: `0 0 10px ${brand.accent_color}88`,
      }}>
        Dhammapada &nbsp;·&nbsp; Citta Vagga &nbsp;·&nbsp; The Mind
      </span>
    </div>
  );
};

const SceneTitle = ({ title, brand }: { title: string; brand: any }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const op = frame < durationInFrames / 2
    ? spring({ frame, fps, from: 0, to: 1, durationInFrames: 10 })
    : interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateRight: "clamp" });
  const y = spring({ frame, fps, from: -20, to: 0, durationInFrames: 14, config: { damping: 14 } });
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{
        opacity: op, transform: `translateY(${y}px)`,
        background: `linear-gradient(90deg, transparent, ${brand.primary_color}d8, transparent)`,
        padding: "10px 60px",
        borderTop: `1px solid ${brand.accent_color}66`,
        borderBottom: `1px solid ${brand.accent_color}66`,
        textAlign: "center",
      }}>
        <div style={{ color: brand.accent_color, fontSize: 11, letterSpacing: 5, textTransform: "uppercase", fontWeight: 700, marginBottom: 4, fontFamily: brand.font_family || "sans-serif" }}>
          Scene
        </div>
        <div style={{ color: brand.text_color || "#fff", fontSize: 28, fontWeight: 600, fontFamily: brand.font_family || "sans-serif", textShadow: `0 2px 12px rgba(0,0,0,0.6), 0 0 20px ${brand.accent_color}44`, letterSpacing: 0.5 }}>
          {title}
        </div>
      </div>
    </div>
  );
};

const FlashTransition = ({ brand }: { brand: any }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 3, 7], [0.3, 0, 0], { extrapolateRight: "clamp" });
  return op > 0 ? <div style={{ position: "absolute", inset: 0, background: brand.accent_color, opacity: op, pointerEvents: "none" }} /> : null;
};

const Vignette = () => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
);

export const MainComposition = () => {
  const { shots, characters, brand, video_path } = data as any;
  const videoFrames = shots.length * SHOT_FRAMES;

  const firstAppearanceFrame: Record<string, number> = {};
  shots.forEach((shot: any, i: number) => {
    (shot.characters || []).forEach((charId: string) => {
      if (!(charId in firstAppearanceFrame)) firstAppearanceFrame[charId] = i * SHOT_FRAMES;
    });
  });

  const charMap: Record<string, string> = {};
  (characters || []).forEach((c: any) => { charMap[c.character_id] = c.name; });

  const sceneFirstShot: Record<number, number> = {};
  shots.forEach((shot: any, i: number) => {
    const sn = shot.scene_number;
    if (!(sn in sceneFirstShot)) sceneFirstShot[sn] = i;
  });

  return (
    <AbsoluteFill style={{ background: "#000" }}>

      <Sequence from={0} durationInFrames={TITLE_FRAMES}>
        <TitleCard brand={brand} />
      </Sequence>

      <Sequence from={TITLE_FRAMES} durationInFrames={videoFrames}>
        <AbsoluteFill>
          <OffthreadVideo src={staticFile(video_path)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>

        <Vignette />
        <TopBar brand={brand} />

        {shots.map((_shot: any, i: number) => (
          <Sequence key={`flash-${i}`} from={i * SHOT_FRAMES} durationInFrames={10}>
            <FlashTransition brand={brand} />
          </Sequence>
        ))}

        {Object.entries(sceneFirstShot).map(([, shotIdx]) => {
          const shot = shots[shotIdx as number];
          if (!shot?.scene_title) return null;
          return (
            <Sequence key={`stitle-${shotIdx}`} from={(shotIdx as number) * SHOT_FRAMES} durationInFrames={SCENE_TITLE_FRAMES}>
              <SceneTitle title={shot.scene_title} brand={brand} />
            </Sequence>
          );
        })}

        {shots.map((shot: any, i: number) =>
          shot.dialogue ? (
            <Sequence key={`sub-${shot.shot_id}`} from={i * SHOT_FRAMES} durationInFrames={SHOT_FRAMES}>
              <Subtitles text={shot.dialogue} brand={brand} />
            </Sequence>
          ) : null
        )}

        {Object.entries(firstAppearanceFrame).map(([charId, fromFrame]) => {
          const name = charMap[charId];
          if (!name) return null;
          return (
            <Sequence key={`lt-${charId}`} from={fromFrame} durationInFrames={LOWER_THIRD_FRAMES}>
              <LowerThird name={name} brand={brand} />
            </Sequence>
          );
        })}
      </Sequence>

      <Sequence from={TITLE_FRAMES + videoFrames} durationInFrames={END_FRAMES}>
        <EndScreen brand={brand} />
      </Sequence>

    </AbsoluteFill>
  );
};
