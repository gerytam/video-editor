import "./index.css";
import { Composition, staticFile } from "remotion";
import {
  CaptionedVideo,
  calculateCaptionedVideoMetadata,
  captionedVideoSchema,
} from "./CaptionedVideo";
import {
  Reel,
  calculateReelMetadata,
  defaultReelProps,
  reelSchema,
} from "./Reel";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* The productized reel: same house look for every client, brand color
          and handle swapped per client. This is what the batch pipeline
          renders. */}
      <Composition
        id="Reel"
        component={Reel}
        calculateMetadata={calculateReelMetadata}
        schema={reelSchema}
        width={1080}
        height={1920}
        defaultProps={defaultReelProps}
      />

      {/* The one-off 9-step playbook edit. */}
      <Composition
        id="CaptionedVideo"
        component={CaptionedVideo}
        calculateMetadata={calculateCaptionedVideoMetadata}
        schema={captionedVideoSchema}
        width={1080}
        height={1920}
        defaultProps={{
          src: staticFile("bio-video.mp4"),
        }}
      />
    </>
  );
};
