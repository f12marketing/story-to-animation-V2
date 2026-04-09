import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export type KenBurnsVariant = "zoom-in" | "zoom-out" | "pan-right" | "pan-left" | "pan-up";

interface ShotSlideProps {
  imageSrc: string;
  variant: KenBurnsVariant;
  transitionFrames: number;
}

export const ShotSlide = ({ imageSrc, variant, transitionFrames }: ShotSlideProps) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Cross-fade: fade in over transitionFrames, hold, fade out over transitionFrames
  const opacity = interpolate(
    frame,
    [0, transitionFrames, durationInFrames - transitionFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Ken Burns effect
  const progress = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;
  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  switch (variant) {
    case "zoom-in":
      scale = 1 + 0.15 * progress;
      break;
    case "zoom-out":
      scale = 1.15 - 0.15 * progress;
      break;
    case "pan-right":
      scale = 1.1;
      translateX = interpolate(progress, [0, 1], [-3, 3]);
      break;
    case "pan-left":
      scale = 1.1;
      translateX = interpolate(progress, [0, 1], [3, -3]);
      break;
    case "pan-up":
      scale = 1.1;
      translateY = interpolate(progress, [0, 1], [3, -3]);
      break;
  }

  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
      <Img
        src={staticFile(imageSrc)}
        style={{
          width:           "100%",
          height:          "100%",
          objectFit:       "cover",
          transform:       `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
          transformOrigin: "center center",
          display:         "block",
        }}
      />
    </AbsoluteFill>
  );
};
