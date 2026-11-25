import "./index.css";
import { Composition, staticFile } from "remotion";
import {
  CaptionedVideo,
  calculateCaptionedVideoMetadata,
  captionedVideoSchema,
} from "./CaptionedVideo";
import {
  ProEdit,
  calculateProMetadata,
  defaultProProps,
  proSchema,
} from "./Pro";
import {
  Walkthrough,
  calculateWalkthroughMetadata,
  defaultWalkthroughProps,
  walkthroughSchema,
} from "./Walkthrough";
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
      {/* Professional editorial cut: motivated reframes, statement
          typography, progress rail. */}
      <Composition
        id="ProEdit"
        component={ProEdit}
        calculateMetadata={calculateProMetadata}
        schema={proSchema}
        width={1080}
        height={1920}
        defaultProps={defaultProProps}
      />

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

      {/* Blueprint-to-built walkthrough from still photos: each room draws
          itself as a blueprint, then the photo scans in with a 3D camera
          move. Render with: npm run walkthrough jobs/<job>.json */}
      <Composition
        id="Walkthrough"
        component={Walkthrough}
        calculateMetadata={calculateWalkthroughMetadata}
        schema={walkthroughSchema}
        width={1080}
        height={1920}
        fps={30}
        defaultProps={defaultWalkthroughProps}
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
