import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TheBoldFont } from "../load-font";
import type { Client } from "../config/clients";

// Seconds before the end of the video that the CTA card appears.
export const CTA_LEAD_SECONDS = 7;

// The CTA end card: the condition line, the comment KEYWORD in a brand chip,
// and the client's @handle. Slides in over the last few seconds so the
// keyword is on screen while it's being said.
export const KeywordCTA: React.FC<{
  readonly client: Client;
  readonly keyword: string;
  readonly condition?: string;
  /** Seconds before the end of the video that the card appears. */
  readonly leadSeconds?: number;
}> = ({ client, keyword, condition, leadSeconds = CTA_LEAD_SECONDS }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!keyword) return null;

  const startFrame = Math.max(0, durationInFrames - Math.round(fps * leadSeconds));
  if (frame < startFrame) return null;

  const pop = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 14, mass: 0.5, stiffness: 120 },
    durationInFrames: Math.round(fps * 0.55),
  });

  const y = interpolate(pop, [0, 1], [90, 0]);
  const opacity = interpolate(pop, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: 170,
        fontFamily: TheBoldFont,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          transform: `translateY(${y}px)`,
          opacity,
          textAlign: "center",
          padding: "0 60px",
        }}
      >
        {condition ? (
          <div
            style={{
              fontSize: 40,
              color: "white",
              WebkitTextStroke: "9px black",
              paintOrder: "stroke",
              textTransform: "uppercase",
              marginBottom: 18,
              lineHeight: 1.15,
            }}
          >
            {condition}
          </div>
        ) : null}

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 18,
            background: client.brandColor,
            border: "9px solid black",
            borderRadius: 28,
            padding: "18px 34px",
            boxShadow: "0 14px 30px rgba(0,0,0,0.45)",
          }}
        >
          <span
            style={{
              fontSize: 34,
              color: client.onBrandColor,
              opacity: 0.75,
              textTransform: "uppercase",
            }}
          >
            Comment
          </span>
          <span
            style={{
              fontSize: 62,
              color: client.onBrandColor,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {keyword}
          </span>
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 40,
            color: client.brandColor,
            WebkitTextStroke: "8px black",
            paintOrder: "stroke",
          }}
        >
          @{client.handle}
        </div>
      </div>
    </AbsoluteFill>
  );
};
