import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TheBoldFont } from "../load-font";

// The HOOK TEXT OVERLAY from the reel framework: one line, burned in, has to
// land with the sound off. Sits centered over the opening seconds, then clears
// out of the way so the captions carry the rest.
export const HookOverlay: React.FC<{
  readonly text: string;
  readonly brandColor: string;
  /** When the hook clears, in seconds. */
  readonly outSeconds?: number;
}> = ({ text, brandColor, outSeconds = 4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;
  const outMs = outSeconds * 1000;

  if (!text || timeMs > outMs + 500) return null;

  const pop = spring({
    frame: frame - Math.round(fps * 0.2),
    fps,
    config: { damping: 13, mass: 0.5, stiffness: 130 },
    durationInFrames: Math.round(fps * 0.5),
  });

  const out = interpolate(timeMs, [outMs, outMs + 400], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(pop, out);
  const scale = interpolate(pop, [0, 1], [0.75, 1]);
  const y = interpolate(out, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        fontFamily: TheBoldFont,
        padding: "0 70px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${y}px) scale(${scale})`,
          textAlign: "center",
          textTransform: "uppercase",
          fontSize: 78,
          lineHeight: 1.06,
          color: "white",
          WebkitTextStroke: "16px black",
          paintOrder: "stroke",
          filter: "drop-shadow(0 14px 28px rgba(0,0,0,0.5))",
        }}
      >
        {text}
      </div>
      {/* brand underline accent */}
      <div
        style={{
          opacity,
          marginTop: 28,
          width: 170,
          height: 14,
          borderRadius: 10,
          background: brandColor,
          border: "5px solid black",
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};
