import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TheBoldFont } from "../load-font";

const YELLOW = "#FFE800";

// A punchy hook title over the opening seconds, before Step 1 kicks in.
// Pops in around 0.6s, holds, then drops out before the first step badge.
const IN_MS = 600;
const OUT_MS = 5200;

export const IntroHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;

  if (timeMs < IN_MS - 200 || timeMs > OUT_MS + 400) return null;

  const inFrames = frame - (IN_MS / 1000) * fps;
  const pop = spring({
    frame: inFrames,
    fps,
    config: { damping: 13, mass: 0.5, stiffness: 130 },
    durationInFrames: Math.round(fps * 0.5),
  });

  const out = interpolate(timeMs, [OUT_MS, OUT_MS + 350], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(pop, [0, 1], [0.7, 1]) * interpolate(out, [0, 1], [0.9, 1]);
  const opacity = Math.min(pop, out);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        fontFamily: TheBoldFont,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          textAlign: "center",
          textTransform: "uppercase",
          padding: "0 60px",
        }}
      >
        <div
          style={{
            fontSize: 58,
            color: YELLOW,
            WebkitTextStroke: "9px black",
            paintOrder: "stroke",
            letterSpacing: 2,
          }}
        >
          9 Steps To
        </div>
        <div
          style={{
            fontSize: 96,
            color: "white",
            WebkitTextStroke: "16px black",
            paintOrder: "stroke",
            lineHeight: 1.0,
            marginTop: 8,
          }}
        >
          Grow Your Instagram
        </div>
      </div>
    </AbsoluteFill>
  );
};
