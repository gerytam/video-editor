// Align a plain-text transcript to a video's actual speech timing, WITHOUT Whisper.
//
// How it works:
//   1. Extracts a 16kHz mono WAV from the video.
//   2. Runs ffmpeg `silencedetect` to find the real speech segments (gaps between pauses).
//   3. Splits your transcript into the same number of phrases (on sentence / newline boundaries),
//      then distributes words inside each phrase across its speech segment, weighted by word length.
//   4. Writes a `@remotion/captions` Caption[] JSON next to the video (e.g. public/bio-video.json),
//      which the CaptionedVideo composition reads automatically.
//
// Usage:
//   node scripts/align-captions.mjs public/bio-video.mp4 scripts/transcript.txt
//
// The timing is an estimate (real pauses are respected, but word-level sync inside a phrase is
// interpolated). Open Remotion Studio to nudge anything that feels off.

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const NOISE_DB = "-30dB"; // silence threshold
const MIN_SILENCE = 0.35; // seconds; shorter gaps are treated as normal speech rhythm

const videoPath = process.argv[2];
const transcriptPath = process.argv[3];

if (!videoPath || !transcriptPath) {
  console.error(
    "Usage: node scripts/align-captions.mjs <video> <transcript.txt>",
  );
  process.exit(1);
}

const tmpDir = mkdtempSync(path.join(os.tmpdir(), "align-"));
const wavPath = path.join(tmpDir, "audio.wav");

const ff = (cmd) => execSync(`npx remotion ${cmd}`, { stdio: ["ignore", "pipe", "pipe"] });

// 1. Extract 16kHz mono wav
ff(`ffmpeg -y -i "${videoPath}" -ar 16000 -ac 1 "${wavPath}"`);

// Total duration
const durOut = ff(
  `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${wavPath}"`,
).toString();
const totalDuration = parseFloat(durOut.trim());

// 2. Detect silence
let silenceLog = "";
try {
  ff(
    `ffmpeg -i "${wavPath}" -af "silencedetect=noise=${NOISE_DB}:d=${MIN_SILENCE}" -f null -`,
  );
} catch (e) {
  // ffmpeg writes silencedetect to stderr and exits 0, but capture defensively
  silenceLog = (e.stderr || e.stdout || "").toString();
}
if (!silenceLog) {
  // Re-run capturing stderr explicitly
  silenceLog = execSync(
    `npx remotion ffmpeg -i "${wavPath}" -af "silencedetect=noise=${NOISE_DB}:d=${MIN_SILENCE}" -f null - 2>&1`,
    { stdio: ["ignore", "pipe", "pipe"], shell: "/bin/bash" },
  ).toString();
}

const starts = [...silenceLog.matchAll(/silence_start:\s*([0-9.]+)/g)].map((m) =>
  parseFloat(m[1]),
);
const ends = [...silenceLog.matchAll(/silence_end:\s*([0-9.]+)/g)].map((m) =>
  parseFloat(m[1]),
);

// Build speech segments = the intervals that are NOT silence.
const silences = [];
for (let i = 0; i < starts.length; i++) {
  silences.push({ start: starts[i], end: ends[i] ?? totalDuration });
}
silences.sort((a, b) => a.start - b.start);

const speech = [];
let cursor = 0;
for (const s of silences) {
  if (s.start > cursor + 0.05) speech.push({ start: cursor, end: s.start });
  cursor = Math.max(cursor, s.end);
}
if (cursor < totalDuration - 0.05) speech.push({ start: cursor, end: totalDuration });

// 3. Read + normalize transcript into phrases.
const raw = readFileSync(transcriptPath, "utf8").trim();
// Split on newlines first, then on sentence enders, so the author can control phrasing with line breaks.
let phrases = raw
  .split(/\n+/)
  .flatMap((line) => line.split(/(?<=[.!?])\s+/))
  .map((p) => p.trim())
  .filter(Boolean);

// Reconcile phrase count with detected speech-segment count.
// If we have more phrases than segments, merge shortest-adjacent phrases.
// If fewer, split the longest phrases. Aim for phrases.length === speech.length.
const targetCount = speech.length;

const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;

while (phrases.length > targetCount && phrases.length > 1) {
  // merge the phrase that, combined with its neighbor, is smallest
  let bestIdx = 0;
  let bestLen = Infinity;
  for (let i = 0; i < phrases.length - 1; i++) {
    const len = wordCount(phrases[i]) + wordCount(phrases[i + 1]);
    if (len < bestLen) {
      bestLen = len;
      bestIdx = i;
    }
  }
  phrases[bestIdx] = `${phrases[bestIdx]} ${phrases[bestIdx + 1]}`;
  phrases.splice(bestIdx + 1, 1);
}

while (phrases.length < targetCount) {
  // split the longest phrase in half on a word boundary
  let bestIdx = 0;
  let bestLen = -1;
  for (let i = 0; i < phrases.length; i++) {
    const len = wordCount(phrases[i]);
    if (len > bestLen) {
      bestLen = len;
      bestIdx = i;
    }
  }
  if (bestLen < 2) break; // can't split further
  const words = phrases[bestIdx].split(/\s+/);
  const mid = Math.ceil(words.length / 2);
  const a = words.slice(0, mid).join(" ");
  const b = words.slice(mid).join(" ");
  phrases.splice(bestIdx, 1, a, b);
}

// If we still have fewer speech segments than phrases (rare), fall back to
// distributing all phrases evenly across the whole timeline.
const useSegments = phrases.length === speech.length;

// 4. Build word-level captions.
const captions = [];
const buildPhrase = (text, segStart, segEnd) => {
  const words = text.split(/\s+/).filter(Boolean);
  const totalChars = words.reduce((n, w) => n + w.length + 1, 0);
  const dur = segEnd - segStart;
  let t = segStart;
  for (const w of words) {
    const share = ((w.length + 1) / totalChars) * dur;
    const startMs = Math.round(t * 1000);
    const endMs = Math.round((t + share) * 1000);
    captions.push({
      text: (captions.length === 0 ? "" : " ") + w,
      startMs,
      endMs,
      timestampMs: Math.round((startMs + endMs) / 2),
      confidence: null,
    });
    t += share;
  }
};

if (useSegments) {
  phrases.forEach((p, i) => buildPhrase(p, speech[i].start, speech[i].end));
} else {
  // even distribution fallback
  const per = totalDuration / phrases.length;
  phrases.forEach((p, i) => buildPhrase(p, i * per, (i + 1) * per));
}

const outPath = videoPath.replace(/\.(mp4|mov|mkv|webm)$/i, ".json");
writeFileSync(outPath, JSON.stringify(captions, null, 2));
rmSync(tmpDir, { recursive: true, force: true });

console.log(
  `Wrote ${captions.length} word captions across ${phrases.length} phrases -> ${outPath}`,
);
console.log(
  `Detected ${speech.length} speech segments (aligned=${useSegments}).`,
);
