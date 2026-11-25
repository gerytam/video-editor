import { AbsoluteFill, CalculateMetadataFunction, Sequence, useCurrentFrame } from "remotion";
import { z } from "zod";
import { MOVES } from "./camera";
import { EndCard } from "./EndCard";
import { loadWalkthroughFonts } from "./fonts";
import { Hook } from "./Hook";
import { Paper } from "./Paper";
import { Shot } from "./Shot";
import { planShots } from "./timeline";

// "From blueprint to built" walkthrough, made from still photos.
//
// Each room starts as its own line drawing on blueprint paper, then the real
// photo scans in over it and a virtual camera moves through it in 3D (from a
// depth map). Give a shot a `before` photo and it opens on the old room
// instead: before -> redrawn -> built.
//
// Prepare the photos first:   python3 scripts/walkthrough/prep.py <job.json>
// Render:                     npm run walkthrough <job.json>

loadWalkthroughFonts();

export const walkthroughSchema = z.object({
  assetDir: z.string(),
  hook: z.string(),
  shots: z.array(
    z.object({
      photo: z.string(),
      before: z.string().optional(),
      label: z.string(),
      sheet: z.string(),
      move: z.enum(MOVES).optional(),
    }),
  ),
  brand: z.object({
    name: z.string(),
    short: z.string(),
    logo: z.string().optional(),
    tagline: z.string(),
    services: z.string().optional(),
    area: z.string().optional(),
    phone: z.string().optional(),
    site: z.string().optional(),
    cta: z.string().optional(),
    paper: z.string(),
  }),
});

export type WalkthroughProps = z.infer<typeof walkthroughSchema>;

export const calculateWalkthroughMetadata: CalculateMetadataFunction<WalkthroughProps> = ({ props }) => ({
  fps: 30,
  durationInFrames: planShots(props.shots).total,
});

export const Walkthrough: React.FC<WalkthroughProps> = ({ assetDir, hook, shots, brand }) => {
  const frame = useCurrentFrame();
  const { plans, endStart } = planShots(shots);
  const beforeAfter = shots.some((s) => s.before);
  const statusWords = beforeAfter
    ? { before: "BEFORE", drawn: "REDESIGN", built: "AFTER" }
    : { before: "BEFORE", drawn: "DRAWN", built: "BUILT" };
  const first = plans[0];
  const hookOut = first ? (frame - first.revealStart) / 10 : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper }}>
      <Paper color={brand.paper} />
      {/* Earlier shots render on top, so the room you're leaving pushes
          through and fades off the next room's first lines. */}
      {plans
        .map((plan, i) => (
          <Sequence key={i} from={plan.start} durationInFrames={plan.total} layout="none">
            <Shot
              spec={shots[i]}
              plan={plan}
              assetDir={assetDir}
              brandShort={brand.short}
              statusWords={statusWords}
              index={i}
            />
          </Sequence>
        ))
        .reverse()}
      <Sequence durationInFrames={first ? first.revealStart + 12 : 1} layout="none">
        <Hook text={hook} kicker={brand.name.toUpperCase()} t={frame + 40} out={hookOut} />
      </Sequence>
      <Sequence from={endStart} layout="none">
        <EndCard brand={brand} t={frame - endStart} />
      </Sequence>
    </AbsoluteFill>
  );
};

export const defaultWalkthroughProps: WalkthroughProps = {
  assetDir: "jobs/turnkey",
  hook: "Every room starts as a drawing.",
  shots: [
    { photo: "IMG_2060.HEIC", label: "Kitchen", sheet: "A-201" },
    { photo: "IMG_2048.HEIC", label: "Bath", sheet: "A-301" },
  ],
  brand: {
    name: "Turn Key Construction & Design",
    short: "TURN KEY",
    logo: "logos/turnkey-light.png",
    tagline: "From Blueprints to Reality.",
    services: "New Construction · Renovations · Decks",
    area: "Sussex County, Delaware",
    phone: "302-493-6995",
    site: "turnkeyde.com",
    cta: "Schedule your consultation",
    paper: "#04284C",
  },
};
