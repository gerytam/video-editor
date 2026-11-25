// Render a Walkthrough job: node scripts/walkthrough/render.mjs jobs/<job>.json
//
// Checks prep.py has run for every photo, then renders out/<id>.mp4.
// Env:
//   REMOTION_BROWSER_EXECUTABLE  use an existing Chrome (headless servers)
//   WALKTHROUGH_GL               WebGL backend; defaults to "swangle" on Linux
//                                (software, works without a GPU), "angle" elsewhere

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const jobPath = process.argv[2];
if (!jobPath || !existsSync(jobPath)) {
  console.error("usage: node scripts/walkthrough/render.mjs jobs/<job>.json");
  process.exit(1);
}
const job = JSON.parse(readFileSync(jobPath, "utf8"));

const missing = [];
for (const shot of job.shots) {
  for (const file of [shot.photo, shot.before].filter(Boolean)) {
    const stem = file.replace(/\.[^.]+$/, "");
    for (const ext of [".jpg", ".depth.png", ".lines.json"]) {
      const p = path.join("public", job.assetDir, stem + ext);
      if (!existsSync(p)) missing.push(p);
    }
  }
}
if (missing.length) {
  console.error(`Missing prepared assets (${missing.length}), e.g. ${missing[0]}`);
  console.error(`Run: python3 scripts/walkthrough/prep.py ${jobPath}`);
  process.exit(1);
}

mkdirSync("out", { recursive: true });
const out = `out/${job.id}.mp4`;
const gl = process.env.WALKTHROUGH_GL ?? (process.platform === "linux" ? "swangle" : "angle");
const args = [
  "remotion",
  "render",
  "Walkthrough",
  out,
  `--props=${jobPath}`,
  `--gl=${gl}`,
  "--crf=16",
];
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  args.push(`--browser-executable=${process.env.REMOTION_BROWSER_EXECUTABLE}`);
}
execFileSync("npx", args, { stdio: "inherit" });
console.log(`\n-> ${out}`);
