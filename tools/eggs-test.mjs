// The hidden extras (src/eggs.js; spoilers): each one is found the way a visitor would find it, and works, on a desktop
// and on a phone, without errors. Pictures of the visible ones go to tools/out/eggs/ for a look.
//   node tools/eggs-test.mjs [url]        (CHROME=... for another browser)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5199/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); };
mkdirSync('tools/out/eggs', { recursive: true });

// Scroll so a pinned scene is `f` of the way through its story.
const into = (p, id, f) => p.evaluate((id, f) => {
  const s = document.getElementById(id), sp = s.parentElement.classList.contains('pin-spacer') ? s.parentElement : s;
  scrollTo(0, sp.getBoundingClientRect().top + scrollY + (sp.offsetHeight - innerHeight) * f);
}, id, f);
const toast = (p) => p.evaluate(() => { const t = document.querySelector('.egg-toast.on'); return t ? t.innerText : ''; });

const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const phone = w < 700, tag = phone ? 'phone: ' : '';
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
  const errors = [], logs = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => logs.push(m.text()));
  await p.goto(url, { waitUntil: 'networkidle0' });
  await p.evaluate(() => localStorage.removeItem('bugrun-gold'));
  await wait(1500);

  // the console says hello
  check(`${tag}a hello in the console, with a hint`, logs.some((l) => /opened the console/.test(l)) && logs.some((l) => /cheat code/.test(l)));

  // the name's letters hop, and all thirteen make a wave
  const letters = await p.$$('.name .ch');
  check(`${tag}the name is thirteen letters`, letters.length === 13, `${letters.length}`);
  for (const [i, el] of letters.entries()) {
    if (phone) await el.tap(); else await el.click();
    if (i === 0) check(`${tag}a clicked letter hops`, await el.evaluate((e) => e.classList.contains('hop') && e.getAnimations().length > 0));
    await wait(40);
  }
  await wait(500);
  check(`${tag}all thirteen letters: the name waves and says so`, /thirteen/.test(await toast(p)) && (await p.$$eval('.name .ch.lit', (l) => l.length)) > 0);
  await p.screenshot({ path: `tools/out/eggs/${phone ? 'phone' : 'desktop'}-letters.png` });

  // a pigeon on the mosque, poked (a little off the bird: they are small). On a phone the mosque is behind the phone.
  await into(p, 'pigeon', 0.15);
  await wait(1200);
  const [bird, hid] = await p.evaluate(() => {
    const dev = document.querySelector('#pigeon .pg-phone').getBoundingClientRect();
    const at = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2 + 7, y: r.top + r.height / 2 - 5, w: r.width }; };
    const sat = [...document.querySelectorAll('#pigeon .pc-bird[data-f="s"]')].map(at).filter((b) => b.w);
    const behind = (b) => b.x - 7 > dev.left && b.x - 7 < dev.right && b.y + 5 > dev.top && b.y + 5 < dev.bottom;
    return [sat.find((b) => !behind(b)), sat.find(behind)];
  });
  check(`${tag}pigeons are sitting on the mosque at the start`, !!(bird || hid));
  if (hid && !bird) {
    if (phone) await p.touchscreen.tap(hid.x, hid.y); else await p.mouse.click(hid.x, hid.y);
    await wait(250);
    check(`${tag}a pigeon hidden behind the phone can't be poked`, !(await p.$('.pc-say')) && !(await p.$('.pc-bird.poked')));
  }
  if (bird) {
    if (phone) await p.touchscreen.tap(bird.x, bird.y); else await p.mouse.click(bird.x, bird.y);
    await wait(250);
    const poke = await p.evaluate(() => ({ poked: document.querySelectorAll('.pc-bird.poked').length, say: document.querySelector('.pc-say')?.textContent ?? '' }));
    check(`${tag}a poked pigeon hops and says something`, poke.poked === 1 && /coo/.test(poke.say), poke.say);
    await p.screenshot({ path: `tools/out/eggs/${phone ? 'phone' : 'desktop'}-pigeon.png`, captureBeyondViewport: false });
    await wait(1600);
    const after = await p.evaluate(() => ({ poked: document.querySelectorAll('.pc-bird.poked').length, say: document.querySelectorAll('.pc-say').length, f: [...document.querySelectorAll('#pigeon .pc-bird')].filter((b) => b.getBoundingClientRect().width).map((b) => b.dataset.f).join('') }));
    check(`${tag}and settles back down`, after.poked === 0 && after.say === 0 && /^s+$/.test(after.f), JSON.stringify(after));
  }
  const links = await p.evaluate(() => { const a = document.querySelector('#pigeon .copy a'); const r = a.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === a; });
  check(`${tag}the scene's links are still clickable`, links);

  // NeatInk: ink on the page, with a mouse (a finger scrolls instead)
  await into(p, 'neatink', 0.3);
  await wait(1200);
  if (phone) {
    await p.touchscreen.tap(60, 200);
    await wait(300);
    check(`${tag}a finger on NeatInk's page doesn't draw`, !(await p.$('.ni-scribble')));
  } else {
    await p.mouse.move(200, 120);
    await wait(400); // the ink library arrives while the pointer is over the paper
    await p.mouse.down();
    for (let k = 0; k <= 40; k++) await p.mouse.move(200 + k * 25, 120 + Math.sin(k / 3) * 60 + k * 9, { steps: 1 });
    const ink = await p.evaluate(() => {
      const c = document.querySelector('.ni-scribble');
      if (!c) return { n: 0 };
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 16) if (d[i] > 40) n++;
      return { n, over: getComputedStyle(c).zIndex };
    });
    await p.screenshot({ path: 'tools/out/eggs/desktop-ink.png' });
    await p.mouse.up();
    check('writing on NeatInk\'s page leaves ink, over the tablet too', ink.n > 400, `${ink.n} inked pixels`);
    await wait(3000);
    check('and the ink fades, taking its canvas with it', !(await p.$('.ni-scribble')));
  }

  // leaving the tab: the title loses the connection, and finds it again
  const titles = await p.evaluate(async () => {
    const title = document.title, out = [title];
    const set = (h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); document.dispatchEvent(new Event('visibilitychange')); out.push(document.title); };
    set(true); set(false);
    await new Promise((r) => setTimeout(r, 2000));
    out.push(document.title);
    return out;
  });
  check(`${tag}leaving the tab: the title goes offline and comes back`, /Connection lost/.test(titles[1]) && /Back online/.test(titles[2]) && titles[3] === titles[0], titles.slice(1).join(' → '));

  if (!phone) {
    // typing "offline"
    await p.evaluate(() => scrollTo(0, 0));
    await wait(600);
    await p.keyboard.type('offline', { delay: 30 });
    await wait(150);
    const dropped = await p.evaluate(() => document.documentElement.classList.contains('egg-offline'));
    await p.screenshot({ path: 'tools/out/eggs/desktop-offline.png' });
    await wait(1600);
    check('typing "offline" drops the signal for a moment, then explains', dropped && !(await p.evaluate(() => document.documentElement.classList.contains('egg-offline'))) && /No connection/.test(await toast(p)));

    // the cheat code
    for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) { await p.keyboard.press(k); await wait(30); }
    await wait(500);
    const rain = await p.evaluate(() => !!document.querySelector('.egg-rain'));
    await p.screenshot({ path: 'tools/out/eggs/desktop-cheat.png' });
    check('the cheat code: a toast, a rain of coins, and a gold runner saved', rain && /Cheat code/.test(await toast(p)) && (await p.evaluate(() => localStorage.getItem('bugrun-gold'))) === '1');
    await wait(5200);
    check('the coins are gone after a few seconds', !(await p.evaluate(() => document.querySelector('.egg-rain'))));
    await p.evaluate(() => { const s = document.getElementById('games'); scrollTo(0, s.getBoundingClientRect().top + scrollY - innerHeight * 0.3); });
    await wait(1200);
    await p.click('.play');
    await wait(1200);
    const gold = await p.evaluate(() => {
      const c = document.querySelector('.bugrun canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] === 0xff && d[i + 1] === 0xc5 && d[i + 2] === 0x3d) n++;
      return n;
    });
    check('Bug Run\'s runner is gold now', gold > 10, `${gold} gold pixels`);
    await p.keyboard.press('Escape');
    await p.evaluate(() => localStorage.removeItem('bugrun-gold'));
  }
  check(`${tag}no errors`, errors.length === 0, errors.join(' | '));
  await p.close();
}
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exitCode = failed ? 1 : 0;
