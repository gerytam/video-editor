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
  tiltForIndex,
} from "./beats";

// One text beat: a bounce-in bubble stack (a neutral line, then an
// accent-colored line at the accent phrase), tilted a couple degrees off
// square so it reads as designed rather than a plain caption track.
export const TextBeatCard: React.FC<{
  readonly beat: TextBeat;
  readonly index: number;
  readonly primaryColor: string;
  readonly accentColor: string;
  readonly onAccentColor: string;
  /** Full crossfade width between adjacent beats, in seconds. */
  readonly crossfadeSec: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
}> = ({
  beat,
  index,
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
  const fadeIn = isFirst ? 0.32 : Math.max(crossfadeSec, 0.2);
  const fadeOut = isLast ? 0.22 : Math.max(crossfadeSec * 0.8, 0.16);

  if (local < -fadeIn || local > beat.holdSec + fadeOut) return null;

  // Underdamped on purpose: the spring overshoots past 1 and settles back,
  // which is what actually reads as a "bounce" instead of a fade.
  const pop = spring({
    frame: Math.round(local * fps),
    fps,
    config: { damping: 10, mass: 0.5, stiffness: 240 },
    durationInFrames: Math.max(1, Math.round(fadeIn * fps)),
  });
  const outP = interpolate(
    local,
    [beat.holdSec - fadeOut, beat.holdSec],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const opacity = Math.min(1, pop) * (1 - outP);
  const scale = interpolate(pop, [0, 1], [0.4, 1], {
    extrapolateRight: "extend",
  }) * interpolate(outP, [0, 1], [1, 0.85]);
  const y =
    interpolate(pop, [0, 1], [50, 0], { extrapolateRight: "extend" }) +
    interpolate(outP, [0, 1], [0, -22]);

  const tilt = tiltForIndex(index);
  const rotateIn = tilt + (index % 2 === 0 ? 9 : -9);
  const rotate = interpolate(pop, [0, 1], [rotateIn, tilt], {
    extrapolateRight: "extend",
  });

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
          transform: `translateY(${y}px) scale(${scale}) rotate(${rotate}deg)`,
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
              background: "rgba(10,14,12,0.62)",
              border: "3px solid rgba(255,255,255,0.16)",
              borderRadius: 22,
              padding: "6px 24px",
              marginBottom: secondary ? 10 : 0,
              boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
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
              color: onAccentColor,
              textAlign: "center",
              textTransform: "uppercase",
              background: accentColor,
              border: "3px solid rgba(0,0,0,0.28)",
              borderRadius: 22,
              padding: "6px 24px",
              boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
            }}
          >
            {secondary}
          </div>
        ) : null}
      </div>
    </div>
  );
};
