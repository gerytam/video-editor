import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TheBoldFont } from "../load-font";
import { activeStepIndex, STEPS, TOTAL_STEPS } from "./steps";

const YELLOW = "#FFE800";

// Big numbered step callout that pops in at the top on every step transition
// and stays for the duration of that step. Number lives in a yellow chip, the
// short label sits beside it — bold, uppercase, heavy outline (MrBeast style).
export const StepBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;

  const idx = activeStepIndex(timeMs);
  if (idx < 0) return null; // intro, before step one

  const step = STEPS[idx];
  const framesSinceStart = frame - (step.startMs / 1000) * fps;

  // Springy pop-in, re-triggered each time the step changes.
  const pop = spring({
    frame: framesSinceStart,
    fps,
    config: { damping: 13, mass: 0.5, stiffness: 130 },
    durationInFrames: Math.round(fps * 0.5),
  });

  const scale = interpolate(pop, [0, 1], [0.6, 1]);
  const translateY = interpolate(pop, [0, 1], [-40, 0]);
  const opacity = interpolate(pop, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 210,
        fontFamily: TheBoldFont,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          transform: `translateY(${translateY}px) scale(${scale})`,
          opacity,
        }}
      >
        {/* number chip */}
        <div
          style={{
            width: 108,
            height: 108,
            borderRadius: 26,
            background: YELLOW,
            border: "8px solid black",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 26px rgba(0,0,0,0.4)",
          }}
        >
          <span
            style={{
              fontSize: 64,
              color: "black",
              lineHeight: 1,
              marginTop: 6,
            }}
          >
            {step.n}
          </span>
        </div>

        {/* label */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            lineHeight: 1,
          }}
        >
          <span
            style={{
              fontSize: 26,
              color: YELLOW,
              WebkitTextStroke: "6px black",
              paintOrder: "stroke",
              letterSpacing: 2,
              marginBottom: 6,
            }}
          >
            STEP {step.n} OF {TOTAL_STEPS}
          </span>
          <span
            style={{
              fontSize: 46,
              color: "white",
              WebkitTextStroke: "10px black",
              paintOrder: "stroke",
              maxWidth: 620,
              textTransform: "uppercase",
            }}
          >
            {step.label}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
