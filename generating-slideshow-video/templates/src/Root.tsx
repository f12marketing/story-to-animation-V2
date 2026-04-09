import { Composition } from "remotion";
import { SlideshowComposition } from "./SlideshowComposition";
import data from "./composition-data.json";

export const RemotionRoot = () => {
  const { shots, fps, transition_frames: transitionFrames } = data as any;

  const totalFrames = shots.reduce((acc: number, shot: any, i: number) => {
    const dur = Math.round(shot.duration_seconds * fps);
    return acc + dur - (i < shots.length - 1 ? transitionFrames : 0);
  }, 0);

  return (
    <Composition
      id="SlideshowComposition"
      component={SlideshowComposition}
      durationInFrames={totalFrames}
      fps={fps}
      width={1920}
      height={1080}
    />
  );
};
