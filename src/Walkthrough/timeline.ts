import { MoveName } from "./camera";

// Frame plan for every shot. All numbers are frames at 30fps.
//
// A shot runs:  [before card] -> [morph] -> draw -> reveal -> hold -> exit
// The next shot starts when this one starts its exit, so the push-through
// out of one room overlaps the first lines of the next.

export type ShotSpec = {
  photo: string;
  before?: string;
  label: string;
  sheet: string;
  move?: MoveName;
};

export type ShotPlan = {
  start: number;
  total: number;
  before: number;
  morph: number;
  drawStart: number;
  draw: number;
  revealStart: number;
  reveal: number;
  holdStart: number;
  hold: number;
  exitStart: number;
  exit: number;
  move: MoveName;
};

const DEFAULT_MOVES: MoveName[] = [
  "push-right",
  "push",
  "truck-left",
  "push-left",
  "rise",
  "truck-right",
  "push",
];

export const END_CARD_FRAMES = 120;
const REVEAL = 16;
const EXIT = 12;

export const planShots = (shots: ShotSpec[]) => {
  const plans: ShotPlan[] = [];
  let t = 0;
  shots.forEach((s, i) => {
    const last = i === shots.length - 1;
    const hasBefore = Boolean(s.before);
    const before = hasBefore ? (i === 0 ? 66 : 46) : 0;
    const morph = hasBefore ? 36 : 0;
    // After-lines start drawing while the old room's lines are retracting.
    // The opening shot starts mid-drawing so frame 0 (the thumbnail) is
    // never blank paper.
    const drawStart = hasBefore ? before + 16 : i === 0 ? -24 : 0;
    const draw = hasBefore ? 28 : i === 0 ? 82 : i === 1 ? 34 : 26;
    const revealStart = drawStart + draw;
    const holdStart = revealStart + REVEAL;
    const hold = last ? 66 : i === 0 ? 50 : hasBefore ? 56 : 40;
    const exitStart = holdStart + hold;
    plans.push({
      start: t,
      total: exitStart + EXIT,
      before,
      morph,
      drawStart,
      draw,
      revealStart,
      reveal: REVEAL,
      holdStart,
      hold,
      exitStart,
      exit: EXIT,
      move: s.move ?? DEFAULT_MOVES[i % DEFAULT_MOVES.length],
    });
    t += exitStart;
  });
  const endStart = t;
  return { plans, endStart, total: endStart + END_CARD_FRAMES };
};
