// The signal: rings pulse out of the status line's signal bars while the page is "online", and die away as the scroll
// drops the connection, like a radio going quiet; at the very end of the page, in the footer, they come back. A canvas,
// because screen-sized rings as elements would be huge layers; it only draws while its section is on screen and there
// is signal to show.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { liveWhileVisible, still } from './ambient.js';

const PERIOD = 4.2; // seconds for a ring to cross the screen
const RINGS = 4;

/**
 * A canvas of rings behind everything in `host`, centred on `source`. `state.on` (0..1) is the signal: at 1 the rings
 * are whole, and as it drops they fade and break up into shorter and shorter dashes. Returns { state, draw, stop }.
 */
function rings(host, source, rgb) {
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-waves backdrop';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const state = { on: 1, intro: 1 };
  let w = 0, h = 0, cx = 0, cy = 0, reach = 0, dirty = false;
  const dpr = 0.5; // faint soft rings: drawn at half resolution and scaled up, a quarter of the pixels to fill

  function size() {
    const r = host.getBoundingClientRect(), b = source.getBoundingClientRect();
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    cx = b.left + b.width / 2 - r.left;
    cy = b.top + b.height / 2 - r.top;
    reach = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
    dirty = true;
  }
  const pings = []; // rings a visitor sent by pressing the bars: { r, a }
  function draw() {
    const a = state.on * state.intro;
    const any = a >= 0.002 || pings.length > 0;
    if (!any && !dirty) return; // nothing on the canvas and nothing to draw
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    dirty = any;
    canvas.hidden = !dirty; // a blank canvas the size of the screen would still be composited every frame
    if (!dirty) return;
    const now = performance.now() / 1000;
    // a weak signal breaks up: solid while it is strong, then into shorter and shorter dashes
    if (state.on < 0.995) {
      ctx.setLineDash([3 + 70 * state.on ** 2, 6 + 26 * (1 - state.on)]);
      ctx.lineDashOffset = -now * 18;
    } else ctx.setLineDash([]);
    if (a >= 0.002) {
      for (let i = 0; i < RINGS; i++) {
        const ph = (now / PERIOD + i / RINGS) % 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 8 + ph * reach, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb}, ${(0.55 * (1 - ph) ** 1.3 * a).toFixed(3)})`;
        ctx.lineWidth = 1.6 + ph * 2.6;
        ctx.stroke();
      }
    }
    for (const p of pings) { // a pressed ping: one bold ring (dashed, like the rest, when the signal is weak)
      ctx.beginPath();
      ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb}, ${p.a.toFixed(3)})`;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
  }
  new ResizeObserver(size).observe(host);
  document.fonts.ready.then(size); // fonts move the bars
  size();
  return {
    state,
    resize: size,
    run(live) {
      if (live) gsap.ticker.add(draw);
      else { gsap.ticker.remove(draw); canvas.hidden = true; dirty = false; }
    },
    /**
     * One ring out of the bars, across the whole host (or, with no signal, breaking up a third of the way out).
     * `onRadius(r, x, y)` hears how far it has got each frame: its radius, and its centre on the screen.
     */
    ping(onRadius, onDone) {
      const p = { r: 6, a: 0.85 }, weak = state.on < 0.5, b = source.getBoundingClientRect();
      const x = b.left + b.width / 2, y = b.top + b.height / 2;
      pings.push(p);
      gsap.to(p, {
        r: reach * (weak ? 0.34 : 1.02), a: 0, duration: weak ? 0.9 : Math.min(2.2, 0.7 + reach / 900), ease: 'power1.out',
        onUpdate: () => onRadius?.(p.r, x, y),
        onComplete: () => { pings.splice(pings.indexOf(p), 1); onDone?.(); },
      });
    },
  };
}

/**
 * The hero's rings. They start once the load moment's bars connect and fade as the scroll drops the connection.
 * @param {HTMLElement} stage  the hero stage (the canvas goes behind everything in it)
 * @param {Element} bars       the signal bars the rings come out of
 * @param {gsap.core.Timeline} tl the hero's scroll timeline (0..1)
 * @param {number} screens   how many screens the hero stays pinned
 */
export function initWaves(stage, bars, tl, screens, reduced) {
  if (reduced || still) return null; // a still page has no pulse
  const r = rings(stage, bars, '43, 59, 255');
  r.state.intro = 0;
  liveWhileVisible(stage.closest('section'), screens, r.run);
  gsap.to(r.state, { intro: 1, duration: 1.4, delay: 1.1, ease: 'power1.out' }); // after the load moment's "Online"
  // the strongest bar drops first (0.06) and the last one by 0.24: the signal fades out over the same stretch
  tl.fromTo(r.state, { on: 1 }, { on: 0, duration: 0.16, ease: 'power1.in' }, 0.06);
  return r; // hero.js sends a ping through it when the bars are pressed
}

/**
 * The footer's rings: they come back with "Back online", at `at` on the footer's own timeline `tl`, gathering from
 * broken dashes into whole rings, and pulse for as long as the footer is on screen.
 */
export function initFooterWaves(footer, bars, tl, at) {
  if (still) return null;
  const r = rings(footer, bars, '170, 180, 255');
  r.state.on = 0;
  tl.fromTo(r.state, { on: 0 }, { on: 1, duration: 1 - at, ease: 'power1.out' }, at);
  ScrollTrigger.create({ trigger: footer, start: 'top bottom', end: 'bottom top', onToggle: (self) => r.run(self.isActive) });
  return r;
}
