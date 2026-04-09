import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { SceneRenderer } from "./components/SceneRenderer";
import { Brand, VideoPlan } from "./types/video";

interface VideoPlayerProps {
  plan: VideoPlan;
  brand?: Brand;
}

/**
 * VideoPlayer — the scene-based Remotion composition.
 *
 * Accepts a `VideoPlan` (array of Scenes) and maps each scene to a
 * <Sequence> block, with automatic frame offset calculation.
 *
 * Duration is driven by `calculateMetadata` in Root.tsx so the
 * composition length always matches the sum of scene durations.
 *
 * Usage:
 *   npx remotion render src/index.ts VideoComposition output.mp4
 *   npx remotion render src/index.ts VideoComposition output.mp4 \
 *     --props='{"plan": [...]}'
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({ plan, brand }) => {
  const { fps } = useVideoConfig();

  // Pre-compute cumulative frame offsets once per render (no state mutation)
  const scenes = plan.reduce<{ from: number; frames: number; index: number }[]>(
    (acc, scene, i) => {
      const frames = Math.max(1, Math.round(scene.duration * fps));
      const from = acc.length > 0 ? acc[acc.length - 1].from + acc[acc.length - 1].frames : 0;
      return [...acc, { from, frames, index: i }];
    },
    []
  );

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {scenes.map(({ from, frames, index }) => (
        <Sequence
          key={`scene-${plan[index].scene_number}`}
          from={from}
          durationInFrames={frames}
          name={`Scene ${plan[index].scene_number}: ${plan[index].purpose}`}
        >
          <SceneRenderer scene={plan[index]} brand={brand} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
