import { Fragment, useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  OffthreadVideo,
  Sequence,
  staticFile,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { getClient } from "../config/clients";
import { TEXT_PRIMARY } from "./beats";
import { CutFlash } from "./CutFlash";
import { loadBaloo2 } from "./font";
import { IdentityTag } from "./IdentityTag";
import { TextBeatCard } from "./TextBeatCard";

export const textBeatSchema = z.object({
  text: z.string(),
  accentPhrase: z.string().nullable().optional(),
  startSec: z.number(),
  holdSec: z.number(),
  /** Icon name from Icons.tsx — only for beats with an obvious concrete
   *  noun. An unrecognized name is silently skipped, not an error. */
  icon: z.string().nullable().optional(),
});

export const brollReelSchema = z.object({
  /** B-roll video in public/, e.g. staticFile("jobs/reel_16.mp4") */
  src: z.string(),
  /** Which client's branding to use — an id from src/config/clients.ts */
  clientId: z.string(),
  /** Timed text beats. Duration of the reel is the last beat's startSec + holdSec. */
  beats: z.array(textBeatSchema),
  /** Full crossfade width between adjacent beats, in seconds. */
  crossfadeSec: z.number().default(0.12),
  /** Render the alpha-channel graphics layer only (no footage), for
   *  compositing over b-roll cut in DaVinci Resolve. */
  overlayOnly: z.boolean().default(false),
});

export type BrollReelProps = z.infer<typeof brollReelSchema>;

// Accept either a full staticFile() URL (from defaultProps / Studio) or a
// bare path relative to public/ (what the batch runner passes on the CLI).
const resolveSrc = (src: string): string =>
  /^(https?:|blob:|\/)/.test(src) ? src : staticFile(src);

const totalDuration = (beats: BrollReelProps["beats"]): number => {
  if (!beats.length) return 0;
  const last = beats[beats.length - 1];
  return last.startSec + last.holdSec;
};

// Duration is driven by the text beats, not the footage — per the content
// plan, the underlying b-roll clip gets trimmed or looped to match the
// beats, not the other way around.
export const calculateBrollReelMetadata: CalculateMetadataFunction<
  BrollReelProps
> = async ({ props }) => {
  const fps = 30;
  return {
    fps,
    durationInFrames: Math.max(
      1,
      Math.round(totalDuration(props.beats) * fps),
    ),
  };
};

export const BrollReel: React.FC<BrollReelProps> = ({
  src,
  clientId,
  beats,
  crossfadeSec,
  overlayOnly,
}) => {
  const client = getClient(clientId);
  const { fps } = useVideoConfig();
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Loading Baloo 2"));
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    loadBaloo2().then(() => {
      setFontReady(true);
      continueRender(handle);
    });
  }, [continueRender, handle]);

  const videoSrc = resolveSrc(src);

  return (
    <AbsoluteFill
      style={{ backgroundColor: overlayOnly ? "transparent" : "black" }}
    >
      {/* Footage — omitted in overlayOnly mode so the render carries alpha
          and can be dropped straight onto a Resolve timeline. */}
      {overlayOnly ? null : (
        <>
          <AbsoluteFill>
            {/* Muted — this is a silent visual bed. Music goes on top in
                post; the b-roll's own on-camera audio never ships. */}
            <OffthreadVideo
              src={videoSrc}
              muted
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          </AbsoluteFill>
          {/* Scrim under the text area only — transparent up top, ~85%
              black at the bottom edge. Never covers the whole frame. */}
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.85) 14%, rgba(0,0,0,0) 55%)",
              pointerEvents: "none",
            }}
          />
        </>
      )}

      {fontReady ? (
        <>
          <IdentityTag handle={client.handle} avatar={client.avatar} />

          {beats.map((beat, i) => {
            // A distinct little "ping" for icon beats vs. plain text beats,
            // so the audio tracks the visual variety instead of repeating
            // the same sound on every cut.
            const sfx = beat.icon ? "sfx/whoosh.wav" : "sfx/pop.wav";
            const sfxFrames = beat.icon ? 8 : 6;
            return (
              <Fragment key={i}>
                <TextBeatCard
                  beat={beat}
                  index={i}
                  primaryColor={TEXT_PRIMARY}
                  accentColor={client.brandColor}
                  onAccentColor={client.onBrandColor}
                  crossfadeSec={crossfadeSec}
                  isFirst={i === 0}
                  isLast={i === beats.length - 1}
                />
                <Sequence
                  from={Math.round(beat.startSec * fps)}
                  durationInFrames={sfxFrames}
                >
                  <Audio src={staticFile(sfx)} volume={0.55} />
                </Sequence>
              </Fragment>
            );
          })}

          <CutFlash starts={beats.map((b) => b.startSec)} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

export const defaultBrollReelProps: BrollReelProps = {
  src: staticFile("sample-video.mp4"),
  clientId: "philiprunsads",
  beats: [
    { text: "It's not the economy.", accentPhrase: null, startSec: 0, holdSec: 1.62, icon: "chart" },
    { text: "It's not the season.", accentPhrase: null, startSec: 1.62, holdSec: 1.62, icon: "calendar" },
    {
      text: "It's that nobody in Coastal Delaware knows who you are yet.",
      accentPhrase: "nobody in Coastal Delaware knows who you are yet",
      startSec: 3.24,
      holdSec: 3.0,
      icon: "pin",
    },
  ],
  crossfadeSec: 0.12,
  overlayOnly: false,
};
