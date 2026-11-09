// Captures the real Logbook app (local emulators, invented data) as a frame sequence for the portfolio scene.
//   node tools/lb/capture.mjs            full capture -> public/logbook/*.webp + src/scenes/logbook-manifest.json
//   node tools/lb/capture.mjs --shots    also saves a PNG at every chapter, to review the flow first
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { APP, startEnv, stopEnv, writeDocs, signUpUser, resetAccounts, demoDocs, competeDocs } from './env.mjs';

const SHOTS = process.argv.includes('--shots');
const OUT = 'public/logbook/';
const DBG = 'tools/out/lb-capture/';
const WIDTH = 420;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(DBG, { recursive: true });
let browser;
try {
  await startEnv();
  await resetAccounts();
  const uid = await signUpUser('demo@logbook.test', 'emulator-only-pass');
  await writeDocs([...demoDocs(uid), ...competeDocs(uid)]);

  browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(APP, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.setItem('logbook:e2e-ach', '1'));
  await page.type('#email', 'demo@logbook.test');
  await page.type('#password', 'emulator-only-pass');
  await page.locator('button[type=submit]').click();
  await wait(4000);

  const press = async (label) => {
    const ok = await page.evaluate((l) => {
      const b = [...document.querySelectorAll('button, a')].find((x) => x.innerText.trim() === l || x.getAttribute('aria-label') === l);
      b?.scrollIntoView({ block: 'center' });
      b?.click();
      return !!b;
    }, label);
    if (!ok) throw new Error('no button: ' + label);
  };
  const goTab = (hash) => page.evaluate((h) => document.querySelector(`nav.fixed a[href="${h}"]`).click(), hash);
  await press('Dismiss'); // the "23 achievements" banner covers the first row
  await wait(500);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Got it')?.click()); // the install hint
  await wait(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(400);

  // ---- record ----
  const client = await page.createCDPSession();
  const frames = [];
  client.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ ts: metadata.timestamp, data });
    try { await client.send('Page.screencastFrameAck', { sessionId }); } catch { /* ended */ }
  });
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  await wait(300);
  const marks = {};
  const mark = async (name, hold = 0) => { marks[name] = Date.now() / 1000; if (SHOTS) await page.screenshot({ path: `${DBG}${name}.png` }); await wait(hold); };

  await mark('today', 1000);
  await press('Add 30m to Studying'); await wait(1000);
  await press('Add 30m to Studying'); await wait(1000);
  await press('Add 10 pages to Reading'); await wait(950);
  await press('Mark Gym done'); await wait(950);
  await press('Add 2 glasses to Water'); await wait(1100);
  await mark('today-done', 450);

  await goTab('#/history'); await mark('history', 800);
  await press('Previous month'); await wait(1000);
  await mark('history-month', 700);

  await goTab('#/compete'); await wait(1100);
  await mark('compete', 1100);

  await goTab('#/profile'); await wait(1000);
  await mark('profile', 500);
  await press('Collect all'); await wait(900);
  await mark('reveal', 500);
  await page.touchscreen.tap(195, 370); await wait(1000); // flip the first card
  await mark('flipped', 800);
  await press('Collect all 23'); await wait(2400);
  await mark('collected', 600);
  await page.keyboard.press('Escape'); await wait(1000);
  await mark('binder', 900);

  await client.send('Page.stopScreencast');
  const end = Date.now() / 1000;
  await wait(300);

  // ---- choose and encode frames ----
  frames.sort((a, b) => a.ts - b.ts);
  const t0 = frames[0].ts;
  const keep = [];
  frames.forEach((f, i) => {
    const next = frames[i + 1];
    const settles = !next || (next.ts - f.ts) > 0.15;     // the last frame before the screen goes still
    const spaced = !keep.length || (f.ts - keep[keep.length - 1].ts) >= 0.1; // ~10 fps; the scene cross-fades between frames
    if (settles || spaced) keep.push(f);
  });
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  let bytes = 0, h = 0;
  const list = [];
  for (const [i, f] of keep.entries()) {
    const name = `f${String(i).padStart(3, '0')}.webp`;
    const buf = await sharp(Buffer.from(f.data, 'base64')).resize({ width: WIDTH }).webp({ quality: 62 }).toBuffer();
    h = (await sharp(buf).metadata()).height;
    writeFileSync(OUT + name, buf);
    bytes += buf.length;
    list.push({ t: Math.round((f.ts - t0) * 1000), f: name });
  }
  const rel = Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, Math.round((v - t0) * 1000)]));
  writeFileSync('src/scenes/logbook-manifest.json', JSON.stringify({ w: WIDTH, h, duration: Math.round((end - t0) * 1000), marks: rel, frames: list }));
  console.log(`captured ${frames.length} raw frames, kept ${keep.length}, ${Math.round(bytes / 1024)} KB, ${WIDTH}x${h}, ${((end - t0)).toFixed(1)} s`);
  console.log('marks (ms):', JSON.stringify(rel));
  console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
} catch (e) {
  console.error('FAILED', e.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  stopEnv();
}
