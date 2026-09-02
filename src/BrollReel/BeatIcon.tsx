import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { ICONS, IconName, isIconName } from "./Icons";

// A small accent-colored circle badge that pops in above a beat's text,
// for the rare beat with an obvious concrete noun (a phone, a car). Pops in
// slightly ahead of the text so it reads as leading the line, not
// decorating it.
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
  const lead = 0.06;
  const local = localSec + lead;

  const pop = spring({
    frame: Math.round(local * fps),
    fps,
    config: { damping: 13, mass: 0.4, stiffness: 230 },
    durationInFrames: Math.max(1, Math.round(fadeIn * fps)),
  });
  const scale = interpolate(pop, [0, 1], [0.5, 1]);

  return (
    <div
      style={{
        opacity: pop,
        transform: `scale(${scale})`,
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
