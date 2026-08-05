import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { STEPS } from "./steps";

// Gives the footage a quick "punch-in" zoom on every step transition (and on
// the very first frame) — a small energetic scale bump that settles back.
// Purely visual; wraps the <OffthreadVideo>.
export const ZoomPunch: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;

  // Punch moments: the intro (0) plus every step start.
  const punchMs = [0, ...STEPS.map((s) => s.startMs)];

  // Most recent punch moment at or before now.
  let lastPunch = 0;
  for (const p of punchMs) {
    if (timeMs >= p) lastPunch = p;
    else break;
  }

  const framesSincePunch = frame - (lastPunch / 1000) * fps;

  // Spring from 0->1 over ~0.45s; map to a scale bump 1.08 -> 1.0.
  const progress = spring({
    frame: framesSincePunch,
    fps,
    config: { damping: 14, mass: 0.4, stiffness: 130 },
    durationInFrames: Math.round(fps * 0.45),
  });

  const scale = 1.08 - 0.08 * progress;

  return (
    <AbsoluteFill style={{ transform: `scale(${scale})` }}>
      {children}
    </AbsoluteFill>
  );
};
