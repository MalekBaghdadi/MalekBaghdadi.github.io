// Bug Run (the game behind the Play button): it opens, plays, can be beaten for a while by a simple bot (the course is
// always clearable), keeps a steady frame rate, shows its day/sunset/night/dawn skies, and gives the page back on close.
//   node tools/game-test.mjs [url]        (dev server: the bot uses a hook that only exists there; CHROME=... for another browser)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const url = process.argv[2] ?? 'http://localhost:5199/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); };
mkdirSync('tools/out/game', { recursive: true });

const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const phone = w < 700;
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: phone ? 3 : 1, isMobile: phone, hasTouch: phone });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(url, { waitUntil: 'networkidle0' });
  await wait(1500);
  const tag = phone ? 'phone: ' : '';
  const scripts = await p.evaluate(() => performance.getEntriesByType('resource').filter((r) => /bugrun/.test(r.name)).length);
  check(`${tag}the game is not loaded with the page`, scripts === 0);
  await p.evaluate(() => { const s = document.getElementById('games'); scrollTo(0, s.getBoundingClientRect().top + scrollY - innerHeight * 0.3); });
  await wait(1200);
  if (phone) await p.tap('.play'); else await p.click('.play');
  await wait(900);
  const open = await p.evaluate(() => ({ open: document.querySelector('.bugrun')?.open, locked: document.documentElement.classList.contains('game-open'), card: document.querySelector('.br-card')?.innerText ?? '', hook: !!window.__bugrun }));
  check(`${tag}Play opens the game on its title card`, open.open && open.locked && /start/i.test(open.card), open.card.replace(/\s+/g, ' ').slice(0, 60));
  if (!open.hook) { check(`${tag}the dev hook is there (run this against the dev server)`, false); continue; }
  const scrollBefore = await p.evaluate(() => scrollY);

  // A simple bot: jump at bugs and low flies when they get close, run under the high flies.
  await p.evaluate(() => {
    const g = window.__bugrun;
    g.press(); setTimeout(g.release, 40); // start
    window.__bot = { deaths: 0, top: 0, frames: [] };
    let last = performance.now(), holding = 0;
    (function tick(now) {
      window.__bot.frames.push(now - last); last = now;
      const s = g.peek();
      if (s.state === 'dead') { window.__bot.deaths++; window.__bot.top = Math.max(window.__bot.top, s.score); g.press(); g.release(); }
      if (s.state === 'play') {
        window.__bot.top = Math.max(window.__bot.top, s.score);
        const ahead = s.foes.filter((f) => f.x + f.w > 44 && !(f.kind === 'fly' && f.y < 92 - 20)).sort((a, b) => a.x - b.x)[0];
        if (ahead && s.ground && !holding && ahead.x - 52 < s.speed * 0.2) { g.press(); holding = now; }
        if (holding && now - holding > 230) { g.release(); holding = 0; }
      }
      if (!window.__botStop) requestAnimationFrame(tick);
    })(last);
  });
  await wait(25000);
  check(`${tag}the page behind stays put while playing`, (await p.evaluate(() => scrollY)) === scrollBefore);
  const bot = await p.evaluate(() => { const f = window.__bot.frames.slice(5).sort((a, b) => a - b); return { deaths: window.__bot.deaths, top: window.__bot.top, n: f.length, med: f[Math.floor(f.length / 2)], p95: f[Math.floor(f.length * 0.95)] }; });
  check(`${tag}a simple bot survives 25 s of bugs, pairs and flies (the course is always clearable)`, bot.deaths === 0 && bot.top >= 300, `best ${bot.top}, ${bot.deaths} crash(es)`);
  check(`${tag}steady frame rate while playing`, bot.med < 18 && bot.p95 < 25, `median ${bot.med?.toFixed(1)} ms, p95 ${bot.p95?.toFixed(1)} ms over ${bot.n} frames`);

  // the sky through the day, by skipping the score ahead
  for (const [name, pts] of [['day', 100], ['sunset', 430], ['night', 820], ['dawn', 1220]]) {
    await p.evaluate((n) => window.__bugrun.skipTo(n), pts); // the bot keeps playing meanwhile
    await wait(500);
    // the canvas's own pixels, scaled up 4x without smoothing (a page screenshot of a top-layer dialog goes astray on a
    // phone viewport, where Puppeteer resizes the viewport to take it)
    const png = Buffer.from((await p.evaluate(() => document.querySelector('.br-screen canvas').toDataURL('image/png'))).split(',')[1], 'base64');
    const { width } = await sharp(png).metadata();
    await sharp(png).resize(width * 4, null, { kernel: 'nearest' }).toFile(`tools/out/game/${phone ? 'phone' : 'desktop'}-${name}.png`);
  }
  console.log(`     screenshots of the sky in tools/out/game/${phone ? 'phone' : 'desktop'}-*.png`);
  await p.evaluate(() => { window.__botStop = true; });

  await p.keyboard.press('Escape');
  await wait(500);
  const closed = await p.evaluate(() => ({ open: document.querySelector('.bugrun').open, locked: document.documentElement.classList.contains('game-open') || document.documentElement.classList.contains('lenis-stopped'), focus: document.activeElement?.className }));
  check(`${tag}Esc closes it and gives the page back`, !closed.open && !closed.locked && closed.focus === 'play', JSON.stringify(closed));
  await p.evaluate(() => scrollBy(0, 300));
  await wait(400);
  check(`${tag}the page scrolls again`, (await p.evaluate(() => scrollY)) > scrollBefore + 100);
  check(`no page errors (${phone ? 'phone' : 'desktop'})`, !errors.length, errors.join(' | '));
  await p.close();
}
await browser.close();
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exitCode = failed ? 1 : 0;
