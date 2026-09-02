import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { ICONS, IconName, isIconName } from "./Icons";

// A small accent-colored circle badge that bounces in above a beat's text,
// then idles with a light bob/wobble for as long as the beat holds — for the
// rare beat with an obvious concrete noun (a phone, a car, a calendar).
export const BeatIcon: React.FC<{
  readonly name: string | null | undefined;
  readonly localSec: number;
  readonly fadeIn: number;
  readonly accentColor: string;
  readonly onAccentColor: string;
}> = ({ name, localSec, fadeIn, accentColor, onAccentColor }) => {
  const { fps } = useVideoConfig();

  if (!name || !isIconName(name)) return null;
  const Icon = ICONS[name as IconName];

  // Leads the text in by a beat, so it reads as announcing the line.
  const lead = 0.08;
  const local = localSec + lead;

  // Underdamped on purpose — the spring overshoots past 1 and settles,
  // which is what sells the bounce.
  const pop = spring({
    frame: Math.round(local * fps),
    fps,
    config: { damping: 9, mass: 0.5, stiffness: 260 },
    durationInFrames: Math.max(1, Math.round(fadeIn * fps)),
  });
  const scale = interpolate(pop, [0, 1], [0.3, 1], {
    extrapolateRight: "extend",
  });

  // Idle bob + wobble once it's settled in, so it never just sits dead on
  // screen for the rest of the hold.
  const idle = Math.max(0, local - fadeIn);
  const bobY = Math.sin(idle * 3.4) * 5;
  const wobble = Math.sin(idle * 2.1) * 4;

  return (
    <div
      style={{
        opacity: Math.min(1, pop),
        transform: `translateY(${bobY}px) rotate(${wobble}deg) scale(${scale})`,
        marginBottom: 18,
        width: 76,
        height: 76,
        borderRadius: "50%",
        background: accentColor,
        border: "4px solid rgba(0,0,0,0.25)",
        boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon width={38} height={38} color={onAccentColor} />
    </div>
  );
};
