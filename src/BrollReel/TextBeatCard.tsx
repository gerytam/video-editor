import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BeatIcon } from "./BeatIcon";
import { Baloo2ExtraBold } from "./font";
import {
  fontSizeForBeat,
  LINE_HEIGHT,
  SAFE_ZONE,
  splitBeatText,
  TextBeat,
} from "./beats";

// One text beat: centered, stacked (primary line, then an accent-colored
// second line at the accent phrase), snappy pop-in/out timed to the cut.
export const TextBeatCard: React.FC<{
  readonly beat: TextBeat;
  readonly primaryColor: string;
  readonly accentColor: string;
  readonly onAccentColor: string;
  /** Full crossfade width between adjacent beats, in seconds. */
  readonly crossfadeSec: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
}> = ({
  beat,
  primaryColor,
  accentColor,
  onAccentColor,
  crossfadeSec,
  isFirst,
  isLast,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const local = t - beat.startSec;
  // First/last beat get a fuller pop rather than a half-crossfade against
  // nothing.
  const fadeIn = isFirst ? 0.22 : crossfadeSec;
  const fadeOut = isLast ? 0.18 : crossfadeSec;

  if (local < -fadeIn || local > beat.holdSec + fadeOut) return null;

  const inP = spring({
    frame: Math.round(local * fps),
    fps,
    config: { damping: 14, mass: 0.4, stiffness: 220 },
    durationInFrames: Math.max(1, Math.round(fadeIn * fps)),
  });
  const outP = interpolate(
    local,
    [beat.holdSec - fadeOut, beat.holdSec],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const opacity = Math.min(inP, 1 - outP);
  const scale =
    interpolate(inP, [0, 1], [0.82, 1]) * interpolate(outP, [0, 1], [1, 0.93]);
  const y =
    interpolate(inP, [0, 1], [26, 0]) + interpolate(outP, [0, 1], [0, -16]);

  const { primary, secondary } = splitBeatText(beat.text, beat.accentPhrase);
  const fontSize = fontSizeForBeat(beat.text);

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
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${y}px) scale(${scale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <BeatIcon
          name={beat.icon}
          localSec={local}
          fadeIn={fadeIn}
          accentColor={accentColor}
          onAccentColor={onAccentColor}
        />

        {primary ? (
          <div
            style={{
              fontFamily: Baloo2ExtraBold,
              fontSize,
              lineHeight: LINE_HEIGHT,
              color: primaryColor,
              textAlign: "center",
              textTransform: "uppercase",
              filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.5))",
            }}
          >
            {primary}
          </div>
        ) : null}

        {secondary ? (
          <div
            style={{
              fontFamily: Baloo2ExtraBold,
              fontSize,
              lineHeight: LINE_HEIGHT,
              color: accentColor,
              textAlign: "center",
              textTransform: "uppercase",
              filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.5))",
            }}
          >
            {secondary}
          </div>
        ) : null}
      </div>
    </div>
  );
};
