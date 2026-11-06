// Behaviour check for the auto-scroll button and its speed slider: pace, speed, every way a visitor takes over,
// keyboard, the end, phones (taps, slider drags, even steps), motion off.
//   node tools/autoplay-test.mjs [url]        (CHROME=/path/to/chrome to use another browser)
import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://localhost:5199/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); };

const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
async function open(w, h, opts = {}) {
  const p = await browser.newPage();
  if (opts.motionOff) await p.evaluateOnNewDocument(() => localStorage.setItem('motion', 'off'));
  if (!opts.keepSpeed) await p.evaluateOnNewDocument(() => localStorage.removeItem('autoscroll-speed')); // every page starts at 1×
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
const playing = (p) => p.evaluate(() => document.querySelector('.autoplay-dock').hasAttribute('data-playing'));
const speed = (p) => p.evaluate(() => +document.querySelector('.autoplay-speed').getAttribute('aria-valuenow'));
const sliderShown = (p) => p.evaluate(() => getComputedStyle(document.querySelector('.autoplay-speed')).visibility === 'visible');
// Where the thumb is, and the ends of the track, in viewport pixels.
const thumb = (p) => p.evaluate(() => {
  const s = document.querySelector('.autoplay-speed'), r = s.querySelector('.autoplay-speed-track').getBoundingClientRect();
  const t = +getComputedStyle(s).getPropertyValue('--p');
  return { x: r.x + r.width / 2, y: r.bottom - t * r.height, top: r.top, bottom: r.bottom };
});
// Screens per second over `ms`.
const pace = async (p, ms) => {
  const a = await y(p); await wait(ms); const b = await y(p);
  return (b - a) / (ms / 1000) / (await p.evaluate(() => innerHeight));
};

// ---- desktop ----
const p = await open(1440, 900);
check('button shows with motion on', await p.evaluate(() => !document.querySelector('.autoplay').hidden), await label(p));
check('no speed slider before it plays', !(await sliderShown(p)));
await p.click('.autoplay');
check('click starts it', (await playing(p)) && (await label(p)) === 'Pause');
const y0 = await y(p);
await wait(4000);
const y1 = await y(p);
const expected = 0.18 * 900 * 4;
check('slow, steady pace (about 0.18 screens a second)', Math.abs(y1 - y0 - expected) < expected * 0.25, `${Math.round(y1 - y0)}px in 4s, expected ~${expected}`);
check('the hero plays as it scrolls (signal bars dropping)', await p.evaluate(() => +getComputedStyle([...document.querySelectorAll('.bars rect')].pop()).opacity < 0.5));
check('the speed slider shows while it plays, at 1×', (await sliderShown(p)) && (await speed(p)) === 1, `${await speed(p)}×`);

let t = await thumb(p);
await p.mouse.move(t.x, t.y);
await p.mouse.down();
await p.mouse.move(t.x, t.top - 40, { steps: 8 });
await p.mouse.up();
await wait(1200);
const fast = await pace(p, 1500);
check('dragging the slider up speeds it up (4× at the top)', (await playing(p)) && (await speed(p)) === 4 && Math.abs(fast - 0.72) < 0.72 * 0.25, `${await speed(p)}×, ${fast.toFixed(3)} screens/s`);

await p.focus('.autoplay-speed');
for (let i = 0; i < 12; i++) await p.keyboard.press('ArrowDown'); // 4× down three doublings
await wait(1200);
const slow = await pace(p, 1500);
check('arrow keys on the slider step the speed, without handing control back', (await playing(p)) && (await speed(p)) === 0.5 && Math.abs(slow - 0.09) < 0.09 * 0.3, `${await speed(p)}×, ${slow.toFixed(3)} screens/s`);
await p.keyboard.press('PageUp');
check('Page Up doubles it', (await speed(p)) === 1, `${await speed(p)}×`);

t = await thumb(p);
await p.mouse.move(t.x, t.y);
await p.mouse.wheel({ deltaY: -120 });
await wait(600); // the wheel's change is saved once it settles
check('the wheel over the slider turns the speed up instead of scrolling the page', (await playing(p)) && (await speed(p)) > 1, `${await speed(p)}×`);
const keep = await speed(p);
const again = await open(1440, 900, { keepSpeed: true });
check('the speed is remembered on the next visit', (await speed(again)) === keep, `${await speed(again)}× after setting ${keep}×`);
await again.close();
await p.bringToFront();
await p.focus('.autoplay-speed');
await p.keyboard.press('Home');
const slowest = await speed(p);
await p.keyboard.press('PageUp');
await p.keyboard.press('PageUp');
check('Home is the slowest (0.25×), and two Page Ups from there are 1× again', (await playing(p)) && slowest === 0.25 && (await speed(p)) === 1, `${slowest}× then ${await speed(p)}×`);
await p.evaluate(() => localStorage.removeItem('autoscroll-speed'));

await p.mouse.move(700, 450);
await p.mouse.wheel({ deltaY: 100 });
await wait(900);
const yA = await y(p); await wait(1500); const yB = await y(p);
check('a wheel turn hands control back', !(await playing(p)) && yB - yA < 5, `moved ${Math.round(yB - yA)}px after`);
check('the slider hides when it stops', !(await sliderShown(p)));
check('focus goes back to the button when the slider hides', await p.evaluate(() => document.activeElement === document.querySelector('.autoplay')));

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
// Browsers scroll in whole pixels, so at ~2.5px a frame the best is 2s and 3s. A step outside the pair for its frame's
// length (a 1 or a 4) is the judder the frame clock is there to prevent.
const steps = await m.evaluate(() => new Promise((done) => {
  const f = [];
  (function rec(now) { f.push([now, scrollY]); f.length < 120 ? requestAnimationFrame(rec) : done(f); })(performance.now());
}));
const fr = steps.slice(1);
const v = (fr.at(-1)[1] - fr[0][1]) / (fr.at(-1)[0] - fr[0][0]);
const uneven = fr.slice(1).filter(([tt, yy], i) => { const ideal = v * (tt - fr[i][0]), s = yy - fr[i][1]; return s < Math.floor(ideal) - 0.01 || s > Math.ceil(ideal) + 0.01; }).length;
check('phone: even steps, frame to frame', uneven <= 2, `${uneven} uneven of ${fr.length - 1} frames`);
await m.tap('.autoplay');
await wait(300);
const yP = await y(m); await wait(800);
check('phone: tapping Pause pauses (and it stays paused)', !(await playing(m)) && (await y(m)) === yP, `moved ${Math.round((await y(m)) - yP)}px after`);
await m.tap('.autoplay');
await wait(800);
t = await thumb(m);
await m.touchscreen.touchStart(t.x, t.y);
for (let i = 1; i <= 8; i++) { await m.touchscreen.touchMove(t.x, t.y + ((t.bottom + 30 - t.y) * i) / 8); await wait(16); }
await m.touchscreen.touchEnd();
await wait(300);
check('phone: dragging the slider down slows it, and it keeps playing', (await playing(m)) && (await speed(m)) === 0.25, `${await speed(m)}×`);
const box = await m.$eval('.autoplay-dock', (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom), innerWidth, innerHeight]; });
check('phone: the button and slider stay inside the screen', box[0] >= 0 && box[1] >= 0 && box[2] <= box[4] && box[3] <= box[5], box.join(','));
await m.touchscreen.touchStart(200, 400);
await m.touchscreen.touchEnd();
await wait(300);
check('phone: touching the page hands control back', !(await playing(m)));
check('no page errors (phone)', !m.errors.length, m.errors.join(' | '));

// ---- motion off ----
const off = await open(1440, 900, { motionOff: true });
check('motion off: no auto-scroll button', await off.evaluate(() => document.querySelector('.autoplay').hidden && getComputedStyle(document.querySelector('.autoplay-speed')).visibility === 'hidden'));

await browser.close();
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exitCode = failed ? 1 : 0;
