// Screenshots the page at chosen scroll positions, for checking the joins between sections.
//   node tools/at.mjs <label> <w> <h> <spec>... [--reduce=1]
//   spec = <elementId>@<fraction>[@<offsetInViewports>]   y = top + fraction*(height - viewport) + offset*viewport
//   e.g.  hero@1   neatink@0@-0.5   experience@0
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const [label, w, h, ...rest] = process.argv.slice(2);
const specs = rest.filter((a) => !a.startsWith('--'));
const opt = Object.fromEntries(rest.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const OUT = `tools/out/${label}/`;
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const mobile = +w < 700;
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--hide-scrollbars'] });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: opt.reduce ? 'reduce' : 'no-preference' }]);
await p.setViewport({ width: +w, height: +h, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto('http://localhost:5199/', { waitUntil: 'networkidle0' });
await wait(2200);
for (const s of specs) {
  const [id, frac = '0', off = '0'] = s.split('@');
  const y = await p.evaluate((i, f, o) => {
    const el = document.getElementById(i) ?? document.querySelector(i);
    const r = el.getBoundingClientRect();
    return r.top + scrollY + f * (r.height - innerHeight) + o * innerHeight;
  }, id, +frac, +off);
  await p.evaluate((yy) => scrollTo(0, yy), y);
  await wait(1800);
  await p.screenshot({ path: `${OUT}${s.replace(/[^a-z0-9.-]/gi, '_')}.png` });
  console.log(s, '-> y', Math.round(y));
}
console.log(errors.length ? 'errors: ' + [...new Set(errors)].join(' | ') : 'no console errors');
await b.close();
