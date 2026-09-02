// Batch-render reels from a job manifest.
//
// Two job shapes, picked by `composition` (default "Reel"):
//   - "Reel": talking-head captions aligned to speech. For each job:
//       1. aligns the script to the video's real speech timing -> captions JSON
//          (skipped if the JSON already exists, so reruns are cheap)
//       2. renders the branded reel to out/<id>.mp4
//   - "BrollReel": pre-timed text beats over ambient b-roll, no speech to
//     align — renders straight from the job's `beats` array.
//
// Usage:
//   node scripts/batch.mjs                 # renders every job in jobs/jobs.json
//   node scripts/batch.mjs acme-01 acme-02 # only these job ids
//   node scripts/batch.mjs --overlay       # alpha-channel graphics only (for Resolve)
//   node scripts/batch.mjs --manifest=jobs/other.json
//
// Job manifest format: see jobs/jobs.example.json and
// jobs/philip-runs-ads-broll.example.json

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const ids = args.filter((a) => !a.startsWith("--"));

const overlayOnly = flags.includes("--overlay");
const manifestFlag = flags.find((f) => f.startsWith("--manifest="));
const manifestPath = manifestFlag
  ? manifestFlag.split("=")[1]
  : "jobs/jobs.json";

// A browser binary can be provided for environments without a downloadable
// Chrome (e.g. CI, sandboxes). Locally this is unset and Remotion handles it.
const browser = process.env.REMOTION_BROWSER_EXECUTABLE;

if (!existsSync(manifestPath)) {
  console.error(
    `No manifest at ${manifestPath}. Copy jobs/jobs.example.json to jobs/jobs.json and edit it.`,
  );
  process.exit(1);
}

const allJobs = JSON.parse(readFileSync(manifestPath, "utf8"));
const jobs = ids.length ? allJobs.filter((j) => ids.includes(j.id)) : allJobs;

if (!jobs.length) {
  console.error(`No matching jobs. Known ids: ${allJobs.map((j) => j.id).join(", ")}`);
  process.exit(1);
}

mkdirSync("out", { recursive: true });

const run = (cmd, cmdArgs) =>
  execFileSync(cmd, cmdArgs, { stdio: "inherit", shell: false });

let ok = 0;
const failed = [];

for (const [i, job] of jobs.entries()) {
  const label = `[${i + 1}/${jobs.length}] ${job.id}`;
  console.log(`\n=== ${label} ===`);

  try {
    const composition = job.composition ?? "Reel";

    // `video` and `script` are paths relative to the repo root.
    // The video must live under public/ so Remotion can serve it.
    const videoPath = job.video;
    if (!existsSync(videoPath)) {
      throw new Error(
        `video not found: ${videoPath}${
          videoPath?.includes("INSERT_FILENAME")
            ? " (placeholder — assign the real b-roll clip first)"
            : ""
        }`,
      );
    }
    if (!videoPath.startsWith("public/")) {
      throw new Error(`video must be inside public/ (got ${videoPath})`);
    }

    // `src` is the path Remotion serves it from (relative to public/).
    const staticSrc = videoPath.replace(/^public\//, "");

    let props;
    if (composition === "BrollReel") {
      // No speech to align — text beats are pre-timed in the manifest.
      if (!Array.isArray(job.beats) || job.beats.length === 0) {
        throw new Error("BrollReel job needs a non-empty `beats` array");
      }
      props = {
        src: staticSrc,
        clientId: job.clientId,
        beats: job.beats,
        crossfadeSec: job.crossfadeSec ?? 0.12,
        overlayOnly,
      };
    } else {
      // 1. Captions — reuse if already generated.
      const captionsPath = videoPath.replace(
        /\.(mp4|mov|mkv|webm)$/i,
        ".json",
      );
      if (existsSync(captionsPath)) {
        console.log(`captions: reusing ${captionsPath}`);
      } else if (job.script && existsSync(job.script)) {
        console.log(`captions: aligning ${job.script}`);
        run("node", ["scripts/align-captions.mjs", videoPath, job.script]);
      } else {
        console.log("captions: no script given, rendering without captions");
      }

      props = {
        src: staticSrc,
        clientId: job.clientId,
        hook: job.hook ?? "",
        keyword: job.keyword ?? "",
        ctaCondition: job.ctaCondition ?? "",
        overlayOnly,
      };
    }

    const outFile = path.join(
      "out",
      overlayOnly ? `${job.id}-overlay.mov` : `${job.id}.mp4`,
    );

    const renderArgs = [
      "remotion",
      "render",
      composition,
      outFile,
      `--props=${JSON.stringify(props)}`,
    ];
    // Transparent overlays need a codec with an alpha channel.
    if (overlayOnly) {
      renderArgs.push("--codec=prores", "--prores-profile=4444", "--image-format=png");
    }
    if (browser) renderArgs.push(`--browser-executable=${browser}`);

    run("npx", renderArgs);
    console.log(`✓ ${outFile}`);
    ok++;
  } catch (err) {
    console.error(`✗ ${job.id}: ${err.message}`);
    failed.push(job.id);
  }
}

console.log(`\nDone. ${ok}/${jobs.length} rendered.`);
if (failed.length) {
  console.log(`Failed: ${failed.join(", ")}`);
  process.exit(1);
}
