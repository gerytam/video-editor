import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Baloo2ExtraBold } from "./font";
import { AccentText } from "./AccentText";
import {
  fontSizeForBeat,
  LINE_HEIGHT,
  SAFE_ZONE,
  TextBeat,
} from "./beats";

// One text beat, anchored bottom-left of the safe area and growing upward —
// the text does the hooking/teaching here, the b-roll is ambient support.
export const TextBeatCard: React.FC<{
  readonly beat: TextBeat;
  readonly primaryColor: string;
  readonly accentColor: string;
  /** Full crossfade width between adjacent beats, in seconds. */
  readonly crossfadeSec: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
}> = ({ beat, primaryColor, accentColor, crossfadeSec, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const local = t - beat.startSec;
  // First/last beat get a fuller pop rather than a half-crossfade against
  // nothing.
  const fadeIn = isFirst ? 0.28 : crossfadeSec;
  const fadeOut = isLast ? 0.28 : crossfadeSec;

  if (local < -fadeIn || local > beat.holdSec + fadeOut) return null;

  const inP = spring({
    frame: Math.round(local * fps),
    fps,
    config: { damping: 16, mass: 0.45, stiffness: 150 },
    durationInFrames: Math.max(1, Math.round(fadeIn * fps)),
  });
  const outP = interpolate(
    local,
    [beat.holdSec - fadeOut, beat.holdSec],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const opacity = Math.min(inP, 1 - outP);
  const y = interpolate(inP, [0, 1], [24, 0]) + interpolate(outP, [0, 1], [0, -18]);

  return (
    <div
      style={{
        position: "absolute",
        left: SAFE_ZONE.leftMargin,
        right: SAFE_ZONE.rightReserved,
        bottom: SAFE_ZONE.bottomReserved,
        top: SAFE_ZONE.topMargin + 160,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "flex-start",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          fontFamily: Baloo2ExtraBold,
          fontSize: fontSizeForBeat(beat.text),
          lineHeight: LINE_HEIGHT,
          color: primaryColor,
          textAlign: "left",
          filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.5))",
        }}
      >
        <AccentText
          text={beat.text}
          accentPhrase={beat.accentPhrase}
          accentColor={accentColor}
        />
      </div>
    </div>
  );
};
