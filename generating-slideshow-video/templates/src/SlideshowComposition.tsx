import { AbsoluteFill, Sequence } from "remotion";
import data from "./composition-data.json";
import { ShotSlide, KenBurnsVariant } from "./ShotSlide";

const VARIANTS: KenBurnsVariant[] = ["zoom-in", "zoom-out", "pan-right", "pan-left", "pan-up"];

export const SlideshowComposition = () => {
  const { shots, fps, transition_frames: transitionFrames } = data as any;

  // Calculate the start frame for each shot, accounting for cross-fade overlap
  let currentFrame = 0;
  const sequences: Array<{
    from: number;
    duration: number;
    shot: any;
    variant: KenBurnsVariant;
  }> = [];

  shots.forEach((shot: any, i: number) => {
    const duration = Math.round(shot.duration_seconds * fps);
    sequences.push({
      from:     currentFrame,
      duration,
      shot,
      variant:  VARIANTS[i % VARIANTS.length],
    });
    // Next shot starts before this one ends (overlap = cross-fade)
    currentFrame += duration - (i < shots.length - 1 ? transitionFrames : 0);
  });

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {sequences.map(({ from, duration, shot, variant }) => (
        <Sequence key={shot.shot_id} from={from} durationInFrames={duration}>
          <ShotSlide
            imageSrc={`composites/${shot.shot_id}.png`}
            variant={variant}
            transitionFrames={transitionFrames}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
