# Azureye reel pipeline

Batch-renders branded talking-head reels: same house look for every client,
brand color and handle swapped per client. Built to run alongside DaVinci
Resolve, not replace it.

## When to use this vs Resolve

| Use | Tool |
| --- | --- |
| Picking topics, choosing b-roll, judging what's good | Claude + Drive |
| Color, audio cleanup, real cutting, anything needing taste | **Resolve** |
| The same branded caption/graphics treatment, at volume | **This pipeline** |

The pipeline wins on repetition and consistency. A one-off edit you care about
is still faster by hand.

## Setup (once)

```bash
npm i
```

## Add a client (once per client)

Edit `src/config/clients.ts`:

```ts
{
  id: "acme",              // referenced from the job manifest
  name: "Acme Hardscapes",
  handle: "acmehardscapes", // no @; appears on the CTA end card
  brandColor: "#00E5FF",   // caption highlight + keyword chip; make it bright
  onBrandColor: "#000000", // text color on top of brandColor
}
```

## Render reels

**1. Put the footage in `public/jobs/`** and the script next to the manifest:

```
public/jobs/acme-01.mp4     <- the recorded reel
jobs/acme-01.txt            <- the script body, one thought per line
```

The script is the body of the organic reel script — **one thought per line,
blank line between**. Those line breaks are what the caption aligner uses as
breath points, so keep the format from the content-plan doc as-is.

**2. Write `jobs/jobs.json`** (copy `jobs/jobs.example.json`):

```json
[
  {
    "id": "acme-01",
    "clientId": "acme",
    "video": "public/jobs/acme-01.mp4",
    "script": "jobs/acme-01.txt",
    "hook": "Your patio isn't sinking. It was built on sand.",
    "keyword": "DRAINAGE",
    "ctaCondition": "If your patio is already pulling away,"
  }
]
```

`hook`, `keyword` and `ctaCondition` come straight off the script doc —
HOOK TEXT OVERLAY, the comment keyword, and the condition line of the CTA.

**3. Render everything:**

```bash
npm run batch                    # all jobs -> out/<id>.mp4
npm run batch acme-01            # just one
```

Captions are generated on first run and reused after, so re-renders are fast.
To force new captions, delete the `.json` next to the video.

## B-roll text-overlay reels

A second reel type, for footage with no speech to caption: timed text beats
carry the message, the b-roll is ambient support underneath. Baloo 2
typography, centered stacked text (a plain line, then an accent-colored line
at the accent phrase), and safe zones for Instagram's own UI (the
handle/caption bar at the bottom, the like/comment/share column on the
right) — see `src/BrollReel/beats.ts`. The b-roll's own on-camera audio is
always muted; add music in post (Resolve, or Instagram's own picker after
upload).

**1. Put the b-roll in `public/jobs/`**, same as any other job — no script
file needed, since there's no speech to align.

**2. Write beats into the job manifest** (copy
`jobs/philip-runs-ads-broll.example.json`):

```json
{
  "id": "reel_16_myth_truth_1",
  "composition": "BrollReel",
  "clientId": "philiprunsads",
  "video": "public/jobs/reel_16_myth_truth_1.mp4",
  "beats": [
    { "text": "It's not the economy.", "accentPhrase": null, "startSec": 0, "holdSec": 1.62 },
    { "text": "It's that nobody in Coastal Delaware knows who you are yet.",
      "accentPhrase": "nobody in Coastal Delaware knows who you are yet",
      "startSec": 3.24, "holdSec": 3.0 }
  ]
}
```

`accentPhrase` must be an exact substring of `text`, and (per the content
plan) sits at the end of the sentence — the beat renders as two stacked
lines, split at that point: plain text, then the accent phrase in the
client's brand color. A beat can also carry `"icon"`, one of the names in
`src/BrollReel/Icons.tsx` (`phone`, `camera`, `car`, ...) — only for the rare
beat with an obvious concrete noun; leave it off otherwise; most beats in
this content plan don't have one. Duration is driven by the beats (last
beat's `startSec + holdSec`), not the clip — trim or loop the b-roll to
match, or redistribute the hold times.

**3. Render:** `npm run batch` picks the composition per job automatically
(`--overlay` works here too, for the Resolve hybrid workflow).

The 15-reel Philip Runs Ads batch is in
`jobs/philip-runs-ads-broll.example.json`, converted straight from the
content plan. Each job's `video` is a placeholder path
(`public/jobs/<reel_id>.mp4`) — drop the matching clip in before rendering.
`caption`/`hashtags` ride along in the manifest for the post itself; the
renderer ignores them.

Client identity tag (small circular photo + `@handle`, top-left, persistent)
comes from `client.avatar` in `src/config/clients.ts` — add the photo to
`public/avatars/` and set the field; until then it falls back to an initial
badge so renders never break for a missing asset.

## Resolve integration (the hybrid)

Render **just the graphics** with a transparent background, then drop it onto
your Resolve timeline as a layer over your own cut:

```bash
npm run batch -- --overlay       # -> out/<id>-overlay.mov (ProRes 4444, alpha)
```

You keep Resolve's cutting, color and audio. The graphics come out identical
every time, generated from the script you already wrote.

## Tuning the look

| What | Where |
| --- | --- |
| Words on screen at once | `SWITCH_CAPTIONS_EVERY_MS` in `src/Reel/index.tsx` |
| Caption size, outline, pop | `src/Reel/CaptionPage.tsx` |
| Hook overlay timing/size | `src/Reel/HookOverlay.tsx` |
| CTA card, when it appears | `src/Reel/KeywordCTA.tsx` (`CTA_LEAD_SECONDS`) |
| B-roll safe zones, font size, colors | `src/BrollReel/beats.ts` |
| B-roll beat pop/crossfade timing | `src/BrollReel/TextBeatCard.tsx` |

Preview interactively with `npm run dev` — pick the **Reel** composition and
edit props in the sidebar.

## Captions without Whisper

`scripts/align-captions.mjs` maps a written script onto the video's real speech
timing using ffmpeg silence detection. No transcription model, no network, no
GPU. It works because the scripts are written before filming — the words are
already known, only the timing needs discovering.

```bash
npm run captions public/jobs/acme-01.mp4 jobs/acme-01.txt
```

Timing inside a phrase is interpolated by word length, so it can drift slightly
on a long unbroken line. More line breaks in the script = tighter sync.

## Notes

- Client footage and generated captions are gitignored. The manifest and the
  code are versioned; the media is not.
- If a machine can't download Chrome, point Remotion at an existing binary:
  `export REMOTION_BROWSER_EXECUTABLE=/path/to/chrome-headless-shell`
