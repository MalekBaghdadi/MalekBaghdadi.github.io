// At the very bottom of the page, every scroll animation in the footer must have finished (nothing left half faded).
//   node tools/end-state.mjs [url]
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://localhost:5199/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
let bad = 0;
for (const [w, h] of [[1440, 900], [390, 844], [360, 640]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700 });
  await p.goto(url, { waitUntil: 'networkidle0' });
  await wait(2000);
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await wait(2500);
  const r = await p.evaluate(() => {
    const c = document.querySelector('.contact');
    const faded = [...c.querySelectorAll('dt, dd')].map((e) => +getComputedStyle(e).opacity).filter((o) => o < 0.99).length;
    const narrow = [...c.querySelectorAll('h2 .ch')].filter((e) => parseFloat(getComputedStyle(e).fontStretch) < 124).length;
    return { clip: getComputedStyle(c).clipPath, faded, narrow };
  });
  const ok = r.faded === 0 && r.narrow === 0 && /inset\(0(px|%)?( 0(px|%)?)*( round 0px)?\)|none/.test(r.clip);
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${w}x${h}: ${r.faded} faded rows, ${r.narrow} narrow letters, clip ${r.clip}`);
  await p.close();
}
await b.close();
process.exitCode = bad ? 1 : 0;
