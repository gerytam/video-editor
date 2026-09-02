// Shared types and layout constants for the b-roll text-overlay reel.
//
// This is a different product from Reel/ProEdit: there's no speech to caption
// — the footage is ambient support and pre-written text beats carry the whole
// message. Timing comes straight from the content plan, not from audio.

export type TextBeat = {
  text: string;
  /** Substring of `text` to render in the accent color. Null/omitted = no accent. */
  accentPhrase?: string | null;
  /** When this beat starts, in seconds from the top of the reel. */
  startSec: number;
  /** How long this beat holds before the next one takes over. */
  holdSec: number;
  /** Optional icon name from Icons.tsx, for the rare beat with an obvious
   *  concrete noun (a phone, a car). Most beats are abstract — skip this
   *  rather than force an icon that doesn't fit. */
  icon?: string | null;
};

// Splits a beat's text into a primary line and an accent-colored second
// line, at the accent phrase — the centered, stacked layout the style guide
// moved to. Every accent phrase in the content plan sits at the end of its
// sentence, so this is a straight split, not a search-and-wrap.
export const splitBeatText = (
  text: string,
  accentPhrase?: string | null,
): { primary: string | null; secondary: string | null } => {
  const idx = accentPhrase ? text.indexOf(accentPhrase) : -1;
  if (!accentPhrase || idx === -1) return { primary: text, secondary: null };

  const primary = text.slice(0, idx).trim();
  const secondary = text.slice(idx).trim();
  return { primary: primary || null, secondary };
};

// Canvas + Instagram's own UI overlay (handle/caption/audio ticker at the
// bottom, like/comment/share/save column on the right). Keep all text inside
// these bounds — see the project style guide.
export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;

export const SAFE_ZONE = {
  bottomReserved: 270,
  rightReserved: 90,
  leftMargin: 60,
  topMargin: 100,
};

// Font size sized to fit the safe-area width; longer lines wrap to more
// lines rather than shrinking further, so the floor is 64, not smaller.
export const fontSizeForBeat = (text: string): number => {
  if (text.length <= 28) return 72;
  if (text.length <= 45) return 68;
  return 64;
};

export const LINE_HEIGHT = 1.2;

// Primary text color from the style guide. Fixed across clients — only the
// accent color (client.brandColor) changes per client.
export const TEXT_PRIMARY = "#F3F1EA";

// Default word-count based hold estimate, matching the content plan's own
// formula. Only used as a fallback if a beat doesn't specify holdSec.
export const estimateHoldSec = (text: string): number => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(3.0, Math.max(1.2, words * 0.28));
};
