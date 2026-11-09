// Pigeons over the rest of the page: the Pigeon scene's own bird (pigeon-city.js), let out of its scene.
//
//   the visitor   leave the page alone at the very top and one flies in and lands on the "l" of Malek. It fidgets, looks
//                 about, and is gone the moment a mouse comes near (or a finger taps it). It comes back.
//   the carrier   the footer's "Back to the top, by pigeon": it takes off from the button, flies along while the page
//                 runs back up to the start, and lands on the name when it gets there.
//   a flock       crossing the whole screen, one of them carrying the mail (eggs.js: typing "coo").
//
// These follow time, not scroll, so there are none with motion off or with ?still. One loop drives whatever is in the
// air and stops when nothing is; a perched bird costs a timer.
import { bird } from './scenes/pigeon-city.js';
import { still } from './ambient.js';

const FLAP = ['u', 'm', 'd', 'm'];
const MAIL = '<svg class="fl-mail" viewBox="-1 -1 14 10" width="14" height="10"><rect width="12" height="8" rx="1" fill="#fff" stroke="#0f1633" stroke-width=".9"/><path d="M0 .4l6 4.2 6-4.2" fill="none" stroke="#0f1633" stroke-width=".9"/></svg>';
const now = () => performance.now() / 1000;
const ease = (s) => 1 - (1 - s) ** 2;

let layer;
function make(size) {
  layer ??= Object.assign(document.createElement('div'), { className: 'birds' });
  layer.setAttribute('aria-hidden', 'true');
  if (!layer.isConnected) document.body.append(layer);
  const el = document.createElement('i');
  el.className = 'fl';
  el.innerHTML = bird;
  layer.append(el);
  return { el, svg: el.firstElementChild, size };
}
// feet at (x, y) on the screen; `face` 1 looks right, -1 left
function put(b, x, y, face, frame) {
  b.el.style.transform = `translate(${(x - 12).toFixed(1)}px, ${(y - 16).toFixed(1)}px) scale(${(face * b.size).toFixed(2)}, ${b.size})`;
  if (b.svg.dataset.f !== frame) b.svg.dataset.f = frame;
}

const acts = new Set();
let raf = 0;
function frame() {
  raf = 0;
  const t = now();
  for (const a of acts) if (a(t) === false) acts.delete(a);
  if (acts.size) raf = requestAnimationFrame(frame);
}
function act(fn) {
  acts.add(fn);
  if (!raf) raf = requestAnimationFrame(frame);
  return fn;
}

/** A flock crosses the screen, left to right, climbing a little; the first one carries the mail. */
export function flyAcross(n = 9) {
  const w = innerWidth, h = innerHeight, t0 = now(), big = Math.min(1, w / 900);
  const flock = Array.from({ length: n }, (_, i) => ({
    b: make((i ? 1.4 + Math.random() * 1.1 : 2.6) * (0.7 + 0.3 * big)), delay: i ? 0.25 + i * 0.1 + Math.random() * 0.2 : 0,
    y: h * (i ? 0.18 + Math.random() * 0.5 : 0.4), v: (i ? 0.42 + Math.random() * 0.22 : 0.4) * Math.max(w, 700), ph: Math.random() * 6, rise: 50 + Math.random() * 130,
  }));
  flock[0].b.el.insertAdjacentHTML('beforeend', MAIL);
  for (const k of flock) put(k.b, -80, k.y, 1, 'm');
  act((t) => {
    let any = false;
    for (const k of flock) {
      if (!k.b) continue;
      const s = t - t0 - k.delay, x = -60 + k.v * Math.max(0, s);
      if (x > w + 90) { k.b.el.remove(); k.b = null; continue; }
      any = true;
      put(k.b, x, k.y - k.rise * (x / w) + 9 * Math.sin(s * 7 + k.ph), 1, FLAP[Math.floor(Math.max(0, s) * 13 + k.ph) % 4]);
    }
    return any;
  });
}

/**
 * The visitor on the name, and the carrier back to the top. Adds the carrier's button at the end of the footer; with
 * motion off it is a plain link to the top.
 */
export function initVisitor({ reduced, lenis }) {
  const name = document.querySelector('.name'), box = document.querySelector('.contact');
  if (reduced || still || !name) {
    box?.insertAdjacentHTML('beforeend', '<p class="to-top"><a href="#top">Back to the top</a></p>');
    return;
  }
  let b = null, state = 'away', timer = 0, fidget = 0, perch = { x: 0, y: 0 }, facing = -1;

  // The top of the "l" in Malek: the letter's baseline (an empty inline-block sits on it) less the font's ascender.
  function spot() {
    const ch = name.querySelectorAll('.ch')[2];
    if (!ch) return false;
    const probe = Object.assign(document.createElement('span'), { style: 'display:inline-block;width:0;height:0' });
    ch.after(probe);
    const base = probe.getBoundingClientRect().top;
    probe.remove();
    const cs = getComputedStyle(ch), ctx = (spot.c ??= document.createElement('canvas').getContext('2d'));
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const r = ch.getBoundingClientRect();
    perch = { x: r.left + r.width / 2, y: base - ctx.measureText('l').actualBoundingBoxAscent + 1 };
    return r.width > 0 && perch.y > 20 && perch.y < innerHeight;
  }
  const size = () => Math.max(1.7, Math.min(3.2, parseFloat(getComputedStyle(name).fontSize) / 62)); // a pigeon to the name's scale
  const calm = () => scrollY < 8 && !document.hidden && getComputedStyle(name.querySelector('.ch')).opacity === '1';

  function wait(ms) {
    clearTimeout(timer);
    timer = setTimeout(() => { if (state === 'away' && calm() && spot()) arrive(); else if (state === 'away') wait(5000); }, ms);
  }
  // in from `from` (or from off the right edge), gliding down onto the letter, wings out for the landing
  function arrive(from) {
    state = 'in';
    b ??= make(size());
    const sx = from?.x ?? innerWidth + 60, sy = from?.y ?? innerHeight * 0.08, t0 = now(), dur = from ? 1.5 : 2.3;
    facing = perch.x < sx ? -1 : 1;
    act((t) => {
      if (state !== 'in') return false;
      const s = Math.min(1, (t - t0) / dur);
      const x = sx + (perch.x - sx) * ease(s), y = sy + (perch.y - sy) * (1 - (1 - s) ** 2.4) - 34 * Math.sin(Math.PI * s);
      put(b, x, y, facing, s > 0.9 ? 'u' : FLAP[Math.floor(s * dur * 12) % 4]);
      if (s < 1) return true;
      put(b, perch.x, perch.y, facing, 's');
      b.el.querySelector('.fl-mail')?.remove(); // delivered
      state = 'perched';
      fidget = setTimeout(fuss, 1800 + Math.random() * 2200);
      return false;
    });
  }
  // sitting there: now and then it turns round, or bobs
  function fuss() {
    if (state !== 'perched') return;
    if (Math.random() < 0.45) { facing = -facing; put(b, perch.x, perch.y, facing, 's'); }
    else { put(b, perch.x, perch.y + 2, facing, 's'); setTimeout(() => { if (state === 'perched') put(b, perch.x, perch.y, facing, 's'); }, 140); }
    fidget = setTimeout(fuss, 1600 + Math.random() * 3200);
  }
  // up and away, to the side it was facing; back after a while
  function leave(scared) {
    if (state !== 'perched' && state !== 'in') return;
    clearTimeout(fidget);
    const gone = b, [x0, y0] = gone.el.style.transform.match(/-?[\d.]+/g).map(Number), t0 = now(), dir = scared ? (perch.x > innerWidth / 2 ? -1 : 1) : facing;
    state = 'away';
    b = null;
    act((t) => {
      const s = (t - t0) / 1.5;
      if (s >= 1) { gone.el.remove(); return false; }
      put(gone, x0 + 12 + dir * innerWidth * 0.6 * s ** 1.4, y0 + 16 - (y0 + 120) * ease(s) + 8 * Math.sin(s * 22), dir, FLAP[Math.floor(s * 22) % 4]);
      return true;
    });
    wait(26000);
  }

  addEventListener('scroll', () => { if (scrollY > 24) leave(false); }, { passive: true });
  addEventListener('resize', () => leave(false));
  document.addEventListener('visibilitychange', () => { if (document.hidden) leave(false); });
  const near = (e, d) => state === 'perched' && (e.clientX - perch.x) ** 2 + (e.clientY - (perch.y - 20)) ** 2 < d * d;
  addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && near(e, 110)) leave(true); }, { passive: true });
  addEventListener('pointerdown', (e) => { if (near(e, e.pointerType === 'mouse' ? 110 : 64)) leave(true); }, { passive: true });
  wait(9000);

  // ---- the carrier ----
  const up = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Back to the top, by pigeon' });
  const line = Object.assign(document.createElement('p'), { className: 'to-top' });
  line.append(up);
  box?.append(line);
  up.addEventListener('click', () => {
    if (state === 'carry') return;
    if (scrollY < 8) return;
    clearTimeout(timer);
    clearTimeout(fidget);
    document.dispatchEvent(new Event('site:pause-autoscroll'));
    b ??= make(size());
    state = 'carry';
    b.size = size();
    if (!b.el.querySelector('.fl-mail')) b.el.insertAdjacentHTML('beforeend', MAIL);
    const r = up.getBoundingClientRect(), x0 = r.left + 14, y0 = r.top, hx = innerWidth * 0.5, hy = innerHeight * 0.34, t0 = now();
    let going = false, lastY = scrollY, moved = t0;
    act((t) => {
      if (state !== 'carry') return false;
      const s = Math.min(1, (t - t0) / 0.7), e = ease(s);
      const x = x0 + (hx - x0) * e, y = y0 + (hy - y0) * e + (s >= 1 ? 7 * Math.sin((t - t0) * 6) : 0);
      put(b, x, y, hx >= x0 ? 1 : -1, FLAP[Math.floor((t - t0) * 13) % 4]);
      if (s > 0.45 && !going) {
        going = true;
        moved = t;
        if (lenis) lenis.scrollTo(0, { duration: 2.8, easing: (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2) });
        else scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (scrollY !== lastY) { lastY = scrollY; moved = t; }
      if (going && scrollY < 4) { // there: down onto the name
        if (spot()) arrive({ x, y });
        else { state = 'perched'; leave(false); }
        return false;
      }
      if (going && t - moved > 0.9) { state = 'perched'; leave(false); return false; } // the visitor took the scroll back
      return true;
    });
  });
}
