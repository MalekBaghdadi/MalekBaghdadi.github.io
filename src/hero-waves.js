// The hero's signal: rings pulse out of the status line's signal bars while the page is "online", and die away as the
// scroll drops the connection, like a radio going quiet. A canvas, because three screen-sized rings as elements would
// be three huge layers; it only draws while the hero is on screen and there is signal to show.
import { gsap } from 'gsap';
import { liveWhileVisible, still } from './ambient.js';

const PERIOD = 4.2; // seconds for a ring to cross the screen
const RINGS = 3;

/**
 * @param {HTMLElement} stage  the hero stage (the canvas goes behind everything in it)
 * @param {Element} bars       the signal bars the rings come out of
 * @param {gsap.core.Timeline} tl the hero's scroll timeline (0..1)
 * @param {number} screens   how many screens the hero stays pinned
 */
export function initWaves(stage, bars, tl, screens, reduced) {
  if (reduced || still) return; // a still page has no pulse
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-waves backdrop';
  canvas.setAttribute('aria-hidden', 'true');
  stage.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const state = { on: 1, intro: 0 }; // on: the connection (scroll), intro: the rings start once the bars connect
  let w = 0, h = 0, dpr = 1, cx = 0, cy = 0, reach = 0, dirty = false;

  function size() {
    const r = stage.getBoundingClientRect(), b = bars.getBoundingClientRect();
    dpr = 0.5; // faint soft rings: drawn at half resolution and scaled up, a quarter of the pixels to fill
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    cx = b.left + b.width / 2 - r.left;
    cy = b.top + b.height / 2 - r.top;
    reach = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
    dirty = true;
  }
  function draw() {
    const a = state.on * state.intro;
    if (a < 0.002 && !dirty) return; // nothing on the canvas and nothing to draw
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    dirty = a >= 0.002;
    canvas.hidden = !dirty; // a blank canvas the size of the screen would still be composited every frame
    if (!dirty) return;
    const now = performance.now() / 1000;
    for (let i = 0; i < RINGS; i++) {
      const ph = (now / PERIOD + i / RINGS) % 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 8 + ph * reach, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(43, 59, 255, ${(0.3 * (1 - ph) ** 1.6 * a).toFixed(3)})`;
      ctx.lineWidth = 1 + ph * 1.6;
      ctx.stroke();
    }
  }

  new ResizeObserver(size).observe(stage);
  document.fonts.ready.then(size); // the clock's font moves the bars
  size();
  liveWhileVisible(stage.closest('section'), screens, (live) => {
    if (live) gsap.ticker.add(draw);
    else { gsap.ticker.remove(draw); canvas.hidden = true; dirty = false; }
  });
  gsap.to(state, { intro: 1, duration: 1.4, delay: 1.1, ease: 'power1.out' }); // after the load moment's "Online"
  // the strongest bar drops first (0.06) and the last one by 0.24: the signal fades out over the same stretch
  tl.fromTo(state, { on: 1 }, { on: 0, duration: 0.16, ease: 'power1.in' }, 0.06);
}
