import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// A quick white flash at every beat boundary — sells the cut, the way the
// inspo's beat changes have a snap to them instead of a plain crossfade.
// Brief and low-opacity on purpose: this reads as an edit choice, not a
// strobe.
export const CutFlash: React.FC<{
  readonly starts: number[];
}> = ({ starts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  let opacity = 0;
  for (const s of starts) {
    const local = t - s;
    if (local < -0.02 || local > 0.16) continue;
    const flash = interpolate(local, [-0.02, 0.02, 0.16], [0, 0.4, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    opacity = Math.max(opacity, flash);
  }

  if (opacity <= 0) return null;

  return (
    <AbsoluteFill
      style={{ backgroundColor: "white", opacity, pointerEvents: "none" }}
    />
  );
};
