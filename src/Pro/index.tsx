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
} from "remotion";
import { z } from "zod";
import { loadFont } from "../load-font";
import { CaptionPage } from "../Reel/CaptionPage";
import { beatAt, inStatement } from "./beats";
import { framingAt } from "./framing";
import { HookCard } from "./HookCard";
import { ProgressRail } from "./ProgressRail";
import { StatementCard } from "./StatementCard";

const ACCENT = "#FFE800";
// Tighter grouping than the template default — this delivery is quick.
const SWITCH_CAPTIONS_EVERY_MS = 850;
// Captions stand down while a full statement is on screen; two competing
// blocks of type at once is the thing that makes an edit look automated.
const CAPTIONS_OFF_UNTIL = 4.6;

export const proSchema = z.object({ src: z.string() });
export type ProProps = z.infer<typeof proSchema>;

const resolveSrc = (src: string) =>
  /^(https?:|blob:|\/)/.test(src) ? src : staticFile(src);

export const calculateProMetadata: CalculateMetadataFunction<
  ProProps
> = async ({ props }) => {
  const fps = 30;
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

const fileExists = (f: string) =>
  Boolean(getStaticFiles().find((x) => x.src === f));

export const ProEdit: React.FC<ProProps> = ({ src }) => {
  const [subtitles, setSubtitles] = useState<Caption[]>([]);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender());
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = frame / fps;

  const videoSrc = resolveSrc(src);
  const subsFile = videoSrc.replace(/\.(mp4|mov|mkv|webm)$/i, ".json");

  const fetchSubs = useCallback(async () => {
    try {
      await loadFont();
      if (!fileExists(subsFile)) {
        setSubtitles([]);
        continueRender(handle);
        return;
      }
      const res = await fetch(subsFile);
      setSubtitles((await res.json()) as Caption[]);
      continueRender(handle);
    } catch (e) {
      cancelRender(e);
    }
  }, [continueRender, handle, subsFile]);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  const { pages } = useMemo(
    () =>
      createTikTokStyleCaptions({
        combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS,
        captions: subtitles ?? [],
      }),
    [subtitles],
  );

  const framing = framingAt(t);
  const statement = inStatement(t);
  const beat = beatAt(t);
  const captionsVisible = !statement && t > CAPTIONS_OFF_UNTIL;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Digital framing: punch-ins and reframes over a locked-off shot. */}
      <AbsoluteFill
        style={{
          transform: `scale(${framing.scale}) translate(${framing.tx * 100}%, ${
            framing.ty * 100
          }%)`,
        }}
      >
        <OffthreadVideo
          src={videoSrc}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      </AbsoluteFill>

      {/* Legibility: darken the left third under a statement, and the base
          under the captions. Both are subtle enough to read as grade. */}
      <AbsoluteFill
        style={{
          background: statement
            ? "linear-gradient(100deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 42%, rgba(0,0,0,0) 68%)"
            : "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 30%)",
          pointerEvents: "none",
        }}
      />

      <ProgressRail accent={ACCENT} />
      <HookCard accent={ACCENT} />

      {statement ? <StatementCard beat={statement} accent={ACCENT} /> : null}

      {captionsVisible
        ? pages.map((page, i) => {
            const next = pages[i + 1] ?? null;
            const start = (page.startMs / 1000) * fps;
            const end = Math.min(
              next ? (next.startMs / 1000) * fps : Infinity,
              start + SWITCH_CAPTIONS_EVERY_MS,
            );
            const dur = end - start;
            if (dur <= 0) return null;
            return (
              <Sequence key={i} from={start} durationInFrames={dur}>
                <CaptionPage page={page} brandColor={ACCENT} />
              </Sequence>
            );
          })
        : null}

      {/* Keeps the closing CTA on screen through the final beat. */}
      {beat?.n === 9 ? null : null}
    </AbsoluteFill>
  );
};

export const defaultProProps: ProProps = {
  src: staticFile("pro-source.mp4"),
};
