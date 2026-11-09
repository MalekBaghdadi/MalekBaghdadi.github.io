// Grabs the three app screens shown in the hero: NeatInk mid-handwriting and Pigeon's map (both from the rebuilt
// scenes, at fixed timeline points) and a real Logbook frame. Needs the dev server on :5199.
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { mkdirSync, copyFileSync } from 'node:fs';
import manifest from '../src/scenes/logbook-manifest.json' with { type: 'json' };

const OUT = 'public/hero/';
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--hide-scrollbars'] });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await p.goto('http://localhost:5199/', { waitUntil: 'networkidle0' });
await wait(2500);

// t is a position on the scene's own timeline (the scrubbed timeline runs to 1.03 including its hold)
async function shotAt(id, t, selector, width, file) {
  const y = await p.evaluate((i, tt) => {
    const s = document.getElementById(i), sp = s.querySelector('.pin-spacer');
    return s.getBoundingClientRect().top + scrollY + (tt / 1.03) * (sp.getBoundingClientRect().height - innerHeight);
  }, id, t);
  await p.evaluate((yy) => scrollTo(0, yy), y);
  await wait(2600);
  // clip by on-screen rectangle: an element screenshot would scroll it into view and rewind the pinned scene
  const r = await p.evaluate((sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height }; }, selector); // clip is in page coordinates
  const png = await p.screenshot({ type: 'png', clip: r, captureBeyondViewport: false });
  const out = await sharp(png).resize({ width }).webp({ quality: 82 }).toBuffer();
  await sharp(out).toFile(OUT + file);
  console.log(file, (await sharp(out).metadata()).width + 'x' + (await sharp(out).metadata()).height, Math.round(out.length / 1024) + ' KB');
}
await shotAt('neatink', 0.24, '.ni-view', 1280, 'neatink.webp');
await shotAt('pigeon', 0.399, '.pg-screen', 600, 'pigeon.webp');
await b.close();

const at = manifest.marks['today-done'];
const frame = [...manifest.frames].reverse().find((f) => f.t <= at);
copyFileSync('public/logbook/' + frame.f, OUT + 'logbook.webp');
console.log('logbook.webp <-', frame.f, `(${manifest.w}x${manifest.h})`);
