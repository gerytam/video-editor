import { Caption, createTikTokStyleCaptions } from "@remotion/captions";
import { parseMedia } from "@remotion/media-parser";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  cancelRender,
  getStaticFiles,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
  watchStaticFile,
} from "remotion";
import { z } from "zod";
import { loadFont } from "../load-font";
import { getClient } from "../config/clients";
import { CaptionPage } from "./CaptionPage";
import { HookOverlay } from "./HookOverlay";
import { CTA_LEAD_SECONDS, KeywordCTA } from "./KeywordCTA";

// How many ms of words to group onto one caption page.
// ~900 keeps it to 2-3 words at a time (punchy). Raise for calmer pacing.
const SWITCH_CAPTIONS_EVERY_MS = 900;

export const reelSchema = z.object({
  /** Video in public/, e.g. staticFile("jobs/acme-01.mp4") */
  src: z.string(),
  /** Which client's branding to use — an id from src/config/clients.ts */
  clientId: z.string(),
  /** HOOK TEXT OVERLAY from the script. Burned in over the opening seconds. */
  hook: z.string(),
  /** Comment keyword, e.g. "DRAINAGE". Shown in the end card. */
  keyword: z.string(),
  /** The condition line above the keyword, e.g. "If you're planning a reno in Annapolis," */
  ctaCondition: z.string(),
  /** Render the alpha-channel graphics layer only (no footage), for
   *  compositing over a cut in DaVinci Resolve. */
  overlayOnly: z.boolean(),
});

export type ReelProps = z.infer<typeof reelSchema>;

// Accept either a full staticFile() URL (from defaultProps / Studio) or a bare
// path relative to public/ (which is what the batch runner passes on the CLI).
const resolveSrc = (src: string): string =>
  /^(https?:|blob:|\/)/.test(src) ? src : staticFile(src);

export const calculateReelMetadata: CalculateMetadataFunction<
  ReelProps
> = async ({ props }) => {
  const fps = 30;
  // Parse the container directly so this works headless without the browser
  // needing H.264 decode support.
  const { durationInSeconds } = await parseMedia({
    src: resolveSrc(props.src),
    fields: { durationInSeconds: true },
    acknowledgeRemotionLicense: true,
  });

  return {
    fps,
    durationInFrames: Math.max(1, Math.floor((durationInSeconds ?? 0) * fps)),
  };
};

const fileExists = (file: string) =>
  Boolean(getStaticFiles().find((f) => f.src === file));

export const Reel: React.FC<ReelProps> = ({
  src,
  clientId,
  hook,
  keyword,
  ctaCondition,
  overlayOnly,
}) => {
  const client = getClient(clientId);
  const [subtitles, setSubtitles] = useState<Caption[]>([]);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender());
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // While the CTA card is on screen, lift the captions so the two don't collide.
  const ctaStartFrame = durationInFrames - Math.round(fps * CTA_LEAD_SECONDS);
  const captionLift = keyword && frame >= ctaStartFrame ? 330 : 0;

  const videoSrc = resolveSrc(src);
  // Captions live next to the video: jobs/acme-01.mp4 -> jobs/acme-01.json
  const subtitlesFile = videoSrc.replace(/\.(mp4|mkv|mov|webm)$/i, ".json");

  const fetchSubtitles = useCallback(async () => {
    try {
      await loadFont();
      if (!fileExists(subtitlesFile)) {
        setSubtitles([]);
        continueRender(handle);
        return;
      }
      const res = await fetch(subtitlesFile);
      setSubtitles((await res.json()) as Caption[]);
      continueRender(handle);
    } catch (e) {
      cancelRender(e);
    }
  }, [continueRender, handle, subtitlesFile]);

  useEffect(() => {
    fetchSubtitles();
    const c = watchStaticFile(subtitlesFile, fetchSubtitles);
    return () => c.cancel();
  }, [fetchSubtitles, subtitlesFile]);

  const { pages } = useMemo(
    () =>
      createTikTokStyleCaptions({
        combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS,
        captions: subtitles ?? [],
      }),
    [subtitles],
  );

  return (
    <AbsoluteFill
      style={{ backgroundColor: overlayOnly ? "transparent" : "black" }}
    >
      {/* Footage — omitted in overlayOnly mode so the render carries alpha
          and can be dropped straight onto a Resolve timeline. */}
      {overlayOnly ? null : (
        <>
          <AbsoluteFill>
            <OffthreadVideo
              src={videoSrc}
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          </AbsoluteFill>
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 32%)",
              pointerEvents: "none",
            }}
          />
        </>
      )}

      <HookOverlay text={hook} brandColor={client.brandColor} />

      {pages.map((page, index) => {
        const next = pages[index + 1] ?? null;
        const startFrame = (page.startMs / 1000) * fps;
        const endFrame = Math.min(
          next ? (next.startMs / 1000) * fps : Infinity,
          startFrame + SWITCH_CAPTIONS_EVERY_MS,
        );
        const durationInFrames = endFrame - startFrame;
        if (durationInFrames <= 0) return null;

        return (
          <Sequence
            key={index}
            from={startFrame}
            durationInFrames={durationInFrames}
          >
            <CaptionPage
              page={page}
              brandColor={client.brandColor}
              lift={captionLift}
            />
          </Sequence>
        );
      })}

      <KeywordCTA
        client={client}
        keyword={keyword}
        condition={ctaCondition}
      />
    </AbsoluteFill>
  );
};

export const defaultReelProps: ReelProps = {
  src: staticFile("bio-video.mp4"),
  clientId: "azureye",
  hook: "Your bio is costing you customers.",
  keyword: "LOCAL",
  ctaCondition: "If you want this done for you,",
  overlayOnly: false,
};
