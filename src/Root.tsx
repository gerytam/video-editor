import "./index.css";
import { Composition, staticFile } from "remotion";
import {
  BrollReel,
  calculateBrollReelMetadata,
  defaultBrollReelProps,
  brollReelSchema,
} from "./BrollReel";
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

      {/* B-roll text-overlay reel: timed text beats over ambient footage,
          no speech to caption. Duration comes from the beats, not the clip. */}
      <Composition
        id="BrollReel"
        component={BrollReel}
        calculateMetadata={calculateBrollReelMetadata}
        schema={brollReelSchema}
        width={1080}
        height={1920}
        defaultProps={defaultBrollReelProps}
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
