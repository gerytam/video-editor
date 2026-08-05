import { makeTransform, scale, translateY } from "@remotion/animation-utils";
import { TikTokPage } from "@remotion/captions";
import { fitText } from "@remotion/layout-utils";
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TheBoldFont } from "../load-font";

const fontFamily = TheBoldFont;

const container: React.CSSProperties = {
  justifyContent: "center",
  alignItems: "center",
  top: undefined,
  bottom: 380,
  height: 220,
  padding: "0 40px",
};

const DESIRED_FONT_SIZE = 130;
// MrBeast-punchy palette: the word being spoken pops in bright yellow and
// scales up; everything else stays white with a heavy black outline.
const HIGHLIGHT_COLOR = "#FFE800";
const HIGHLIGHT_SCALE = 1.14;

export const Page: React.FC<{
  readonly enterProgress: number;
  readonly page: TikTokPage;
}> = ({ enterProgress, page }) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const timeInMs = (frame / fps) * 1000;

  const fittedText = fitText({
    fontFamily,
    text: page.text,
    withinWidth: width * 0.9,
    textTransform: "uppercase",
  });

  const fontSize = Math.min(DESIRED_FONT_SIZE, fittedText.fontSize);

  return (
    <AbsoluteFill style={container}>
      <div
        style={{
          fontSize,
          color: "white",
          WebkitTextStroke: "22px black",
          paintOrder: "stroke",
          textAlign: "center",
          lineHeight: 1.05,
          filter: "drop-shadow(0 12px 22px rgba(0,0,0,0.45))",
          transform: makeTransform([
            // Bouncy pop-in: overshoot slightly past full size then settle.
            scale(interpolate(enterProgress, [0, 0.7, 1], [0.7, 1.06, 1])),
            translateY(interpolate(enterProgress, [0, 1], [60, 0])),
          ]),
          fontFamily,
          textTransform: "uppercase",
        }}
      >
        {page.tokens.map((t) => {
          const startRelativeToSequence = t.fromMs - page.startMs;
          const endRelativeToSequence = t.toMs - page.startMs;

          const active =
            startRelativeToSequence <= timeInMs &&
            endRelativeToSequence > timeInMs;

          // Frame-based pop: quick overshoot when the word becomes active,
          // then settle. (CSS transitions don't run in a frame render.)
          const msSinceActive = timeInMs - startRelativeToSequence;
          const pop = active
            ? interpolate(msSinceActive, [0, 90, 180], [1, HIGHLIGHT_SCALE, 1.06], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 1;

          return (
            <span
              key={t.fromMs}
              style={{
                display: "inline-block",
                whiteSpace: "pre",
                color: active ? HIGHLIGHT_COLOR : "white",
                transform: `scale(${pop})`,
              }}
            >
              {t.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
