import { spawn } from "node:child_process";
import { mkdir, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const project = dirname(fileURLToPath(import.meta.url));
const website = resolve(project, "../..");
const scratch = resolve(website, ".video-output");
const media = resolve(website, "public/agents-demo");
const name = "agents-feature-v7-focused";
const cli = resolve(project, "node_modules/hyperframes/bin/hyperframes.mjs");

function run(command, args, requireReady = false) {
  return new Promise((accept, reject) => {
    const child = spawn(command, args, { cwd: project, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let captureWarning = false;
    for (const [input, output] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
      let tail = "";
      input.setEncoding("utf8").on("data", (text) => {
        const combined = tail + text;
        captureWarning ||= /sub_timeline_(readiness_timeout|script_failure)/.test(combined);
        tail = combined.slice(-100);
        output.write(text);
      });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`${command} exited with ${code}`));
      else if (requireReady && captureWarning) reject(new Error("Render setup was not ready. The movie will not be published."));
      else accept();
    });
  });
}

await mkdir(scratch, { recursive: true });
await mkdir(media, { recursive: true });
if (!process.argv.includes("--skip-build")) await run(process.execPath, [resolve(project, "capture/build.mjs")]);
await run(process.execPath, [cli, "check"]);
const square = resolve(scratch, `${name}-square.mp4`);
await run(process.execPath, [cli, "render", "--resolution", "square-4k", "--quality", "high",
  "--crf", "10", "--fps", "30", "--workers", "1", "--output", square], true);
// HyperFrames exposes fixed resolution presets. Crop export padding only:
// no resampling, zoom, sharpening filter or change to the native UI's geometry.
const master = resolve(scratch, `${name}-2x.mp4`);
await run("ffmpeg", ["-hide_banner", "-loglevel", "warning", "-y", "-i", square,
  "-vf", "crop=2160:1896:0:0", "-an", "-c:v", "libx264", "-preset", "slow",
  "-crf", "12", "-pix_fmt", "yuv420p", "-movflags", "+faststart", master]);
// A browser's fast video downscaler aliases small type at the 530px card size.
// Prefilter the normal web rendition; retain the master for larger/HiDPI cards.
const movie = resolve(scratch, `${name}.mp4`);
await run("ffmpeg", ["-hide_banner", "-loglevel", "warning", "-y", "-i", square,
  "-vf", "crop=2160:1896:0:0,scale=1080:948:flags=lanczos+accurate_rnd+full_chroma_int",
  "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "10", "-pix_fmt", "yuv420p",
  "-movflags", "+faststart", movie]);
const poster = resolve(scratch, `${name}-poster.webp`);
await run("ffmpeg", ["-hide_banner", "-loglevel", "warning", "-y", "-ss", "11.8", "-i", movie,
  "-frames:v", "1", "-quality", "94", poster]);
await rename(movie, resolve(media, `${name}.mp4`));
await rename(master, resolve(media, `${name}-2x.mp4`));
await rename(poster, resolve(media, `${name}-poster.webp`));
console.log(`Rendered ${name}: 1080x948 web / 2160x1896 master, 30fps, 28 seconds.`);
