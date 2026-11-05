// Renders sample handwriting in two Hershey fonts to a PNG so the look can be judged before it is wired in.
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { handwrite } from './ink-lib.mjs';
mkdirSync('tools/out', { recursive: true });
let body = '', y = 50;
for (const font of ['cursive', 'scripts']) {
  for (const [i, t] of ['Monday notes', "finish the report, it isnt due till friday", 'call the team about the demo'].entries()) {
    const { strokes } = handwrite(t, { x: 30, baseline: y, scale: i === 0 ? 2.1 : 1.45, size: i === 0 ? 3.4 : 2.5, font, seed: 3 + i });
    body += strokes.map((s) => `<path d="${s.f}" fill="#1c1f33"/>`).join('');
    y += i === 0 ? 62 : 44;
  }
  y += 30;
}
writeFileSync('tools/out/ink-preview.html', `<body style="margin:0;background:#fbf5e6"><svg width="900" height="${y}" viewBox="0 0 900 ${y}">${body}</svg></body>`);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage(); await p.setViewport({ width: 900, height: y, deviceScaleFactor: 1.5 });
await p.goto(pathToFileURL('tools/out/ink-preview.html').href); await p.screenshot({ path: 'tools/out/ink-preview.png' }); await b.close();
console.log('ok', y);
