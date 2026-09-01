import { BEATS, STATEMENT_HOLD } from "./beats";

// Digital framing over a locked-off shot.
//
// Three shot sizes are used, and they alternate so two consecutive sections
// never look the same:
//   - HOOK      tight, for the opening claim
//   - STATEMENT tighter still and pushed right, opening the left of the frame
//               for typography. This is what makes the text feel composed
//               INTO the shot rather than pasted on top of it.
//   - SETTLE    a medium, slightly varied resting shot for the body copy
//
// Everything eases; nothing snaps. A very slow drift runs underneath so the
// picture is never completely still.

export type Framing = { scale: number; tx: number; ty: number };

type Key = { t: number; f: Framing; ease: number };

const HOOK: Framing = { scale: 1.3, tx: 0, ty: 0.02 };
const OPEN: Framing = { scale: 1.08, tx: 0, ty: 0 };
// Subject pushed right; left third becomes the type area. The scale has to be
// large enough to cover the shift — see clampToCover below.
const STATEMENT: Framing = { scale: 1.52, tx: 0.16, ty: 0.01 };
// Two resting shots, alternated between beats.
const SETTLE_A: Framing = { scale: 1.1, tx: -0.03, ty: 0 };
const SETTLE_B: Framing = { scale: 1.18, tx: 0.04, ty: 0.01 };

const buildKeys = (): Key[] => {
  const keys: Key[] = [
    { t: 0, f: HOOK, ease: 0 },
    { t: 3.6, f: HOOK, ease: 0 },
    { t: 5.0, f: OPEN, ease: 1.4 },
  ];

  BEATS.forEach((b, i) => {
    // Push into the statement framing just before the line lands.
    keys.push({ t: b.t - 0.25, f: STATEMENT, ease: 0.45 });
    keys.push({ t: b.t + STATEMENT_HOLD, f: STATEMENT, ease: 0 });
    // Then settle, alternating the resting shot.
    keys.push({
      t: b.t + STATEMENT_HOLD + 0.7,
      f: i % 2 === 0 ? SETTLE_A : SETTLE_B,
      ease: 0.7,
    });
  });

  return keys.sort((a, b) => a.t - b.t);
};

const KEYS = buildKeys();

// easeInOutCubic
const ease = (x: number): number =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const framingAt = (tSec: number): Framing => {
  let prev = KEYS[0];
  let next: Key | null = null;
  for (const k of KEYS) {
    if (k.t <= tSec) prev = k;
    else {
      next = k;
      break;
    }
  }

  let f: Framing;
  if (!next) {
    f = prev.f;
  } else {
    // Transitions run over the incoming key's ease window, ending at its time.
    const dur = Math.max(0.001, next.ease);
    const startT = next.t - dur;
    const p = tSec <= startT ? 0 : Math.min(1, (tSec - startT) / dur);
    const e = ease(p);
    f = {
      scale: lerp(prev.f.scale, next.f.scale, e),
      tx: lerp(prev.f.tx, next.f.tx, e),
      ty: lerp(prev.f.ty, next.f.ty, e),
    };
  }

  // Slow underlying drift so a held shot still breathes (~0.9% over ~11s).
  const drift = Math.sin(tSec / 11) * 0.009;
  return clampToCover({ scale: f.scale + drift, tx: f.tx, ty: f.ty });
};

// The source and the canvas are both 9:16, so at scale 1.0 there is zero
// overhang and ANY shift would expose a black edge. A shift is only safe up to
// half the extra size the zoom creates. Clamping here means no framing — even
// mid-transition, even with the drift applied — can ever letterbox the frame.
const clampToCover = (f: Framing): Framing => {
  const limit = (f.scale - 1) / 2 / f.scale;
  const safe = limit * 0.94; // small margin against rounding at the edges
  return {
    scale: f.scale,
    tx: Math.max(-safe, Math.min(safe, f.tx)),
    ty: Math.max(-safe, Math.min(safe, f.ty)),
  };
};
