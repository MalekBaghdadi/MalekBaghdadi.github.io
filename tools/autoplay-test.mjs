// Behaviour check for the auto-scroll button: pace, every way a visitor takes over, keyboard, the end, motion off.
//   node tools/autoplay-test.mjs [url]
import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://localhost:5199/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); };

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
async function open(w, h, opts = {}) {
  const p = await browser.newPage();
  if (opts.motionOff) await p.evaluateOnNewDocument(() => localStorage.setItem('motion', 'off'));
  await p.setViewport({ width: w, height: h, isMobile: w < 700, hasTouch: w < 700 });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(url, { waitUntil: 'networkidle0' });
  await wait(2300);
  p.errors = errors;
  return p;
}
const y = (p) => p.evaluate(() => scrollY);
const label = (p) => p.evaluate(() => document.querySelector('.autoplay-label').textContent);
const playing = (p) => p.evaluate(() => document.querySelector('.autoplay').hasAttribute('data-playing'));

// ---- desktop ----
const p = await open(1440, 900);
check('button shows with motion on', await p.evaluate(() => !document.querySelector('.autoplay').hidden), await label(p));
await p.click('.autoplay');
check('click starts it', (await playing(p)) && (await label(p)) === 'Pause');
const y0 = await y(p);
await wait(4000);
const y1 = await y(p);
const expected = 0.18 * 900 * 4;
check('slow, steady pace (about 0.18 screens a second)', Math.abs(y1 - y0 - expected) < expected * 0.25, `${Math.round(y1 - y0)}px in 4s, expected ~${expected}`);
check('the hero plays as it scrolls (signal bars dropping)', await p.evaluate(() => +getComputedStyle([...document.querySelectorAll('.bars rect')].pop()).opacity < 0.5));

await p.mouse.move(700, 450);
await p.mouse.wheel({ deltaY: 100 });
await wait(900);
const yA = await y(p); await wait(1500); const yB = await y(p);
check('a wheel turn hands control back', !(await playing(p)) && yB - yA < 5, `moved ${Math.round(yB - yA)}px after`);

await p.click('.autoplay');
const yC = await y(p); await wait(1500);
check('play again resumes from where the visitor is', (await playing(p)) && (await y(p)) > yC + 100);

await p.keyboard.press('Enter'); // focus is on the button after the click
check('Enter on the button pauses', !(await playing(p)));
await p.keyboard.press('Space');
await wait(300);
check('Space on the button plays (and is not taken as scrolling)', await playing(p));

await p.evaluate(() => document.activeElement.blur());
await p.keyboard.press('ArrowDown');
check('a scroll key hands control back', !(await playing(p)));

await p.click('.autoplay');
await wait(300);
await p.evaluate(() => scrollBy(0, 600)); // like dragging the scrollbar
await wait(400);
check('dragging the scrollbar hands control back', !(await playing(p)));

await p.click('.autoplay');
await wait(300);
await p.evaluate(() => document.querySelector('.nav a').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
check('pressing a link hands control back', !(await playing(p)));

await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
await wait(1500);
await p.evaluate(() => scrollBy(0, -150));
await wait(1200);
await p.click('.autoplay');
await wait(2500);
check('reaches the end and stops there', !(await playing(p)) && (await label(p)) === 'Watch again', await label(p));
await p.click('.autoplay');
await wait(1200);
const yTop = await y(p);
check('"Watch again" starts over from the top', (await playing(p)) && yTop > 0 && yTop < 600, `y=${Math.round(yTop)}`);
check('no page errors (desktop)', !p.errors.length, p.errors.join(' | '));

// ---- phone ----
const m = await open(390, 844);
await m.tap('.autoplay');
await wait(2500);
const my = await y(m);
check('phone: a tap starts it', (await playing(m)) && my > 200, `y=${Math.round(my)}`);
await m.touchscreen.touchStart(200, 400);
await m.touchscreen.touchEnd();
await wait(300);
check('phone: touching the page hands control back', !(await playing(m)));
const box = await m.$eval('.autoplay', (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.right), Math.round(r.bottom), innerWidth, innerHeight]; });
check('phone: the button stays inside the screen', box[0] <= box[2] && box[1] <= box[3], box.join(','));
check('no page errors (phone)', !m.errors.length, m.errors.join(' | '));

// ---- motion off ----
const off = await open(1440, 900, { motionOff: true });
check('motion off: no auto-scroll button', await off.evaluate(() => document.querySelector('.autoplay').hidden));

await browser.close();
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exitCode = failed ? 1 : 0;
