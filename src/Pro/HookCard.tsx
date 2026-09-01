import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TheBoldFont } from "../load-font";
import { TOTAL_STEPS } from "./beats";

// Opening promise card. The speaker's first line is setup, so this states the
// payoff immediately — the viewer knows within a second what they're getting
// and how long it runs. Clears before the first step so it never competes
// with the captions.
const IN = 0.35;
const OUT = 4.1;

export const HookCard: React.FC<{ readonly accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  if (t > OUT + 0.5) return null;

  const inP = spring({
    frame: Math.round((t - IN) * fps),
    fps,
    config: { damping: 14, mass: 0.5, stiffness: 130 },
    durationInFrames: Math.round(fps * 0.5),
  });
  const outP = interpolate(t, [OUT, OUT + 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(inP, 1 - outP);
  const scale = interpolate(inP, [0, 1], [0.82, 1]);
  const y = interpolate(outP, [0, 1], [0, -60]);

  return (
    <AbsoluteFill
      style={{
        fontFamily: TheBoldFont,
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 250,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${y}px) scale(${scale})`,
          textAlign: "center",
          padding: "0 54px",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: accent,
            color: "#000",
            fontSize: 40,
            letterSpacing: 2,
            padding: "10px 26px",
            borderRadius: 14,
            border: "7px solid #000",
            marginBottom: 20,
          }}
        >
          {TOTAL_STEPS} STEPS
        </div>
        <div
          style={{
            fontSize: 86,
            lineHeight: 0.98,
            color: "#fff",
            WebkitTextStroke: "17px #000",
            paintOrder: "stroke",
            filter: "drop-shadow(0 14px 28px rgba(0,0,0,0.5))",
          }}
        >
          TO GET REAL
          <br />
          CLIENTS FROM
          <br />
          INSTAGRAM
        </div>
      </div>
    </AbsoluteFill>
  );
};
