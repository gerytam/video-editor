// Editorial beat map.
//
// The source is a single locked-off talking-head shot for three minutes, so
// every bit of visual variety is manufactured here. The rule followed
// throughout: a framing change has to be MOTIVATED — it happens because the
// content turns, not on a timer.
//
// Times are in seconds against public/pro-source.mp4 (the dead-air-tightened
// cut), and were derived from where each "Step N" actually lands in the
// aligned captions.

export type Beat = {
  /** When this beat starts, in seconds. */
  t: number;
  /** Step number, or 0 for the opening hook. */
  n: number;
  /** The screen-filling statement shown while the speaker is reframed. */
  headline: string;
  /** Optional smaller line under the headline. */
  sub?: string;
};

export const BEATS: Beat[] = [
  { t: 26.3, n: 1, headline: "OPTIMIZE\nYOUR\nPROFILE", sub: "Speak to one person" },
  { t: 52.6, n: 2, headline: "LAUNCH\nLOCAL\nADS", sub: "Stay top of mind" },
  { t: 67.2, n: 3, headline: "POST\nSTORY\nCONTENT", sub: "Answer it before they ask" },
  { t: 86.6, n: 4, headline: "DM EVERY\nFOLLOWER", sub: "They followed for a reason" },
  { t: 100.3, n: 5, headline: "TRACK\nHOT\nLEADS", sub: "One reply isn't the end" },
  { t: 114.8, n: 6, headline: "RETARGET\nWITH\nPROOF", sub: "They already know you" },
  { t: 130.2, n: 7, headline: "FEED THE\nMACHINE", sub: "Close a deal, raise spend" },
  { t: 135.7, n: 8, headline: "DIRECT\nRESPONSE\nADS", sub: "Last, never first" },
  { t: 154.3, n: 9, headline: "LET'S\nGET IT\nDONE", sub: "Message me if we're local" },
];

/** How long a statement card holds before the framing settles back. */
export const STATEMENT_HOLD = 2.6;

export const TOTAL_STEPS = 9;

/** The beat active at a given time, or null during connective tissue. */
export const beatAt = (tSec: number): Beat | null => {
  let found: Beat | null = null;
  for (const b of BEATS) {
    if (tSec >= b.t) found = b;
    else break;
  }
  return found;
};

/** True while a statement card should be on screen. */
export const inStatement = (tSec: number): Beat | null => {
  const b = beatAt(tSec);
  if (!b) return null;
  return tSec <= b.t + STATEMENT_HOLD ? b : null;
};

/** How many steps have been revealed by now (for the progress rail). */
export const stepsRevealed = (tSec: number): number => {
  const b = beatAt(tSec);
  return b ? b.n : 0;
};
