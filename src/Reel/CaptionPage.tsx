import { TikTokPage } from "@remotion/captions";
import { fitText } from "@remotion/layout-utils";
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TheBoldFont } from "../load-font";

const DESIRED_FONT_SIZE = 130;
const HIGHLIGHT_SCALE = 1.14;

// One page of captions: bold uppercase, heavy outline, springy pop-in, and the
// word currently being spoken punches forward in the client's brand color.
export const CaptionPage: React.FC<{
  readonly page: TikTokPage;
  readonly brandColor: string;
  /** Extra px to lift the captions, so they clear the CTA end card. */
  readonly lift?: number;
}> = ({ page, brandColor, lift = 0 }) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const timeInMs = (frame / fps) * 1000;

  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 120 },
    durationInFrames: 8,
  });

  const fitted = fitText({
    fontFamily: TheBoldFont,
    text: page.text,
    withinWidth: width * 0.9,
    textTransform: "uppercase",
  });
  const fontSize = Math.min(DESIRED_FONT_SIZE, fitted.fontSize);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        top: undefined,
        bottom: 380 + lift,
        height: 220,
        padding: "0 40px",
      }}
    >
      <div
        style={{
          fontSize,
          color: "white",
          WebkitTextStroke: "22px black",
          paintOrder: "stroke",
          textAlign: "center",
          lineHeight: 1.05,
          fontFamily: TheBoldFont,
          textTransform: "uppercase",
          filter: "drop-shadow(0 12px 22px rgba(0,0,0,0.45))",
          transform: `scale(${interpolate(
            enterProgress,
            [0, 0.7, 1],
            [0.7, 1.06, 1],
          )}) translateY(${interpolate(enterProgress, [0, 1], [60, 0])}px)`,
        }}
      >
        {page.tokens.map((t) => {
          const start = t.fromMs - page.startMs;
          const end = t.toMs - page.startMs;
          const active = start <= timeInMs && end > timeInMs;

          const pop = active
            ? interpolate(
                timeInMs - start,
                [0, 90, 180],
                [1, HIGHLIGHT_SCALE, 1.06],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              )
            : 1;

          return (
            <span
              key={t.fromMs}
              style={{
                display: "inline-block",
                whiteSpace: "pre",
                color: active ? brandColor : "white",
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
