// Render the launch film to MP4 (+ a poster PNG of frame 1).
//   node marketing/launch-video/render.mjs                 -> all formats
//   node marketing/launch-video/render.mjs 4x5             -> one format
//   node marketing/launch-video/render.mjs stills 4x5 0,3.5,5.2
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, 'out', process.env.OUT_DIR || '2026-11-12');
const FPS = 30;
const FORMATS = {
  '4x5': [1080, 1350],  // LinkedIn / Instagram feed / X
  '9x16': [1080, 1920], // Reels / Stories
  '16x9': [1920, 1080], // website banner / X / LinkedIn landscape
};

mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
// Use Playwright's own browser if present, else any cached headless shell (or $CHROMIUM_PATH).
function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  if (!existsSync(cache)) return undefined;
  for (const d of readdirSync(cache).filter(d => d.startsWith('chromium_headless_shell-')).sort().reverse()) {
    for (const sub of readdirSync(path.join(cache, d))) {
      const exe = path.join(cache, d, sub, 'chrome-headless-shell');
      if (existsSync(exe)) return exe;
    }
  }
}
let browser;
try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ executablePath: findChromium() }); }

async function open(name) {
  const [w, h] = FORMATS[name];
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(DIR, 'index.html')).href + `?w=${w}&h=${h}&render`);
  await page.waitForFunction(() => window.__ready === true);
  return page;
}

async function frame(page, t) {
  await page.evaluate(t => window.seek(t), t);
  return page.screenshot({ type: 'png' });
}

if (args[0] === 'stills') {
  const name = args[1] || '4x5';
  const times = (args[2] || '0,3.5,5.2,7,8.9,10.8,12.2,14,15.9,19').split(',').map(Number);
  const page = await open(name);
  for (const t of times) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(path.join(OUT, `still-${name}-${t.toFixed(2)}.png`), await frame(page, t));
  }
  console.log(`stills written to ${OUT}`);
} else {
  for (const name of args.length ? args : Object.keys(FORMATS)) {
    const page = await open(name);
    const duration = await page.evaluate(() => window.DURATION);
    const { writeFileSync } = await import('node:fs');
    writeFileSync(path.join(OUT, `koda-launch-${name}-poster.png`), await frame(page, 0));
    const file = path.join(OUT, `koda-launch-${name}.mp4`);
    const ff = spawn('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', // silent track: some feeds reject video with no audio
      '-shortest', '-map', '0:v', '-map', '1:a',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high',
      '-pix_fmt', 'yuv420p', '-color_range', 'tv',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', file,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const total = Math.round(duration * FPS);
    for (let i = 0; i < total; i++) {
      const buf = await frame(page, i / FPS);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 60 === 0) process.stdout.write(`\r${name} ${i}/${total}`);
    }
    ff.stdin.end();
    await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
    console.log(`\r${name} done -> ${file}`);
    await page.close();
  }
}
await browser.close();
