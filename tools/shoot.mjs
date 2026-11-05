// Scroll-scrub checker. Opens the site in system Chrome with motion ON (headless Chrome here reports
// reduced motion, which would hide every scene), jumps to fixed progress points in a scene, screenshots each,
// then returns to the first points from the other direction and compares pixels: reverse playback must match.
//
//   node tools/shoot.mjs <label> <w> <h> <scene|hero|page> [p1,p2,...] [--url=http://localhost:5199/] [--dpr=1]
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const [label, w, h, scene = 'hero', pts = '0,0.5,1', ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const URL_ = opt.url ?? 'http://localhost:5199/';
const OUT = `tools/out/${label}/`;
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const mobile = +w < 700;

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-first-run', '--hide-scrollbars'],
});
const page = await browser.newPage();
if (opt.motion === 'off') await page.evaluateOnNewDocument(() => localStorage.setItem('motion', 'off')); // the page's own switch
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: +(opt.dpr ?? 1), isMobile: mobile, hasTouch: mobile });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', (r) => errors.push('REQFAIL ' + r.url()));

await page.goto(URL_, { waitUntil: 'networkidle0' });
await wait(2200); // hero animation + fonts

// Reverse playback must reproduce the forward frame. GPU raster noise of 1-2 levels in blurred shadows is not a difference.
const raw = async (b) => (await sharp(b).raw().toBuffer());
const same = async (a, b) => { const [A, B] = [await raw(a), await raw(b)]; let n = 0; for (let i = 0; i < A.length; i++) if (Math.abs(A[i] - B[i]) > 3) n++; return n > A.length * 0.005 ? n : 0; };
const info = await page.evaluate(() => ({ docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth, vw: innerWidth }));
console.log('page', info, info.docW > info.vw ? 'HORIZONTAL SCROLL!' : 'no horizontal scroll');

async function range() {
  return page.evaluate((id) => {
    const sec = document.getElementById(id);
    const sp = sec.querySelector(':scope > .pin-spacer, :scope .pin-spacer');
    const top = sec.getBoundingClientRect().top + scrollY;
    if (sp) return { start: top, dist: sp.getBoundingClientRect().height - innerHeight };
    // not pinned: from the moment it enters at the bottom until it leaves at the top
    return { start: top - innerHeight, dist: sec.getBoundingClientRect().height + innerHeight };
  }, scene);
}
async function goto(y) {
  await page.evaluate((yy) => scrollTo(0, yy), y);
  await wait(+(opt.settle ?? 1800)); // scrub smoothing is 0.6s
}

if (scene === 'hero' || scene === 'page') {
  await page.screenshot({ path: OUT + 'top.png' });
  if (scene === 'page') await page.screenshot({ path: OUT + 'full.png', fullPage: true });
} else {
  const { start, dist } = await range();
  console.log('scene range', { start: Math.round(start), dist: Math.round(dist) });
  const ps = pts.split(',').map(Number);
  const first = {};
  for (const p of ps) {
    await goto(start + p * dist);
    const buf = await page.screenshot({ path: `${OUT}p${String(Math.round(p * 100)).padStart(3, '0')}.png` });
    first[p] = buf;
  }
  // Reverse check: visit points back-to-front and compare with the forward pass.
  let bad = 0;
  for (const p of [...ps].reverse()) {
    await goto(start + p * dist);
    const buf = await page.screenshot({ path: `${OUT}r${String(Math.round(p * 100)).padStart(3, '0')}.png` });
    const diff = await same(first[p], buf);
    if (diff) bad++;
    console.log(`p=${p}: ${diff ? diff + ' pixels differ' : 'identical'}`);
  }
  console.log(bad ? `REVERSE MISMATCH at ${bad} point(s)` : 'reverse playback identical at every point');
}
console.log(errors.length ? 'console issues:\n' + [...new Set(errors)].join('\n') : 'no console errors');
await browser.close();
