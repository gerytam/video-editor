import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TheBoldFont } from "../load-font";
import { Beat, STATEMENT_HOLD, TOTAL_STEPS } from "./beats";

// The screen-filling statement that lands on each step, in the left third the
// reframe opens up. Lines stagger in rather than appearing as one block — the
// stagger is what makes it read as edited rather than templated.
export const StatementCard: React.FC<{
  readonly beat: Beat;
  readonly accent: string;
}> = ({ beat, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const local = t - beat.t;
  if (local < -0.35 || local > STATEMENT_HOLD + 0.55) return null;

  const outP = interpolate(
    local,
    [STATEMENT_HOLD, STATEMENT_HOLD + 0.42],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const lines = beat.headline.split("\n");

  return (
    <AbsoluteFill
      style={{
        fontFamily: TheBoldFont,
        pointerEvents: "none",
        paddingLeft: 62,
        paddingTop: 300,
        alignItems: "flex-start",
        justifyContent: "flex-start",
      }}
    >
      {/* step index — small, so the headline stays the hero */}
      <StaggerLine index={0} local={local} outP={outP} fps={fps}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div
            style={{
              background: accent,
              color: "#000",
              fontSize: 34,
              padding: "6px 16px",
              borderRadius: 10,
              border: "5px solid #000",
              lineHeight: 1.1,
            }}
          >
            {beat.n}
          </div>
          <div
            style={{
              fontSize: 26,
              letterSpacing: 3,
              color: "#fff",
              WebkitTextStroke: "6px #000",
              paintOrder: "stroke",
            }}
          >
            STEP {beat.n} / {TOTAL_STEPS}
          </div>
        </div>
      </StaggerLine>

      {lines.map((line, i) => (
        <StaggerLine
          key={i}
          index={i + 1}
          local={local}
          outP={outP}
          fps={fps}
        >
          <div
            style={{
              fontSize: 92,
              lineHeight: 0.98,
              color: "#fff",
              WebkitTextStroke: "17px #000",
              paintOrder: "stroke",
              filter: "drop-shadow(0 14px 26px rgba(0,0,0,0.55))",
            }}
          >
            {line}
          </div>
        </StaggerLine>
      ))}

      {beat.sub ? (
        <StaggerLine
          index={lines.length + 1}
          local={local}
          outP={outP}
          fps={fps}
        >
          <div
            style={{
              marginTop: 22,
              fontSize: 33,
              color: accent,
              WebkitTextStroke: "7px #000",
              paintOrder: "stroke",
              maxWidth: 470,
              lineHeight: 1.15,
            }}
          >
            {beat.sub}
          </div>
        </StaggerLine>
      ) : null}
    </AbsoluteFill>
  );
};

// One staggered line: springs in from the left, wipes out upward together.
const StaggerLine: React.FC<{
  readonly index: number;
  readonly local: number;
  readonly outP: number;
  readonly fps: number;
  readonly children: React.ReactNode;
}> = ({ index, local, outP, fps, children }) => {
  const delay = index * 0.075;
  const inP = spring({
    frame: Math.round((local - delay) * fps),
    fps,
    config: { damping: 15, mass: 0.45, stiffness: 140 },
    durationInFrames: Math.round(fps * 0.45),
  });

  const x = interpolate(inP, [0, 1], [-70, 0]);
  const opacity = Math.min(inP, 1 - outP);
  const y = interpolate(outP, [0, 1], [0, -40]);

  return (
    <div style={{ transform: `translate(${x}px, ${y}px)`, opacity }}>
      {children}
    </div>
  );
};
