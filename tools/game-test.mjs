// Bug Run (the game behind the Play button), played in the page: it opens where the runner's course was (no window
// over the page, nothing locked), takes the keyboard without scrolling the page, its buttons do only their own thing
// (sound never closes or pauses it), a simple bot can play it for a while (the course is always clearable) at a steady
// frame rate, it waits when it is clicked away from or scrolled away, it shows its four skies, and ✕ or Esc fold it
// back into the course and give the section its height back. On a desktop and a phone.
//   node tools/game-test.mjs [url]        (dev server: the bot uses a hook that only exists there; CHROME=... for another browser)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const url = process.argv[2] ?? 'http://localhost:5199/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); };
mkdirSync('tools/out/game', { recursive: true });

// a desktop reports a mouse (headless Chrome otherwise reports no pointer at all), a phone a finger
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4'],
});
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const phone = w < 700, tag = phone ? 'phone: ' : '';
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: phone ? 3 : 1, isMobile: phone, hasTouch: phone });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(url, { waitUntil: 'networkidle0' });
  await wait(1500);
  const peek = () => p.evaluate(() => window.__bugrun?.peek());
  const centre = (sel) => p.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  const press = async (sel) => { const [x, y] = await centre(sel); if (phone) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); };
  const shown = (sel) => p.$eval(sel, (e) => { const s = getComputedStyle(e); return s.visibility !== 'hidden' && +s.opacity > 0.9 && e.getBoundingClientRect().height > 0; });

  const scripts = await p.evaluate(() => performance.getEntriesByType('resource').filter((r) => /bugrun/.test(r.name)).length);
  check(`${tag}the game is not loaded with the page`, scripts === 0);
  await p.evaluate(() => { const s = document.getElementById('games'); scrollTo(0, s.getBoundingClientRect().top + scrollY - 40); });
  await wait(1200);
  const closedHeight = await p.$eval('#games', (s) => s.offsetHeight);

  await press('.play');
  await wait(1600);
  const open = await p.evaluate(() => {
    const panel = document.querySelector('.bugrun'), c = panel?.querySelector('canvas'), dpr = devicePixelRatio;
    return {
      inPage: !!panel && !panel.hidden && !!panel.closest('#games') && !document.querySelector('dialog[open]'),
      unlocked: !document.documentElement.classList.contains('game-open') && getComputedStyle(document.documentElement).overflow !== 'hidden',
      card: document.querySelector('.br-card')?.innerText.replace(/\s+/g, ' ') ?? '',
      focus: document.activeElement?.classList.contains('br-screen'),
      crisp: c ? (c.getBoundingClientRect().width * dpr) / c.width : 0,
      whole: c ? c.getBoundingClientRect().bottom <= innerHeight && c.getBoundingClientRect().top >= 0 : false,
    };
  });
  check(`${tag}Play opens the game in the page, where the course was (no window over the page)`, open.inPage && open.unlocked);
  check(`${tag}on its title card, all of it on screen`, /start/i.test(open.card) && open.whole, open.card.slice(0, 50));
  check(`${tag}the course and the Play button make way for it`, !(await shown('.play')) && !(await shown('.runner')));
  check(`${tag}crisp pixels: whole device pixels per art pixel`, Math.abs(open.crisp - Math.round(open.crisp)) < 0.01 && open.crisp >= 2, `${open.crisp.toFixed(2)} per pixel, ${(await peek())?.W} wide`);
  if (!phone) check('the game has the keyboard straight away', open.focus);
  if (!(await peek())) { check(`${tag}the dev hook is there (run this against the dev server)`, false); continue; }

  // start, and the page stays where it is: Space jumps, it doesn't scroll
  const y0 = await p.evaluate(() => scrollY);
  if (phone) await press('.br-screen'); else await p.keyboard.press('Space');
  await wait(400);
  check(`${tag}${phone ? 'a tap' : 'Space'} starts a run, and the page doesn't scroll`, (await peek()).state === 'play' && (await p.evaluate(() => scrollY)) === y0);

  // the sound button: on its icon (what used to close the game), twice
  for (const want of ['true', 'false']) {
    const [x, y] = await p.$$eval('.br-sound svg', (l) => { // the icon showing, on its speaker
      const r = l.find((s) => s.getBoundingClientRect().width).querySelector('path').getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    });
    if (phone) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y);
    await wait(250);
    const s = await p.evaluate(() => ({ pressed: document.querySelector('.br-sound').getAttribute('aria-pressed'), open: !document.querySelector('.bugrun').hidden, state: window.__bugrun.peek().state, focus: document.activeElement?.classList.contains('br-screen') }));
    check(`${tag}sound ${want === 'true' ? 'on' : 'off'} from its icon: the game stays open and running${phone ? '' : ', with the keyboard'}`, s.pressed === want && s.open && s.state === 'play' && (phone || s.focus), JSON.stringify(s));
  }

  // A simple bot: jump at bugs and low flies when they get close, run under the high flies.
  await p.evaluate(() => {
    const g = window.__bugrun;
    window.__bot = { deaths: 0, top: 0, frames: [] };
    let last = performance.now(), holding = 0;
    (function tick(now) {
      window.__bot.frames.push(now - last); last = now;
      const s = g.peek();
      if (s.state === 'dead') { if (window.__bot.was !== 'dead') window.__bot.deaths++; window.__bot.top = Math.max(window.__bot.top, s.score); g.press(); g.release(); }
      window.__bot.was = s.state;
      if (s.state === 'play') {
        window.__bot.top = Math.max(window.__bot.top, s.score);
        const ahead = s.foes.filter((f) => f.x + f.w > 44 && !(f.kind === 'fly' && f.y < 92 - 20)).sort((a, b) => a.x - b.x)[0];
        if (ahead && s.ground && !holding && ahead.x - 52 < s.speed * 0.2) { g.press(); holding = now; }
        if (holding && now - holding > 230) { g.release(); holding = 0; }
      }
      if (!window.__botStop) requestAnimationFrame(tick);
    })(last);
  });
  await wait(20000);
  check(`${tag}the page stays put while playing`, (await p.evaluate(() => scrollY)) === y0);
  const bot = await p.evaluate(() => { const f = window.__bot.frames.slice(5).sort((a, b) => a - b); return { deaths: window.__bot.deaths, top: window.__bot.top, n: f.length, med: f[Math.floor(f.length / 2)], p95: f[Math.floor(f.length * 0.95)] }; });
  check(`${tag}a simple bot survives 20 s of bugs, pairs and flies (the course is always clearable)`, bot.deaths === 0 && bot.top >= 250, `best ${bot.top}, ${bot.deaths} crash(es)`);
  check(`${tag}steady frame rate while playing`, bot.med < 18 && bot.p95 < 25, `median ${bot.med?.toFixed(1)} ms, p95 ${bot.p95?.toFixed(1)} ms over ${bot.n} frames`);

  // the sky through the day, by skipping the score ahead
  for (const [name, at] of [['day', 120], ['sunset', 520], ['night', 900], ['dawn', 1300]]) {
    await p.evaluate((pts) => window.__bugrun.skipTo(pts), at);
    await wait(700);
    const data = await p.evaluate(() => document.querySelector('.bugrun canvas').toDataURL('image/png'));
    const png = Buffer.from(data.split(',')[1], 'base64');
    const m = await sharp(png).metadata();
    await sharp(png).resize(m.width * 4, m.height * 4, { kernel: 'nearest' }).toFile(`tools/out/game/${phone ? 'phone' : 'desktop'}-${name}.png`);
  }
  await p.evaluate(() => { window.__botStop = true; });
  console.log(`     screenshots of the sky in tools/out/game/${phone ? 'phone' : 'desktop'}-*.png`);

  // a press anywhere else on the page holds the run; a press on the game carries on, without a jump
  for (let k = 0; k < 60 && !(await peek()).ground; k++) await wait(20); // (once the runner is down)
  await press('#games > h2');
  await wait(300);
  const held = await p.evaluate(() => ({ state: window.__bugrun.peek().state, card: document.querySelector('.br-card').innerText }));
  check(`${tag}a press elsewhere on the page pauses it`, held.state === 'paused' && /Paused/.test(held.card), held.state);
  await wait(300);
  check(`${tag}and it rests while paused (no frames drawn)`, !(await peek()).running);
  const yBefore = (await peek()).y;
  await press('.br-screen');
  await wait(120);
  const back = await peek();
  check(`${tag}a press on the game carries on where it was`, back.state === 'play' && Math.abs(back.y - yBefore) < 1, `${back.state}, y ${yBefore} -> ${back.y.toFixed(1)}`);

  // scrolled away it waits; scrolled back it shows where it stopped
  await p.evaluate(() => scrollBy(0, innerHeight * 1.5));
  await wait(900);
  const away = await peek();
  check(`${tag}scrolled away, it pauses and stops drawing`, away.state === 'paused' && !away.running && !away.awake);
  await p.evaluate(() => { const g = document.querySelector('.bugrun'); scrollTo(0, g.getBoundingClientRect().top + scrollY - 80); });
  await wait(900);
  check(`${tag}scrolled back, it waits on its pause card`, /Paused/.test(await p.$eval('.br-card', (e) => e.innerText)) && (await peek()).awake);

  // close: Esc on a desktop, the ✕ on a phone (on its icon)
  if (phone) await press('.br-close svg'); else { await p.$eval('.br-screen', (e) => e.focus()); await p.keyboard.press('Escape'); }
  await wait(1300);
  const shut = await p.evaluate(() => ({ hidden: document.querySelector('.bugrun').hidden, h: document.getElementById('games').offsetHeight, expanded: document.querySelector('.play').getAttribute('aria-expanded'), running: window.__bugrun.peek().running, focus: document.activeElement?.className }));
  check(`${tag}${phone ? '✕' : 'Esc'} folds it back into the course, the section its old height`, shut.hidden && Math.abs(shut.h - closedHeight) <= 1 && shut.expanded === 'false' && !shut.running, `${closedHeight} -> ${shut.h}`);
  check(`${tag}the course and the Play button are back`, (await shown('.play')) && (await shown('.runner')));
  const sy = await p.evaluate(() => scrollY);
  await p.evaluate(() => scrollBy(0, 200));
  await wait(400);
  check(`${tag}the page scrolls as before`, (await p.evaluate(() => scrollY)) > sy);

  // open again: a fresh start, and ✕ from a mouse
  await p.evaluate(() => { const s = document.getElementById('games'); scrollTo(0, s.getBoundingClientRect().top + scrollY - 40); });
  await wait(900);
  await press('.play');
  await wait(1500);
  const again = await p.evaluate(() => ({ s: window.__bugrun.peek(), card: document.querySelector('.br-card').innerText }));
  check(`${tag}opened again, it starts afresh`, again.s.state === 'title' && again.s.score === 0 && /start/i.test(again.card));
  await press('.br-close');
  await wait(1300);
  check(`${tag}and closes again`, await p.$eval('.bugrun', (e) => e.hidden));
  check(`${tag}no page errors`, errors.length === 0, errors.join(' | '));
  await p.close();
}
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exitCode = failed ? 1 : 0;
