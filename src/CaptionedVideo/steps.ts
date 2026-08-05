// The 9-step playbook overlay data.
//
// `startMs` values were auto-detected from the aligned captions (where each
// "Step N" is spoken). They're approximate — open Remotion Studio and nudge
// any number here until the badge lands exactly on the beat. `label` is the
// short punchy callout shown next to the step number (edit freely).

export type Step = {
  n: number;
  label: string;
  startMs: number;
};

export const STEPS: Step[] = [
  { n: 1, label: "OPTIMIZE YOUR PROFILE", startMs: 26910 },
  { n: 2, label: "LAUNCH LOCAL ADS", startMs: 57912 },
  { n: 3, label: "POST STORY CONTENT", startMs: 74743 },
  { n: 4, label: "DM EVERY FOLLOWER", startMs: 103625 },
  { n: 5, label: "TRACK HOT LEADS", startMs: 109546 },
  { n: 6, label: "RETARGETING ADS", startMs: 118532 },
  { n: 7, label: "FEED THE MACHINE", startMs: 131989 },
  { n: 8, label: "DIRECT RESPONSE ADS", startMs: 140709 },
  { n: 9, label: 'DM ME "LOCAL"', startMs: 166609 },
];

export const TOTAL_STEPS = STEPS.length;

// Which step (if any) is active at a given time. Returns the index into STEPS,
// or -1 during the intro before step one.
export const activeStepIndex = (timeMs: number): number => {
  let idx = -1;
  for (let i = 0; i < STEPS.length; i++) {
    if (timeMs >= STEPS[i].startMs) idx = i;
    else break;
  }
  return idx;
};
