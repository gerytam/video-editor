import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TheBoldFont } from "../load-font";
import { BEATS, stepsRevealed, TOTAL_STEPS } from "./beats";

// Deliberately quiet: a hairline progress bar and a small step counter.
// Its job is to signal "there's a finite list here, stay for it" without
// adding clutter. It eases between steps rather than jumping.
export const ProgressRail: React.FC<{ readonly accent: string }> = ({
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  const n = stepsRevealed(t);
  // Smoothly approach the next step's share rather than stepping hard.
  const current = BEATS.find((b) => b.n === n);
  const next = BEATS.find((b) => b.n === n + 1);
  const from = n / TOTAL_STEPS;
  const to = (n + 1) / TOTAL_STEPS;
  const segStart = current ? current.t : 0;
  const segEnd = next ? next.t : durationInFrames / fps;
  const p =
    segEnd > segStart
      ? interpolate(t, [segStart, segEnd], [from, to], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : from;

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 8,
          background: "rgba(255,255,255,0.16)",
        }}
      >
        <div
          style={{
            width: `${p * 100}%`,
            height: "100%",
            background: accent,
          }}
        />
      </div>

      {n > 0 ? (
        <div
          style={{
            position: "absolute",
            top: 42,
            right: 40,
            fontFamily: TheBoldFont,
            fontSize: 30,
            color: "#fff",
            WebkitTextStroke: "7px #000",
            paintOrder: "stroke",
            letterSpacing: 1,
          }}
        >
          {n}/{TOTAL_STEPS}
        </div>
      ) : null}
    </>
  );
};
