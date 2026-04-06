import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import data from "./composition-data.json";
import { TitleCard }  from "./TitleCard";
import { LowerThird } from "./LowerThird";
import { EndScreen }  from "./EndScreen";
import { Subtitles }  from "./Subtitles";

const FPS          = 30;
const TITLE_FRAMES = 3 * FPS;
const END_FRAMES   = 5 * FPS;
const SHOT_FRAMES  = 3 * FPS;
// Lower third shows for the first 1.5 seconds of a shot (45 frames)
const LOWER_THIRD_FRAMES = Math.floor(1.5 * FPS);

export const MainComposition = () => {
  const { shots, characters, brand, video_path } = data as any;
  const videoFrames = shots.length * SHOT_FRAMES;

  // Track frame offset of each character's first appearance for lower thirds
  const firstAppearanceFrame: Record<string, number> = {};
  shots.forEach((shot: any, i: number) => {
    (shot.characters || []).forEach((charId: string) => {
      if (!(charId in firstAppearanceFrame)) {
        firstAppearanceFrame[charId] = i * SHOT_FRAMES;
      }
    });
  });

  const charMap: Record<string, string> = {};
  (characters || []).forEach((c: any) => {
    charMap[c.character_id] = c.name;
  });

  return (
    <AbsoluteFill style={{ background: "#000" }}>

      {/* ── Title card (0 → TITLE_FRAMES) ─────────────────────────────── */}
      <Sequence from={0} durationInFrames={TITLE_FRAMES}>
        <TitleCard brand={brand} />
      </Sequence>

      {/* ── Main video + overlays (TITLE_FRAMES → TITLE_FRAMES + videoFrames) */}
      <Sequence from={TITLE_FRAMES} durationInFrames={videoFrames}>

        {/* Raw video */}
        <AbsoluteFill>
          <OffthreadVideo
            src={staticFile(video_path)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>

        {/* Subtitle per shot (only when dialogue exists) */}
        {shots.map((shot: any, i: number) =>
          shot.dialogue ? (
            <Sequence
              key={`sub-${shot.shot_id}`}
              from={i * SHOT_FRAMES}
              durationInFrames={SHOT_FRAMES}
            >
              <Subtitles text={shot.dialogue} brand={brand} />
            </Sequence>
          ) : null
        )}

        {/* Lower third on first appearance of each character */}
        {Object.entries(firstAppearanceFrame).map(([charId, fromFrame]) => {
          const name = charMap[charId];
          if (!name) return null;
          return (
            <Sequence
              key={`lt-${charId}`}
              from={fromFrame}
              durationInFrames={LOWER_THIRD_FRAMES}
            >
              <LowerThird name={name} brand={brand} />
            </Sequence>
          );
        })}

      </Sequence>

      {/* ── End screen (TITLE_FRAMES + videoFrames → end) ─────────────── */}
      <Sequence from={TITLE_FRAMES + videoFrames} durationInFrames={END_FRAMES}>
        <EndScreen brand={brand} />
      </Sequence>

    </AbsoluteFill>
  );
};
