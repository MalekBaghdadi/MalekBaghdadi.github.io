// Behind the phone, a floor of days: a year of habit squares (seven rows, one column a week) lying in perspective,
// filling in day by day as the walkthrough plays. Most days are logged, a few are missed, and the last weeks are one
// unbroken streak; the next day to fill is lit. The perspective is drawn on a flat canvas (each day projected to
// its four corners), not made with a CSS 3D transform: a 3D layer is recomposited every frame, a flat one is not. And
// nothing here loops: on a slow phone even one pulsing square cost a sixth of the frames while scrolling.
import { rng } from '../ambient.js';
import { found } from '../hunt.js';
import { burst } from '../burst.js';

const ROWS = 7;
const COLS = 53;
const N = ROWS * COLS;
const COLORS = ['#131a29', 'rgba(157,184,245,0.12)', 'rgba(157,184,245,0.24)', 'rgba(157,184,245,0.4)', 'rgba(157,184,245,0.6)'];
// a camera above the floor: the near edge at depth 1, the far edge at FAR; the vanishing point sits above the canvas
const FAR = 2.6;
const SPREAD = 1.7; // how much wider than the canvas the near edge is

export function buildStreaks() {
  return `<div class="lb-floor backdrop" aria-hidden="true"><div class="lb-ground"><canvas></canvas><i class="lb-today"></i></div>
    <p class="lb-count"><b>0</b><span>days logged</span><em><i>0</i> in a row</em></p></div>`;
}

/** Adds the year's filling to the scene timeline `tl` (positions 0..1) and returns `relayout` / `redraw`. */
export function initStreaks(el, tl) {
  const ground = el.querySelector('.lb-ground'), canvas = el.querySelector('canvas'), today = el.querySelector('.lb-today');
  const ctx = canvas.getContext('2d');
  const r = rng(5);
  const level = Array.from({ length: N }, (_, i) => (i > N - 50 ? 2 + Math.floor(r() * 3) : r() < 0.17 ? 0 : 1 + Math.floor(r() * 4)));
  // the tally in the corner, in the app's own words: days logged so far, and the streak running into today
  const logged = [0], streak = [0];
  level.forEach((l, i) => { logged.push(logged[i] + (l > 0)); streak.push(l > 0 ? streak[i] + 1 : 0); });
  const count = el.querySelector('.lb-count'), countN = count.querySelector('b'), countS = count.querySelector('em i');
  let counted = -1;

  const mine = new Map(); // days the visitor logged by hand: cell -> its square (see `play`)
  let w = 0, h = 0, dpr = 1, shown = -1;
  const state = { n: 0 };
  // (u, v) on the floor, u across 0..1 and v from far (0) to near (1), to canvas pixels
  const project = (u, v) => {
    const z = FAR - v * (FAR - 1);
    return [w / 2 + ((u - 0.5) * w * SPREAD) / z, -0.6 * h + (1.6 * h) / z];
  };
  const corners = (i) => {
    const c = Math.floor(i / ROWS), row = i % ROWS, g = 0.1;
    const u0 = (c + g) / COLS, u1 = (c + 1 - g) / COLS, v0 = (row + g) / ROWS, v1 = (row + 1 - g) / ROWS;
    return [project(u0, v0), project(u1, v0), project(u1, v1), project(u0, v1)];
  };
  function fill(i, color) {
    const q = corners(i);
    ctx.globalAlpha = 0.16 + 0.84 * ((i % ROWS) / (ROWS - 1)) ** 1.4; // the far rows fade into the distance
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(q[0][0], q[0][1]);
    for (let k = 1; k < 4; k++) ctx.lineTo(q[k][0], q[k][1]);
    ctx.fill();
  }
  // The canvas only ever adds paint: forward, the days that changed; backward (rare), the year redrawn from empty.
  // Drawn in the same order either way, so the two meet pixel for pixel. (Erasing one square would also nibble its
  // neighbours, which share edge pixels where the far rows are tight; so the next day is an element laid over it.)
  function render() {
    const n = Math.max(0, Math.min(N, Math.round(state.n)));
    if (n !== counted) {
      counted = n;
      countN.textContent = logged[n] + mine.size;
      countS.textContent = streak[n];
      count.classList.toggle('hot', streak[n] >= 7); // a week or more in a row: the streak lights up
    }
    if (n === shown || !w) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (n < shown || shown < 0) {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < N; i++) fill(i, COLORS[0]);
      shown = 0;
    }
    for (let i = shown; i < n; i++) fill(i, COLORS[level[i]]);
    shown = n;
    // the next day to fill: a flat square skewed onto its cell (a parallelogram is close enough at this size)
    const [a, b, , d] = corners(Math.min(n, N - 1));
    today.style.transform = `matrix(${(b[0] - a[0]) / 10}, ${(b[1] - a[1]) / 10}, ${(d[0] - a[0]) / 10}, ${(d[1] - a[1]) / 10}, ${a[0]}, ${a[1]})`;
    today.hidden = n >= N;
  }
  function layout() {
    w = el.clientWidth;
    h = Math.round(Math.min(el.clientHeight * 0.3, w * 0.42));
    if (!w || !h) return;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    ground.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    shown = -1;
    render();
    for (const [i, sq] of mine) lay(sq, i);
  }
  new ResizeObserver(layout).observe(el);

  // a flat 10px square skewed onto cell i (a parallelogram is close enough at this size)
  function lay(sq, i) {
    const [a, b, , d] = corners(i);
    sq.style.transform = `matrix(${(b[0] - a[0]) / 10}, ${(b[1] - a[1]) / 10}, ${(d[0] - a[0]) / 10}, ${(d[1] - a[1]) / 10}, ${a[0]}, ${a[1]})`;
  }

  /**
   * The floor can be logged on by hand: under a mouse the day it is over lights up, and a click logs it (or takes it
   * back). The tally in the corner counts them in. Seven makes a week. The pointer is turned back into a place on the
   * floor by running the projection the other way.
   */
  function play(section) {
    const stage = section.querySelector('.stage');
    const hover = ground.appendChild(Object.assign(document.createElement('i'), { className: 'lb-hover', hidden: true }));
    const cellAt = (e) => {
      if (!w || e.target.closest?.('a, button, .lb-phone, .copy > *')) return -1;
      const r = canvas.getBoundingClientRect();
      if (!r.width) return -1;
      const x = ((e.clientX - r.left) * w) / r.width, y = ((e.clientY - r.top) * h) / r.height;
      if (y < 0 || y > h) return -1;
      const z = (1.6 * h) / (y + 0.6 * h), v = (FAR - z) / (FAR - 1), u = 0.5 + ((x - w / 2) * z) / (w * SPREAD);
      return u < 0 || u >= 1 || v < 0 || v >= 1 ? -1 : Math.floor(u * COLS) * ROWS + Math.floor(v * ROWS);
    };
    let over = -1;
    const point = (i) => {
      if (i === over) return;
      over = i;
      hover.hidden = i < 0;
      stage.classList.toggle('lb-pick', i >= 0);
      if (i >= 0) lay(hover, i);
    };
    section.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') point(cellAt(e)); }, { passive: true });
    section.addEventListener('pointerleave', () => point(-1));
    section.addEventListener('click', (e) => {
      const i = cellAt(e);
      if (i < 0) return;
      if (mine.has(i)) { mine.get(i).remove(); mine.delete(i); }
      else {
        const sq = ground.appendChild(Object.assign(document.createElement('i'), { className: 'lb-mine' }));
        lay(sq, i);
        mine.set(i, sq);
        burst(e.clientX, e.clientY, ['#9db8f5', '#e7eaf0', '#5d7fd0'], 6, 4);
        if (mine.size === 7) found('streak', '🔥 <b>Seven days logged.</b> That’s a week. In Logbook, that is how a streak starts.');
      }
      counted = -1;
      render();
      count.classList.remove('bump');
      void count.offsetWidth;
      count.classList.add('bump');
    });
  }

  // a year over the walkthrough, the first days logged as Today fills its bars
  tl.fromTo(state, { n: 0 }, { n: N, duration: 0.93, onUpdate: render }, 0.03);
  return { relayout: layout, redraw: render, play };
}
