import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useVideoConfig } from "remotion";
import { filterForGrade } from "./grade";

export type BrollClip = {
  src: string;
  /** Where in the source file to start, in seconds — for cutting past an
   *  awkward opening or picking a clean moment out of a longer clip. */
  startFromSec: number;
  /** How long this clip plays in the reel, in seconds. */
  durationSec: number;
};

// Accept either a full staticFile() URL or a bare path relative to public/.
const resolveSrc = (src: string): string =>
  /^(https?:|blob:|\/)/.test(src) ? src : staticFile(src);

// Plays a list of trimmed clips back to back to fill the reel — one clip
// rarely has enough clean, non-awkward footage for the whole runtime, so
// stitching a few trims together (even from the same source file) is the
// normal case, not a fallback.
export const BrollLayer: React.FC<{
  readonly broll: BrollClip[];
  readonly grade: string;
}> = ({ broll, grade }) => {
  const { fps } = useVideoConfig();
  const filter = filterForGrade(grade);

  let cursor = 0;
  return (
    <>
      {broll.map((clip, i) => {
        const from = Math.round(cursor * fps);
        const durationInFrames = Math.max(1, Math.round(clip.durationSec * fps));
        cursor += clip.durationSec;

        return (
          <Sequence key={i} from={from} durationInFrames={durationInFrames}>
            <AbsoluteFill>
              <OffthreadVideo
                src={resolveSrc(clip.src)}
                muted
                trimBefore={Math.round(clip.startFromSec * fps)}
                style={{
                  objectFit: "cover",
                  width: "100%",
                  height: "100%",
                  filter,
                }}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </>
  );
};
