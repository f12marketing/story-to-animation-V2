import { Composition } from "remotion";
import { MainComposition } from "./MainComposition";
import data from "./composition-data.json";

const FPS          = 30;
const TITLE_FRAMES = 3 * FPS;   // 3-second title card
const END_FRAMES   = 5 * FPS;   // 5-second end screen
const SHOT_FRAMES  = 3 * FPS;   // each shot is 3 seconds

const videoFrames = data.shots.length * SHOT_FRAMES;
const totalFrames = TITLE_FRAMES + videoFrames + END_FRAMES;

export const RemotionRoot = () => (
  <Composition
    id="MainComposition"
    component={MainComposition}
    durationInFrames={totalFrames}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
