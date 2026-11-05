// Turns text into handwriting: Hershey single-line glyphs -> jittered, slanted strokes -> smoothed centre-lines
// -> pressure outlines (perfect-freehand, the library the real app draws with). Output feeds the NeatInk scene.
import { createRequire } from 'node:module';
import { getStroke } from 'perfect-freehand';
const hershey = createRequire(import.meta.url)('hersheytext');

// Small seeded PRNG so the handwriting is the same on every build.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function glyph(font, ch) {
  const g = font.getChar(ch);
  if (!g) return { width: 12, strokes: [] };
  const strokes = (g.d || '').split('M').filter(Boolean).map((seg) => seg.replace(/L/g, ' ').trim().split(/\s+/).map((p) => p.split(',').map(Number)));
  return { width: g.width, strokes };
}

// Catmull-Rom through the points, sampled every ~`step` px.
function smooth(pts, step) {
  if (pts.length < 3) return pts;
  const out = [];
  const P = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(1, Math.round(d / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((a) => 0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const r1 = (n) => Math.round(n * 10) / 10;
const pathFromOutline = (o) => {
  if (o.length < 3) return '';
  let d = `M${r1(o[0][0])},${r1(o[0][1])}Q`;
  for (let i = 0; i < o.length; i++) {
    const [x0, y0] = o[i], [x1, y1] = o[(i + 1) % o.length];
    d += `${r1(x0)},${r1(y0)} ${r1((x0 + x1) / 2)},${r1((y0 + y1) / 2)} `;
  }
  return d + 'Z';
};
const bboxOf = (p, pad) => { const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad; return [Math.floor(x0), Math.floor(y0), Math.ceil(Math.max(...xs) + pad - x0), Math.ceil(Math.max(...ys) + pad - y0)]; };
const pathFromPoints = (p) => 'M' + p.map(([x, y]) => `${r1(x)},${r1(y)}`).join('L');

/**
 * @param {string} text
 * @param {{x:number, baseline:number, scale:number, font?:string, seed?:number, slant?:number, size?:number, jitter?:number}} o
 * @returns strokes [{f, c, len, w}] in page px, in writing order, and the line's right edge
 */
export function handwrite(text, o) {
  const font = hershey.getFontData(o.font ?? 'cursive');
  const rand = rng(o.seed ?? 1);
  const j = o.jitter ?? 1;
  const slant = Math.tan(((o.slant ?? 0) * Math.PI) / 180); // the font is already slanted
  let x = o.x;
  const strokes = [];
  const drift = (rand() - 0.5) * 3; // whole-line tilt
  for (const ch of text) {
    const g = glyph(font, ch);
    const s = o.scale * (1 + (rand() - 0.5) * 0.12 * j);
    const rot = (rand() - 0.5) * 0.07 * j;
    const lift = (rand() - 0.5) * 3 * j + drift * ((x - o.x) / 600);
    const cx = g.width / 2;
    for (const stroke of g.strokes) {
      const pts = stroke.map(([gx, gy]) => {
        let px = (gx - cx) * s, py = (gy - 22) * s;      // baseline at glyph y = 22
        px += -py * slant;                                // slant
        const rx = px * Math.cos(rot) - py * Math.sin(rot), ry = px * Math.sin(rot) + py * Math.cos(rot);
        return [x + cx * s + rx + (rand() - 0.5) * 0.5 * j, o.baseline + lift + ry + (rand() - 0.5) * 0.5 * j];
      });
      const c = smooth(pts, 1.8);
      let len = 0;
      for (let i = 1; i < c.length; i++) len += Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]);
      const outline = getStroke(c, { size: o.size ?? 3.6, thinning: 0.5, smoothing: 0.6, streamline: 0.45, simulatePressure: true, start: { taper: 4 }, end: { taper: 10 } });
      strokes.push({ f: pathFromOutline(outline), c: pathFromPoints(c), len: r1(len), w: (o.size ?? 3.6) + 2, b: bboxOf(c, 6) });
    }
    x += g.width * s * (o.tracking ?? 1.3) * (1 + (rand() - 0.5) * 0.1 * j) + (ch === ' ' ? 5 * o.scale : 0);
  }
  return { strokes, right: x };
}

/** A hand-drawn straight-ish line (underline) through the same smoothing + outline pipeline. */
export function polyline(points, { size = 3, seed = 1 } = {}) {
  const rand = rng(seed);
  const pts = points.map(([x, y]) => [x + (rand() - 0.5) * 1.2, y + (rand() - 0.5) * 1.2]);
  const c = smooth(pts, 1.8);
  let len = 0;
  for (let i = 1; i < c.length; i++) len += Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]);
  const outline = getStroke(c, { size, thinning: 0.4, smoothing: 0.6, streamline: 0.4, simulatePressure: true, start: { taper: 6 }, end: { taper: 12 } });
  return { f: pathFromOutline(outline), c: pathFromPoints(c), len: r1(len), w: size + 2, b: bboxOf(c, 6) };
}

/** Assigns each stroke a [t0, t1] slice of 0..1 in writing order: time follows length, with a pause per pen lift and per line. */
export function schedule(lines) {
  const LIFT = 7, LINE_GAP = 60;
  let t = 0;
  const flat = [];
  const meta = lines.map((strokes, li) => {
    if (li) t += LINE_GAP;
    const start = t;
    for (const s of strokes) {
      s.t0 = t; t += s.len; s.t1 = t; t += LIFT;
      s.line = li; flat.push(s);
    }
    return { t0: start, t1: t - LIFT };
  });
  const total = t - LIFT;
  const n = (v) => Math.round((v / total) * 10000) / 10000;
  for (const s of flat) { s.t0 = n(s.t0); s.t1 = n(s.t1); }
  return { strokes: flat, lines: meta.map((m) => ({ t0: n(m.t0), t1: n(m.t1) })) };
}
