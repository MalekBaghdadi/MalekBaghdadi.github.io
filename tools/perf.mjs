// Frame-time check: scrolls through one scene at a steady pace and reports how smooth the page stays.
//   node tools/perf.mjs <w> <h> <scene> [--cpu=4] [--px=1500]  (px = scroll speed in px/second)
import puppeteer from 'puppeteer-core';
const [w, h, scene, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map((a) => a.slice(2).split('=')));
const mobile = +w < 700;
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--hide-scrollbars'] });
const pg = await b.newPage();
await pg.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await pg.setViewport({ width: +w, height: +h, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
await pg.goto('http://localhost:5199/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2000));
const cdp = await pg.createCDPSession();
await cdp.send('Emulation.setCPUThrottlingRate', { rate: +(opt.cpu ?? 1) });
const res = await pg.evaluate(async (id, pxs) => {
  const sec = document.getElementById(id), sp = sec.querySelector('.pin-spacer');
  const start = sec.getBoundingClientRect().top + scrollY, dist = sp.getBoundingClientRect().height - innerHeight;
  scrollTo(0, start); await new Promise((r) => setTimeout(r, 1500));
  const dts = [], slowAt = []; let last = performance.now(), y = start, t0 = last;
  await new Promise((done) => {
    (function tick(now) {
      dts.push(now - last); if (now - last > 50) slowAt.push(`${Math.round(now - last)}ms@${Math.round(((y - start) / dist) * 100)}%`); y = start + Math.min(dist, ((now - t0) / 1000) * pxs); last = now; scrollTo(0, y);
      y >= start + dist ? done() : requestAnimationFrame(tick);
    })(last);
  });
  dts.shift(); dts.sort((a, b) => a - b);
  const q = (p) => dts[Math.floor(dts.length * p)];
  return { frames: dts.length, seconds: ((performance.now() - t0) / 1000).toFixed(1), median: q(0.5).toFixed(1), p95: q(0.95).toFixed(1), p99: q(0.99).toFixed(1), max: dts[dts.length - 1].toFixed(0), slow: dts.filter((d) => d > 50).length, slowAt: slowAt.join(' ') };
}, scene, +(opt.px ?? 1500));
console.log(`${scene} ${w}x${h} cpu x${opt.cpu ?? 1}:`, JSON.stringify(res), '(ms per frame; 16.7 = 60fps)');
await b.close();
