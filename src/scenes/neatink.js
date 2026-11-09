import './neatink.css';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import '@fontsource/lexend/latin-400.css';
import '@fontsource/lora/latin-400.css';
import '@fontsource/lora/latin-600.css';
import '@fontsource/caveat/latin-500.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  mdiViewGridOutline, mdiUndo, mdiRedo, mdiNotePlusOutline, mdiDotsVertical, mdiPen, mdiMarker, mdiEraser, mdiSelectDrag,
  mdiFormatLetterCase, mdiImagePlusOutline, mdiShapeOutline, mdiCreation, mdiAirplane, mdiBattery80, mdiClose, mdiAutoFix,
  mdiMenuDown, mdiCheck, mdiFormatBold, mdiFormatItalic,
} from '@mdi/js';
import ink from './neatink-ink.json';
import { pinScene } from '../scene.js';

const ic = (d, s = 24) => `<svg class="ni-i" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const PAGE = { x: 200, y: 164 }; // page origin in screen space (screen = 1280x800 design px)

// What the walkthrough types. The page's rules sit every 38px, and each baseline lands on one.
const LINES = [
  { y: 156, text: 'Monday notes', size: 31, weight: 600 },
  { y: 232, text: "finish the report, it isn't due till friday", size: 21 },
  { y: 270, text: 'call the team about the demo', size: 21 },
];
const FONTS = [
  { cls: 'f0', family: 'Lexend', k: 1 },
  { cls: 'f1', family: 'Lora', k: 1.06 },
  { cls: 'f2', family: 'Caveat', k: 1.42 },
];
const PDF_LINES = [
  [60, 'h', '4  Synaptic plasticity'],
  [128, '', 'Synapses strengthen with use. When two neurons fire together'],
  [156, '', 'repeatedly, the connection between them becomes more efficient,'],
  [184, '', 'a process known as long-term potentiation. It is widely'],
  [212, '', 'regarded as one of the main cellular mechanisms behind learning'],
  [240, '', 'and memory.'],
  [296, '', 'Plasticity is not limited to strengthening. Connections that are'],
  [324, '', 'rarely used are weakened or pruned, which keeps the network'],
  [352, '', 'efficient and lets it adapt as experience changes.'],
];
const HL = { y: 184, x: 86, w: 470 }; // the highlighted sentence

// Reveal masks: each stroke's pressure outline is uncovered along its centre-line, like ink flowing from the pen.
// With `byLine`, each written line is its own group with a clip, so Convert can wipe the ink away line by line.
function inkSvg(group, id, color, byLine = false) {
  const defs = group.strokes.map((s, i) => `<mask id="${id}${i}" maskUnits="userSpaceOnUse" x="${s.b[0]}" y="${s.b[1]}" width="${s.b[2]}" height="${s.b[3]}"><path d="${s.c}" fill="none" stroke="#fff" stroke-width="${s.w}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${s.len + 2}" stroke-dashoffset="${s.len + 2}"/></mask>`).join('');
  const path = (s, i) => `<path d="${s.f}" fill="${color}" mask="url(#${id}${i})"/>`;
  if (!byLine) return `<defs>${defs}</defs>${group.strokes.map(path).join('')}`;
  const lines = [...new Set(group.strokes.map((s) => s.line))];
  const clips = lines.map((l) => `<clipPath id="${id}c${l}"><rect x="0" y="0" width="880" height="780"/></clipPath>`).join('');
  const body = lines.map((l) => `<g clip-path="url(#${id}c${l})">${group.strokes.map((s, i) => (s.line === l ? path(s, i) : '')).join('')}</g>`).join('');
  return `<defs>${defs}${clips}</defs>${body}`;
}
// Where Convert's light passes over each line (it covers the handwriting and the typed text that replaces it).
const SWEEP_Y = [[100, 92], [190, 70], [232, 50]];
// The sparkles that burst off "Fix all": [x, y] of each one's flight, from the chip's left edge.
const SPARKS = [[-62, -50], [-12, -66], [40, -46], [-74, 26], [58, 34], [-26, 58], [16, -80]];
const sparkle = (i) => `<svg class="ni-spark" width="30" height="30" viewBox="-10 -10 20 20" aria-hidden="true"><path d="M0-10C1.4-2.4 2.4-1.4 10 0 2.4 1.4 1.4 2.4 0 10-1.4 2.4-2.4 1.4-10 0-2.4-1.4-1.4-2.4 0-10Z" fill="${['#e08a00', '#4b57a9', '#1f7a3d'][i % 3]}"/></svg>`;

function build() {
  const underlines = FONTS.map((f) => `<line class="${f.cls} ni-u" stroke="#e08a00" stroke-width="2" stroke-linecap="round" stroke-dasharray="0.1 4.5"/>`).join('');
  const typed = LINES.map((l, i) => `<g clip-path="url(#tc${i})">${FONTS.map((f) => `<text class="${f.cls}" x="64" y="${l.y}" font-family="${f.family}" font-size="${l.size * f.k}" font-weight="${l.weight ?? 400}" fill="#1b1b1f">${l.text}</text>`).join('')}${i === 1 ? underlines : ''}</g>`).join('');
  const clips = LINES.map((_, i) => `<clipPath id="tc${i}"><rect x="0" y="0" width="0" height="780"/></clipPath>`).join('');
  const colors = ['#1b1b1f', '#c62828', '#1e5bd8', '#1f7a3d', '#e08a00', '#7b3fb0'];
  return `
<div class="ni-frame"><div class="ni-bezel"><div class="ni-view">
  <div class="ni-status"><span>9:41</span><span>${ic(mdiAirplane, 16)}${ic(mdiBattery80, 18)}</span></div>
  <div class="ni-appbar">
    <div class="ni-icbtn">${ic(mdiViewGridOutline)}</div>
    <div class="ni-title"><b class="t0">Monday notes</b><b class="t1">Chapter 4.pdf</b></div>
    <div class="ni-icbtn" data-undo>${ic(mdiUndo)}</div>
    <div class="ni-icbtn" data-redo>${ic(mdiRedo)}</div>
    <div class="ni-icbtn">${ic(mdiNotePlusOutline)}</div>
    <div class="ni-convert">${ic(mdiFormatLetterCase, 22)}Convert</div>
    <div class="ni-icbtn" data-more>${ic(mdiDotsVertical)}</div>
  </div>
  <div class="ni-tools">
    <div class="ni-tool on">${ic(mdiPen)}</div><div class="ni-tool">${ic(mdiMarker)}</div><div class="ni-tool">${ic(mdiEraser)}</div>
    <div class="ni-tool" data-lasso>${ic(mdiSelectDrag)}</div><div class="ni-tool">${ic(mdiFormatLetterCase)}</div>
    <div class="ni-tool">${ic(mdiImagePlusOutline)}</div><div class="ni-tool">${ic(mdiShapeOutline)}</div>
    <span class="ni-sep"></span>
    ${colors.map((c, i) => `<span class="ni-dot${i ? '' : ' on'}" style="background:${c}"></span>`).join('')}
    <span class="ni-sep"></span>
    <span class="ni-wd"><i style="height:2px"></i></span><span class="ni-wd"><i style="height:4px"></i></span><span class="ni-wd"><i style="height:7px"></i></span>
    <div class="ni-auto">${ic(mdiCreation, 20)}Auto</div>
  </div>
  <div class="ni-pagearea">
    <div class="ni-page ni-notes">
      <svg class="ni-ink" width="880" height="780" viewBox="0 0 880 780">${inkSvg(ink.notes, 'nm', '#1c1f33', true)}</svg>
      <svg class="ni-typedsvg" width="880" height="780" viewBox="0 0 880 780"><defs>${clips}<linearGradient id="ni-sweepg"><stop offset="0" stop-color="#7f8cff" stop-opacity="0"/><stop offset="0.82" stop-color="#7f8cff" stop-opacity="0.3"/><stop offset="0.95" stop-color="#4b57a9" stop-opacity="0.85"/><stop offset="1" stop-color="#4b57a9" stop-opacity="0"/></linearGradient></defs><g class="ni-typed">${typed}</g>
        ${SWEEP_Y.map(([y, h]) => `<rect class="ni-sweep" x="-80" y="${y}" width="80" height="${h}" rx="6" fill="url(#ni-sweepg)"/>`).join('')}</svg>
      <svg width="880" height="780" viewBox="0 0 880 780"><path class="ni-lassopath" d="M52,104 C260,84 560,92 790,100 C830,112 846,150 842,214 C838,276 830,300 792,296 C560,306 260,308 62,298 C34,292 30,250 36,200 C40,150 34,118 52,104 Z" fill="none" stroke="#4b57a9" stroke-width="2.5" stroke-linecap="round"/></svg>
      <div class="ni-selbox" style="left:36px;top:92px;width:808px;height:212px"></div>
    </div>
    <div class="ni-page ni-pdf">
      ${PDF_LINES.map(([y, c, t]) => `<div class="ln ${c}" style="top:${y}px">${t}</div>`).join('')}
      <div class="ni-hl" style="top:${HL.y}px"></div>
      <svg width="880" height="780" viewBox="0 0 880 780"><g transform="translate(570 ${HL.y + 26})">${inkSvg(ink.pdfnote, 'pm', '#c62828')}</g></svg>
    </div>
    <div class="ni-sbar"><span class="ni-font"><b>Lexend</b><b>Lora</b><b>Caveat</b></span>${ic(mdiMenuDown, 20)}<span class="ni-chipb">${ic(mdiFormatBold, 20)}</span><span class="ni-chipb">${ic(mdiFormatItalic, 20)}</span></div>
  </div>
  <div class="ni-scrim"></div>
  <div class="ni-sheet">
    <i class="ni-handle"></i>
    <div class="ni-sh-head"><span>Convert to text</span><span class="ni-icbtn">${ic(mdiClose)}</span></div>
    <div class="ni-seg"><span class="on">${ic(mdiCheck, 18)}This page</span><span>All pages</span></div>
    <div class="ni-sh-body">
      <div class="ni-reading">Reading your handwriting...<div class="ni-bar"><i></i></div></div>
      <div class="ni-review">
        <div class="ni-rv-top"><span>Every line will be converted.</span><span class="ni-fixall">${ic(mdiAutoFix, 18)}Fix all (1)</span></div>
        <div class="ni-pg">Page 1</div>
        <div class="ni-row"><span class="a">Monday notes</span></div>
        <div class="ni-row two"><span class="a">finish the report, it <u>isnt</u> due till friday</span><span class="b">finish the report, it isn't due till friday</span><em class="ni-chip pend">isnt → isn't</em><em class="ni-chip fixed">Fixed: isnt → isn't · Undo</em><span class="ni-sparks">${SPARKS.map((_, i) => sparkle(i)).join('')}</span></div>
        <div class="ni-row"><span class="a">call the team about the demo</span></div>
        <div class="ni-ctl"><span class="ni-drop">Font <b>Lexend</b>${ic(mdiMenuDown, 20)}</span><span class="ni-tgl">${ic(mdiFormatBold, 18)}Bold</span><span class="ni-tgl">${ic(mdiFormatItalic, 18)}Italic</span></div>
        <div class="ni-act"><span class="ni-text">Cancel</span><span class="ni-btn">Convert</span></div>
      </div>
    </div>
  </div>
  <div class="ni-menu">${['Pages', 'Add page', 'Rename', 'Delete page', 'Page paper', 'Export PDF'].map((t) => `<div${t === 'Export PDF' ? ' class="hot"' : ''}>${t}</div>`).join('')}</div>
  <div class="ni-snack"><span class="ni-snack-a"><span class="ni-spin"></span>Exporting PDF...</span><span class="ni-snack-b">${ic(mdiCheck, 20)}Saved Chapter 4.pdf</span></div>
  <i class="glare ni-flash"></i>
  ${Array.from({ length: 10 }, () => '<i class="ni-ripple"></i>').join('')}
  <svg class="ni-penlayer" viewBox="0 0 1280 800"><g class="ni-pen"><g transform="rotate(26)">
    <path d="M0 0 L-5 -24 L5 -24Z" fill="#e6d3b8"/><path d="M0 0 L-1.8 -8 L1.8 -8Z" fill="#2b2b30"/>
    <rect x="-6.5" y="-190" width="13" height="168" rx="5" fill="#fafafc" stroke="#bfc0cc"/><rect x="-6.5" y="-62" width="13" height="10" fill="#4b57a9"/>
  </g></g></svg>
</div></div></div>`;
}

// Tracks which strokes are drawn at time t (0..1 over the whole group) and where the pen tip is.
// Only the stroke being written uses its reveal mask: unwritten strokes are hidden and finished ones drawn plainly,
// so the page is cheap to paint (146 live masks made the first paint of this scene stall).
function inkPlayer(strokes, root) {
  const paths = [...root.querySelectorAll('mask path')];
  const fills = [...root.querySelectorAll('path[mask]')];
  const masks = fills.map((el) => el.getAttribute('mask'));
  const last = paths.map(() => -1);
  const geo = paths.map((p, i) => ({ a: p.getPointAtLength(0), b: p.getPointAtLength(strokes[i].len) }));
  const player = {
    set(t) {
      strokes.forEach((s, i) => {
        const f = t <= s.t0 ? 0 : t >= s.t1 ? 1 : (t - s.t0) / (s.t1 - s.t0);
        if (f === last[i]) return;
        last[i] = f;
        const el = fills[i];
        if (f <= 0) { el.style.visibility = 'hidden'; return; }
        el.style.visibility = '';
        if (f >= 1) { el.removeAttribute('mask'); return; }
        el.setAttribute('mask', masks[i]);
        paths[i].style.strokeDashoffset = (s.len + 2) * (1 - f);
      });
    },
    head(t) {
      for (let i = 0; i < strokes.length; i++) {
        const s = strokes[i];
        if (t < s.t0) { const p = i ? geo[i - 1].b : geo[0].a, q = geo[i].a, u = i ? (t - strokes[i - 1].t1) / (s.t0 - strokes[i - 1].t1) : 0; return [p.x + (q.x - p.x) * u, p.y + (q.y - p.y) * u - 5 * Math.sin(Math.PI * u)]; }
        if (t < s.t1) { const p = paths[i].getPointAtLength(s.len * ((t - s.t0) / (s.t1 - s.t0))); return [p.x, p.y]; }
      }
      const e = geo[geo.length - 1].b;
      return [e.x, e.y];
    },
    end: () => geo[geo.length - 1].b,
    start: () => geo[0].a,
  };
  player.set(0); // nothing written yet
  return player;
}

export function initNeatInk(section, { reduced }) {
  const mount = section.querySelector('[data-device]');
  mount.innerHTML = build();
  const frame = mount.querySelector('.ni-frame');
  const bezel = mount.querySelector('.ni-bezel');
  const view = mount.querySelector('.ni-view');
  const q = (s) => view.querySelector(s);
  const qa = (s) => [...view.querySelectorAll(s)];

  // --- camera: desktop shows the whole tablet; phones get a window that zooms and pans per beat ---
  const pen = { x: 1100, y: 740 };
  const cam = { fx: 560, fy: 360, z: 1.25, w: 1 }; // focus x/y (screen px), zoom, and how much the window follows the pen's x
  const narrow = () => !reduced && matchMedia('(max-width: 820px)').matches; // reduced motion shows the whole device, no camera
  function placeCam() {
    if (!narrow()) { bezel.style.transform = `scale(${frame.clientWidth / 1328})`; return; }
    const s = (frame.clientHeight / 848) * cam.z;
    const W = frame.clientWidth / s, H = frame.clientHeight / s;
    const fx = cam.fx + cam.w * (pen.x * 0.45 + 330 - cam.fx);
    const left = Math.max(0, Math.min(1328 - W, fx + 24 - W / 2));
    const top = Math.max(0, Math.min(848 - H, cam.fy + 24 - H / 2));
    bezel.style.transform = `scale(${s}) translate(${-left}px, ${-top}px)`;
  }
  new ResizeObserver(placeCam).observe(frame);

  // --- measure targets before any state is applied (design px inside the screen) ---
  const k = () => bezel.getBoundingClientRect().width / 1328;
  const C = (el) => { const r = el.getBoundingClientRect(), v = view.getBoundingClientRect(), s = k(); return [(r.left + r.width / 2 - v.left) / s, (r.top + r.height / 2 - v.top) / s]; };
  placeCam();
  const at = {
    convert: C(q('.ni-convert')), undo: C(q('[data-undo]')), redo: C(q('[data-redo]')), more: C(q('[data-more]')),
    fix: C(q('.ni-fixall')), act: C(q('.ni-act .ni-btn')), font: C(q('.ni-font')), exportItem: C(q('.ni-menu .hot')),
  };

  const notes = inkPlayer(ink.notes.strokes, q('.ni-ink'));
  const pdfNote = inkPlayer(ink.pdfnote.strokes, q('.ni-pdf svg'));
  const lasso = q('.ni-lassopath');
  const lassoLen = lasso.getTotalLength();
  lasso.style.strokeDasharray = lassoLen + 2;

  // dotted autocorrect underline under "isn't", measured per font
  const placeUnderlines = () => {
    const i = LINES[1].text.indexOf("isn't");
    FONTS.forEach((f) => {
      const t = q(`text.${f.cls}[y="232"]`), u = q(`.ni-u.${f.cls}`);
      u.setAttribute('x1', t.getStartPositionOfChar(i).x); u.setAttribute('x2', t.getEndPositionOfChar(i + 4).x);
      u.setAttribute('y1', 238); u.setAttribute('y2', 238);
    });
  };
  // (and once they are in, a refresh re-measures where each typed line ends, for Convert's light: see typedEnd)
  Promise.all(FONTS.map((f) => document.fonts.load(`21px ${f.family}`))).then(() => { placeUnderlines(); if (!reduced) ScrollTrigger.refresh(); }).catch(() => {});

  // --- pen ---
  const penEl = q('.ni-pen');
  const placePen = () => { penEl.setAttribute('transform', `translate(${pen.x} ${pen.y})`); placeCam(); };
  const ripples = qa('.ni-ripple');

  // --- initial states ---
  const clipRects = [...q('.ni-typedsvg').querySelectorAll('clipPath rect')];
  const inkClips = [...q('.ni-ink').querySelectorAll('clipPath rect')];
  const sweeps = qa('.ni-sweep');
  const sparks = qa('.ni-spark');
  gsap.set([...sweeps, ...sparks], { opacity: 0 });
  const e = {
    sheet: q('.ni-sheet'), scrim: q('.ni-scrim'), bar: q('.ni-bar i'), reading: q('.ni-reading'), review: q('.ni-review'),
    rows: qa('.ni-row'), fixall: q('.ni-fixall'), chipP: q('.ni-chip.pend'), chipF: q('.ni-chip.fixed'), rowA: q('.ni-row.two .a'), rowB: q('.ni-row.two .b'),
    convert: q('.ni-convert'), inkSvg: q('.ni-ink'), typed: q('.ni-typed'), sel: q('.ni-selbox'), sbar: q('.ni-sbar'), menu: q('.ni-menu'), snack: q('.ni-snack'),
    spin: q('.ni-spin'), notesPage: q('.ni-notes'), pdfPage: q('.ni-pdf'), hl: q('.ni-hl'), t0: q('.t0'), t1: q('.t1'),
    f0: qa('.f0'), f1: qa('.f1'), f2: qa('.f2'),
  };
  gsap.set(e.sheet, { y: 660 });
  gsap.set([e.scrim, e.sel, e.sbar, e.menu, e.snack, e.chipF, e.rowB, e.t1, e.pdfPage, ...e.f1, ...e.f2, ...ripples], { opacity: 0 });
  gsap.set(e.review, { opacity: 0 });
  gsap.set(lasso, { strokeDashoffset: lassoLen + 2, opacity: 1 });
  gsap.set(e.menu, { y: -8 });
  gsap.set(e.snack, { y: 20 });
  gsap.set(penEl, { opacity: 0 });
  placePen();

  // --- timeline (positions are scroll progress, 0..1) ---
  const tl = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } });
  const fade = (t, [a, b], from, to, extra = {}) => tl.fromTo(t, { opacity: from }, { opacity: to, duration: b - a, ...extra }, a);
  let last = [pen.x, pen.y];
  const move = ([a, b], to, ease = 'power2.inOut') => {
    tl.fromTo(pen, { x: last[0], y: last[1] }, { x: to[0], y: to[1], duration: b - a, ease, onUpdate: placePen }, a);
    last = [to[0], to[1]];
  };
  let ripple = 0;
  const tap = (t, [x, y], press) => {
    const r = ripples[ripple++];
    gsap.set(r, { left: x, top: y });
    tl.fromTo(r, { opacity: 0.55, scale: 0.3 }, { opacity: 0, scale: 1.5, duration: 0.02, ease: 'power2.out' }, t);
    if (press) tl.fromTo(press[0], { backgroundColor: press[1] }, { backgroundColor: press[2], duration: 0.008, yoyo: true, repeat: 1 }, t);
  };
  let camAt = { ...cam };
  const focus = ([a, b], to) => {
    tl.fromTo(cam, Object.fromEntries(Object.keys(to).map((k) => [k, camAt[k]])), { ...to, duration: b - a, ease: 'power2.inOut', onUpdate: placeCam }, a);
    camAt = { ...camAt, ...to };
  };
  const crossfade = (t, from, to) => { fade(from, [t, t + 0.014], 1, 0); fade(to, [t, t + 0.014], 0, 1); };

  // intro: the camera settles on the page and the pen comes in
  fade(penEl, [0.04, 0.05], 0, 1);

  // writing: pen tip follows the head of the ink
  const s0 = notes.start();
  last = [PAGE.x + s0.x + 120, PAGE.y + s0.y + 70];
  pen.x = last[0]; pen.y = last[1]; placePen();
  move([0.04, 0.05], [PAGE.x + s0.x, PAGE.y + s0.y]);
  const w = { t: 0 };
  tl.fromTo(w, { t: 0 }, {
    t: 1, duration: 0.22,
    onUpdate() { notes.set(w.t); const h = notes.head(w.t); pen.x = PAGE.x + h[0]; pen.y = PAGE.y + h[1]; placePen(); },
  }, 0.05);
  const e0 = notes.end();
  last = [PAGE.x + e0.x, PAGE.y + e0.y];

  // tap Convert
  focus([0.27, 0.31], { fx: 1000, fy: 300, z: 1.15, w: 0 });
  move([0.275, 0.31], at.convert);
  tap(0.315, at.convert, [e.convert, '#e0e1f9', '#bcc0ee']);

  // the review sheet: read, fix, convert
  fade(e.scrim, [0.32, 0.355], 0, 1);
  tl.fromTo(e.sheet, { y: 660 }, { y: 0, duration: 0.035, ease: 'power3.out' }, 0.32);
  focus([0.325, 0.355], { fx: 640, fy: 480, z: 1.0 });
  tl.fromTo(e.bar, { scaleX: 0 }, { scaleX: 1, duration: 0.035 }, 0.355);
  fade(e.reading, [0.39, 0.4], 1, 0);
  fade(e.review, [0.39, 0.405], 0, 1);
  e.rows.forEach((r, i) => tl.fromTo(r, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.012, ease: 'power2.out' }, 0.405 + i * 0.01));
  move([0.435, 0.46], at.fix);
  tap(0.465, at.fix);
  // the fix lands with a little burst of sparkles off the chip (the app's own "auto fix" sparkle)
  sparks.forEach((s, i) => tl.fromTo(s, { x: 0, y: 0, scale: 0.2, rotation: 0, opacity: 1 }, { x: SPARKS[i][0], y: SPARKS[i][1], scale: 0.7 + (i % 3) * 0.25, rotation: 120, opacity: 0, duration: 0.026, ease: 'power2.out' }, 0.468 + (i % 4) * 0.0025));
  fade(e.fixall, [0.466, 0.472], 1, 0);
  fade(e.chipP, [0.466, 0.472], 1, 0);
  fade(e.chipF, [0.47, 0.478], 0, 1);
  fade(e.rowA, [0.466, 0.474], 1, 0);
  fade(e.rowB, [0.466, 0.474], 0, 1);
  move([0.485, 0.51], at.act);
  tap(0.515, at.act);

  // ink becomes typed text, line by line: a light runs along each line, and the handwriting turns into type as it passes
  tl.fromTo(e.sheet, { y: 0 }, { y: 660, duration: 0.035, ease: 'power3.in' }, 0.52);
  fade(e.scrim, [0.525, 0.555], 1, 0);
  // The light crosses the handwriting; the type forms behind it in step (a typed line is shorter than a written one),
  // so a word is never there twice: what has been passed is type, what is still ahead is ink.
  const inkSpan = [0, 1, 2].map((l) => {
    const ss = ink.notes.strokes.filter((s) => s.line === l);
    return [Math.min(...ss.map((s) => s.b[0])) - 6, Math.max(...ss.map((s) => s.b[0] + s.b[2])) + 6];
  });
  const typedEnd = (i) => 64 + q(`text.f0[y="${LINES[i].y}"]`).getComputedTextLength() + 6; // depends on the font: measured
  clipRects.forEach((r, i) => {
    const t = 0.54 + i * 0.016, d = 0.02, ease = 'power1.inOut', [a, b] = inkSpan[i];
    tl.fromTo(r, { attr: { width: 58 } }, { attr: { width: () => typedEnd(i) }, duration: d, ease }, t);
    tl.fromTo(inkClips[i], { attr: { x: a } }, { attr: { x: b }, duration: d, ease }, t);
    tl.fromTo(sweeps[i], { attr: { x: a - 80 } }, { attr: { x: b - 80 }, duration: d, ease }, t);
    fade(sweeps[i], [t, t + 0.002], 0, 1);
    fade(sweeps[i], [t + d - 0.003, t + d], 1, 0);
  });
  // all type now: the ink layer is hidden and made whole again underneath, for undo to bring back
  tl.fromTo(e.inkSvg, { opacity: 1 }, { opacity: 0, duration: 0.001 }, 0.593);
  tl.fromTo(inkClips, { attr: { x: 880 } }, { attr: { x: 0 }, duration: 0.001 }, 0.594);
  focus([0.525, 0.555], { fx: 550, fy: 360, z: 1.1, w: 0 }); // typed result: whole lines fit
  focus([0.572, 0.6], { fx: 1000, fy: 300, z: 1.15 });

  // undo brings the handwriting back, redo retypes it
  move([0.585, 0.608], at.undo);
  tap(0.612, at.undo);
  fade(e.inkSvg, [0.612, 0.635], 0, 1);
  fade(e.typed, [0.612, 0.635], 1, 0);
  move([0.64, 0.66], at.redo);
  tap(0.665, at.redo);
  fade(e.typed, [0.666, 0.69], 0, 1);
  fade(e.inkSvg, [0.666, 0.69], 1, 0);

  // lasso a block of typed text, restyle its font
  focus([0.69, 0.71], { fx: 600, fy: 360, z: 1.1, w: 1 });
  move([0.69, 0.705], [PAGE.x + 40, PAGE.y + 96]);
  const L = { t: 0 };
  tl.fromTo(L, { t: 0 }, {
    t: 1, duration: 0.05,
    onUpdate() {
      lasso.style.strokeDashoffset = (lassoLen + 2) * (1 - L.t);
      const p = lasso.getPointAtLength(lassoLen * L.t);
      pen.x = PAGE.x + p.x; pen.y = PAGE.y + p.y; placePen();
    },
  }, 0.71);
  last = [PAGE.x + 52, PAGE.y + 104];
  fade(lasso, [0.762, 0.775], 1, 0);
  fade(e.sel, [0.762, 0.775], 0, 1);
  tl.fromTo(e.sbar, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.014, ease: 'power2.out' }, 0.775);
  focus([0.775, 0.8], { fx: 540, fy: 360, z: 1.1, w: 0 });
  move([0.79, 0.805], at.font);
  const fontNames = qa('.ni-font b');
  gsap.set([fontNames[1], fontNames[2]], { opacity: 0 });
  tap(0.812, at.font);
  crossfade(0.812, e.f0, e.f1);
  fade(fontNames[0], [0.812, 0.826], 1, 0); fade(fontNames[1], [0.812, 0.826], 0, 1);
  tap(0.842, at.font);
  crossfade(0.842, e.f1, e.f2);
  fade(fontNames[1], [0.842, 0.856], 1, 0); fade(fontNames[2], [0.842, 0.856], 0, 1);

  // open a PDF: highlight a sentence, write a note, export
  fade(e.sel, [0.862, 0.872], 1, 0);
  fade(e.sbar, [0.862, 0.872], 1, 0);
  // the notes page is slid away and the PDF slides in, like going to the next document
  tl.fromTo(e.notesPage, { x: 0, rotation: 0, opacity: 1 }, { x: -420, rotation: -3, opacity: 0, duration: 0.018, ease: 'power2.in' }, 0.871);
  tl.fromTo(e.pdfPage, { x: 460, rotation: 2.5, opacity: 0 }, { x: 0, rotation: 0, opacity: 1, duration: 0.02, ease: 'power3.out' }, 0.885);
  fade(e.t0, [0.872, 0.895], 1, 0); fade(e.t1, [0.872, 0.895], 0, 1);
  focus([0.865, 0.89], { fx: 600, fy: 380, z: 1.15, w: 1 });
  move([0.872, 0.895], [PAGE.x + HL.x, PAGE.y + HL.y + 20]);
  tl.fromTo(e.hl, { width: 0, opacity: 1 }, { width: HL.w, duration: 0.018, ease: 'power1.inOut' }, 0.9);
  tl.fromTo(pen, { x: PAGE.x + HL.x, y: PAGE.y + HL.y + 20 }, { x: PAGE.x + HL.x + HL.w, y: PAGE.y + HL.y + 20, duration: 0.018, ease: 'power1.inOut', onUpdate: placePen }, 0.9);
  const p0 = pdfNote.start();
  last = [PAGE.x + HL.x + HL.w, PAGE.y + HL.y + 20];
  const NX = 570, NY = HL.y + 22;
  move([0.92, 0.93], [PAGE.x + NX + p0.x, PAGE.y + NY + p0.y]);
  const v = { t: 0 };
  tl.fromTo(v, { t: 0 }, {
    t: 1, duration: 0.023,
    onUpdate() { pdfNote.set(v.t); const h = pdfNote.head(v.t); pen.x = PAGE.x + NX + h[0]; pen.y = PAGE.y + NY + h[1]; placePen(); },
  }, 0.93);
  const pe = pdfNote.end();
  last = [PAGE.x + NX + pe.x, PAGE.y + NY + pe.y];

  focus([0.953, 0.963], { fx: 1000, fy: 300, z: 1.15, w: 0 });
  move([0.955, 0.966], at.more);
  tap(0.968, at.more);
  tl.fromTo(e.menu, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.008, ease: 'power2.out' }, 0.968);
  move([0.98, 0.988], at.exportItem);
  tap(0.99, at.exportItem);
  tl.fromTo(e.menu, { opacity: 1 }, { opacity: 0, duration: 0.002 }, 0.992);
  tl.fromTo(e.snack, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.006, ease: 'power2.out' }, 0.992);
  tl.fromTo(e.spin, { rotation: 0 }, { rotation: 540, duration: 0.02 }, 0.992);
  // done: the snackbar says where it went, and a light passes over the page as it is saved
  const [snackA, snackB] = e.snack.children;
  gsap.set(snackB, { opacity: 0 });
  fade(snackA, [1.012, 1.018], 1, 0);
  tl.fromTo(snackB, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.008, ease: 'back.out(2)' }, 1.013);
  tl.fromTo(q('.ni-flash'), { xPercent: -36 }, { xPercent: 36, duration: 0.03, ease: 'power1.inOut', immediateRender: true }, 1.008);

  // behind the tablet: the scene's own ruled page, and the app's promises written large and faint as the walkthrough goes
  const words = backdrop(section, tl, reduced);

  tl.eventCallback('onUpdate', placeCam); // after every tween has rendered, whatever order a rewind visited them in
  ScrollTrigger.addEventListener('refresh', () => { placeCam(); words.redraw(); }); // refresh renders the timeline to its end and back with events muted
  placeCam();
  pinScene(section, tl, { length: 11, hold: 0.05, captions: [[0, 0.27], [0.27, 1.05]], poster: 0.603, reduced, stacked: true, glass: view });
  if (reduced) {
    words.finish(); // the still shows every word written
    // ...and every typed line whole: the still is drawn before the fonts arrive, so a measured line end would be short
    clipRects.forEach((r) => r.setAttribute('width', 880));
  }
}

/**
 * The backdrop: rules across the whole scene that draw themselves while the chapter slides in, a margin line, and three
 * words in the app's ink colour, each written stroke by stroke during its part of the walkthrough: "offline" while the
 * pen writes, "no accounts" while the ink turns into text, "no ads" over the PDF. As each is finished the same hand
 * marks it, the way notes get marked: "offline" underlined twice, "no accounts" ringed, "no ads" starred.
 */
const MARKS = { // in each word's own coordinates (its baseline is y = 0)
  w1: 'M1 13C24 9 58 15 92 7M88 12C62 16 30 12 6 18',
  w2: 'M12 -33C70 -46 188 -43 195 -15C200 12 62 17 4 5C-20 -5 -8 -30 34 -37',
  w3: 'M-26 -37L-19 -13L-39 -28L-13 -28L-33 -13Z',
};
function backdrop(section, tl, reduced) {
  const word = (w, cls) => {
    const [x, y, bw, bh] = w.box;
    return `<svg class="ni-word ${cls}" viewBox="${x} ${y} ${bw} ${bh}">${w.strokes.map((s) => `<path d="${s.c}" stroke-dasharray="${s.len + 1}" stroke-dashoffset="${s.len + 1}"/>`).join('')}<path class="ni-mark" d="${MARKS[cls]}" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg>`;
  };
  const holder = document.createElement('div');
  holder.innerHTML = `<div class="ni-back backdrop" aria-hidden="true">
    <div class="ni-rules">${Array.from({ length: 34 }, (_, i) => `<i style="top:${22 + i * 44}px"></i>`).join('')}<b></b></div>
    ${word(ink.bg.offline, 'w1')}${word(ink.bg.accounts, 'w2')}${word(ink.bg.ads, 'w3')}<i class="ni-scan"></i></div>`;
  const el = holder.firstElementChild;
  section.querySelector('.stage').prepend(el);
  // when Convert runs, its light crosses the whole scene too, over the ruled page, in step with the lines on the tablet
  const scan = el.querySelector('.ni-scan');
  tl.fromTo(scan, { x: () => -scan.offsetWidth }, { x: () => el.clientWidth, duration: 0.058, ease: 'power1.inOut', immediateRender: true }, 0.538);
  const rules = el.querySelector('.ni-rules');
  const lines = [...rules.querySelectorAll('i')], margin = rules.querySelector('b');
  // (the rules stay put once drawn: a drifting layer the size of the screen costs more than it gives)

  if (reduced) gsap.set(lines, { scaleX: 1 });
  else {
    // 2D transforms: with the site's force3D every line would become a layer of its own
    gsap.timeline({ scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: 0.4 }, defaults: { force3D: false } })
      .fromTo(lines, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power2.out', stagger: 0.025 }, 0)
      .fromTo(margin, { scaleY: 0 }, { scaleY: 1, duration: 0.6, ease: 'power2.out' }, 0.15);
  }

  const writers = [[ink.bg.offline, '.w1', 0.04, 0.28], [ink.bg.accounts, '.w2', 0.52, 0.7], [ink.bg.ads, '.w3', 0.78, 0.97]].map(([w, sel, a, b]) => {
    const paths = [...el.querySelectorAll(`${sel} path:not(.ni-mark)`)];
    // the mark goes on in one quick movement, the moment the word is done
    tl.fromTo(el.querySelector(`${sel} .ni-mark`), { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.028, ease: 'power2.inOut', immediateRender: true }, b + 0.006);
    const shown = paths.map(() => -1);
    const o = { p: 0 };
    const draw = (p) => w.strokes.forEach((s, i) => {
      const f = Math.max(0, Math.min(1, (p - s.t0) / (s.t1 - s.t0)));
      if (f !== shown[i]) { shown[i] = f; paths[i].style.strokeDashoffset = ((s.len + 1) * (1 - f)).toFixed(1); }
    });
    tl.fromTo(o, { p: 0 }, { p: 1, duration: b - a, onUpdate: () => draw(o.p) }, a);
    return { redraw: () => draw(o.p), finish: () => draw(1) };
  });
  return { redraw: () => writers.forEach((w) => w.redraw()), finish: () => { writers.forEach((w) => w.finish()); gsap.set(el.querySelectorAll('.ni-mark'), { strokeDashoffset: 0 }); } };
}
