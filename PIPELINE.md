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

## Blueprint walkthrough (from still photos)

For clients who send project photos instead of footage. Each room draws itself
as a blueprint on navy paper, the real photo scans in over the lines, and a
virtual camera moves through the still in 3D (depth map from Depth Anything
V2). Give a shot a `before` photo and it opens on the old room instead:
before → redrawn → built.

**1. Get the photos.** From an iCloud shared album link:

```bash
npm run fetch-album -- "https://photos.icloud.com/shared/album/<token>" work/<client>/raw
```

**2. Write a job** in `jobs/` (see `jobs/turnkey-walkthrough.json` and
`jobs/turnkey-before-after.json`). Per shot: `photo`, optional `before`,
`label`, `sheet` (the drawing number on the title block), optional `move`
(`push`, `push-left`, `push-right`, `truck-left`, `truck-right`, `rise`).
The `brand` block drives the end card and paper color.

Pick photos shot square-on to the room with clear straight lines (cabinets,
windows, tile). Those make the best line drawings. Portrait 3:4 iPhone photos
fill the 9:16 frame; landscape ones work as `before` prints.

**3. Prep** (once per photo; writes depth maps and line drawings next to the
resized photos in `public/<assetDir>/`):

```bash
pip install -r scripts/walkthrough/requirements.txt
npm run walkthrough:prep -- jobs/<job>.json
```

The depth model (~100MB) downloads once from Hugging Face to
`~/.cache/walkthrough/`.

**4. Render:**

```bash
npm run walkthrough -- jobs/<job>.json      # -> out/<id>.mp4
```

Renders through WebGL. On a headless Linux box it uses the software backend
(`--gl=swangle`), about 3 minutes for 25 seconds on 4 cores. Preview and
tweak in `npm run dev` under the **Walkthrough** composition.

| What | Where |
| --- | --- |
| Shot pacing (draw / reveal / hold) | `src/Walkthrough/timeline.ts` |
| Camera moves and strength | `src/Walkthrough/camera.ts` |
| Line weight, glow, overshoot | `src/Walkthrough/Wireframe.tsx` |
| How many lines, which ones | `MAX_LINES`, `min_len` in `scripts/walkthrough/prep.py` |
