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
carry the message, the b-roll is ambient support underneath. Each beat
bounce-pops in as a tilted rounded "bubble" (a plain line, then an
accent-colored line at the accent phrase), with a quick white flash-cut at
every beat change and a synced pop/whoosh sound effect — see
`src/BrollReel/TextBeatCard.tsx`, `CutFlash.tsx`, and `public/sfx/`. Baloo 2
typography and safe zones for Instagram's own UI (the handle/caption bar at
the bottom, the like/comment/share column on the right) — see
`src/BrollReel/beats.ts`. The b-roll's own on-camera audio is always muted;
add music in post (Resolve, or Instagram's own picker after upload) — the
pop/whoosh SFX are baked in regardless, since they're timed to the cuts.

**1. Put the b-roll in `public/jobs/`**, same as any other job — no script
file needed, since there's no speech to align. One clip rarely has enough
*clean* footage for the whole reel — pick a few trims (even from the same
file) that skip the awkward parts (a fumbled start, a camera bump, dead air)
rather than using one continuous take.

**2. Write beats + broll into the job manifest** (copy
`jobs/philip-runs-ads-broll.example.json`):

```json
{
  "id": "reel_17_myth_truth_2",
  "composition": "BrollReel",
  "clientId": "philiprunsads",
  "broll": [
    { "video": "public/jobs/reel_17_myth_truth_2.mov", "startFromSec": 8.0, "durationSec": 1.9 },
    { "video": "public/jobs/reel_17_myth_truth_2.mov", "startFromSec": 32.0, "durationSec": 1.62 }
  ],
  "grade": "moody",
  "bubbleStyle": "outline",
  "beats": [
    { "text": "If it's slow right now...", "accentPhrase": null, "startSec": 0, "holdSec": 1.9, "icon": "clock" },
    { "text": "...it's not bad luck.", "accentPhrase": null, "startSec": 1.9, "holdSec": 1.62 }
  ]
}
```

`broll` is one or more trimmed clips, played back to back — `startFromSec`
is where in the *source* file to start, `durationSec` is how long it plays
before cutting to the next entry (or the reel ends). Entries can repeat the
same file at different timestamps, which is the normal way to stitch a
single longer clip into several cuts. Clip cuts don't need to line up with
beat boundaries, but they often do naturally and it reads well when they do
— the flash-cut (`CutFlash.tsx`) fires on every beat boundary regardless.

`grade` (`neutral` / `warm` / `cool` / `moody`, see `grade.ts`) and
`bubbleStyle` (`solid` / `outline`, see `TextBeatCard.tsx`) exist so
reels don't all look like the same template reused — pick a different pair
per reel rather than defaulting to the same combination every time.

`accentPhrase` must be an exact substring of `text`, and (per the content
plan) sits at the end of the sentence — the beat renders as two stacked
bubbles, split at that point: a neutral one, then the accent phrase in a
brand-colored one. A beat can also carry `"icon"`, one of the names in
`src/BrollReel/Icons.tsx` (`phone`, `camera`, `car`, `chart`, `pin`, `clock`,
`spark`, ...) — a small bouncing badge above the text, for a beat with a
concrete noun *or* a loosely related idea (a chart for "the economy," a
calendar for "the season"); it doesn't need to be literal. Most beats can
take one — leave it off only when nothing fits at all. Duration is driven
by the beats (last beat's `startSec + holdSec`), not the footage —
`broll` durations should add up to that, not the other way around.

**3. Render:** `npm run batch` picks the composition per job automatically
(`--overlay` works here too, for the Resolve hybrid workflow).

The 15-reel Philip Runs Ads batch is in
`jobs/philip-runs-ads-broll.example.json`, converted straight from the
content plan. Each job's `broll` starts out pointing at a placeholder path
(`public/jobs/<reel_id>.mp4`) — drop the matching clip(s) in and set real
trim points before rendering. `caption`/`hashtags` ride along in the
manifest for the post itself; the renderer ignores them.

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
