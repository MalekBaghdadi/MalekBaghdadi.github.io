import './pigeon.css';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import '@fontsource/roboto/latin-900.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  mdiAirplane, mdiBluetooth, mdiBattery70, mdiSync, mdiAccessPoint, mdiNavigationVariantOutline, mdiAlertCircleOutline, mdiHomeOutline,
  mdiRadar, mdiFormatListBulleted, mdiAccountOutline, mdiFire, mdiMedicalBag, mdiPackageVariantClosed, mdiAlert, mdiMapMarkerOutline,
  mdiSwapHorizontal,
} from '@mdi/js';
import { pinScene } from '../scene.js';

const ic = (d, s = 24) => `<svg class="pg-i" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const COORDS = 'Lat: 33.8938, Lon: 35.5018';

// The mesh: seven phones in radio range of their neighbours. Hops are [round, from, to, alreadyHadIt].
const NODES = [[130, 390], [300, 230], [300, 560], [500, 390], [650, 180], [660, 590], [850, 390]];
const EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [1, 4], [3, 4], [3, 5], [2, 5], [4, 6], [5, 6], [3, 6]];
const HOPS = [[1, 0, 1], [1, 0, 2], [2, 1, 3], [2, 2, 3, 1], [2, 1, 4], [3, 3, 5], [3, 3, 6], [3, 4, 6, 1], [4, 5, 6, 1], [4, 2, 5, 1]];
const ROUND_AT = { 1: 0.49, 2: 0.527, 3: 0.567, 4: 0.607 };
const FLY = 0.026;
const HOPS_FROM_ORIGIN = [0, 1, 1, 2, 2, 3, 3];

const TYPES = [['FIRE', mdiFire], ['MEDICAL', mdiMedicalBag], ['SUPPLIES', mdiPackageVariantClosed], ['CONFLICT', mdiAlert], ['SOS', mdiAlert], ['OTHER', mdiMapMarkerOutline]];

const mapSvg = `
<svg class="pg-map" width="340" height="610" viewBox="0 0 340 610" aria-hidden="true">
  <rect width="340" height="610" fill="#ece6d9"/>
  <path d="M0 330 C40 320 70 380 60 450 C52 520 20 560 0 580 Z" fill="#c8d8e6"/>
  <rect x="200" y="196" width="104" height="86" rx="10" fill="#d6e2c3"/>
  <g fill="#e2dbcb"><rect x="96" y="60" width="62" height="48"/><rect x="206" y="58" width="72" height="56"/><rect x="104" y="170" width="76" height="70"/><rect x="108" y="330" width="64" height="54"/><rect x="212" y="326" width="80" height="64"/><rect x="104" y="440" width="70" height="58"/><rect x="214" y="450" width="66" height="60"/></g>
  <defs><path id="pg-roads" fill="none" stroke-linecap="round" d="M-10 130 L350 150 M-10 300 L350 285 M-10 420 L350 440 M-10 540 L350 530 M72 -10 L92 620 M192 -10 L180 620 M296 -10 L316 620 M-10 40 L120 200 L350 262"/></defs>
  <use href="#pg-roads" stroke="#d9d2c2" stroke-width="12"/><use href="#pg-roads" stroke="#fff" stroke-width="8.5"/>
  <circle cx="170" cy="305" r="150" fill="rgba(22,163,74,0.10)" stroke="rgba(22,163,74,0.5)" stroke-width="2"/>
  <g class="pg-peers" fill="#5b8bdf" stroke="#fff" stroke-width="2"><circle cx="112" cy="232" r="6"/><circle cx="242" cy="262" r="6"/><circle cx="224" cy="392" r="6"/><circle cx="96" cy="372" r="6"/></g>
  <circle cx="170" cy="305" r="16" fill="rgba(66,133,244,0.2)"/><circle cx="170" cy="305" r="7.5" fill="#4285f4" stroke="#fff" stroke-width="2.5"/>
  <g stroke="#e57373" stroke-width="2" fill="none" stroke-linecap="round"><circle cx="170" cy="305" r="22"/><path d="M170 271 V287 M170 323 V339 M136 305 H152 M188 305 H204"/></g>
</svg>`;

const chip = (cls, label) => `<div class="pg-ev ${cls}">${label}</div>`;

function build() {
  const edges = EDGES.map(([a, b]) => `<line class="pg-edge" x1="${NODES[a][0]}" y1="${NODES[a][1]}" x2="${NODES[b][0]}" y2="${NODES[b][1]}"/>`).join('');
  const edgesOn = EDGES.map(([a, b]) => `<line class="pg-edge-on" x1="${NODES[a][0]}" y1="${NODES[a][1]}" x2="${NODES[b][0]}" y2="${NODES[b][1]}"/>`).join('');
  const nodes = NODES.map(([x, y], i) => `<g class="pg-node" transform="translate(${x} ${y})"><circle class="pg-ring" r="50"/><circle class="pg-act" r="50"/><circle class="pg-pulse" r="50"/>${i ? '<rect class="pg-body" x="-19" y="-37" width="38" height="74" rx="8"/><rect class="pg-scr" x="-14" y="-31" width="28" height="56" rx="4"/>' : ''}<rect class="pg-badge" x="-9" y="42" width="18" height="10" rx="3" style="transform-box:fill-box;transform-origin:center"/></g>`).join('');
  const tokens = HOPS.map(() => '<circle class="pg-tk" cx="0" cy="0" r="7"/>').join('');
  const blocks = Array.from({ length: 14 }, (_, j) => `<rect class="pg-blk" x="${100 + j * 22}" y="14" width="20" height="30" rx="4" fill="${j % 2 ? '#7ba3ec' : '#df9c20'}"/>`).join('');
  return `
<div class="pg-frame"><div class="pg-stage">
  <svg class="pg-mesh" viewBox="0 0 1000 760" aria-hidden="true">${edges}${edgesOn}${nodes}${tokens}</svg>
  <div class="pg-phone"><div class="pg-screen">
    <div class="pg-status"><span>9:41</span><span>${ic(mdiBluetooth, 13)}${ic(mdiAirplane, 13)}${ic(mdiBattery70, 15)}</span></div>
    ${mapSvg}
    <div class="pg-head">
      <div><small>COORDINATES</small><b>${COORDS}</b></div>
      <div class="pg-mstat"><span class="ico icA">${ic(mdiAccessPoint, 18)}</span><span class="ico icB">${ic(mdiSync, 18)}</span><span class="st stA">ACCEPTING CONNECTIONS</span><span class="st stB">SCANNING</span></div>
    </div>
    <div class="pg-fab">${ic(mdiNavigationVariantOutline, 22)}</div>
    <div class="pg-pin">${ic(mdiFire, 20)}</div><i class="pg-wave"></i>
    <div class="pg-report">${ic(mdiAlertCircleOutline, 22)}REPORT</div>
    <div class="pg-nav">
      <div class="on"><span class="ic">${ic(mdiHomeOutline, 22)}</span>Map</div><div><span class="ic">${ic(mdiRadar, 22)}</span>Radar</div>
      <div><span class="ic">${ic(mdiFormatListBulleted, 22)}</span>Log</div><div><span class="ic">${ic(mdiAccountOutline, 22)}</span>Profile</div>
    </div>
    <div class="pg-scrim"></div>
    <div class="pg-sheet">
      <div class="pg-step s1">
        <h3>Report Incident</h3>
        <div class="pg-tiles">${TYPES.map(([t, d]) => `<div class="pg-tile" data-t="${t}">${ic(d, 28)}${t}</div>`).join('')}</div>
        <div class="pg-loc">${ic(mdiMapMarkerOutline, 20)}${COORDS}<em>AUTO-FILLED</em></div>
        <div class="pg-actions"><span class="t">CANCEL</span><span class="b pg-next">NEXT</span></div>
      </div>
      <div class="pg-step s2">
        <h3>Incident Details</h3>
        <span class="pg-chip">${ic(mdiFire, 18)}FIRE</span>
        <div class="pg-field pg-ftitle"><i>Event Title</i><span class="v"></span></div>
        <div class="pg-field tall pg-fdesc"><i>Event Description</i><span class="v"></span></div>
        <div class="pg-ttl"><div>DAYS<b>1</b></div><div>HOURS<b>0</b></div></div>
        <div class="pg-actions"><span class="t">BACK</span><span class="b pg-confirm">CONFIRM REPORT</span></div>
      </div>
    </div>
    <i class="pg-tap"></i><i class="pg-tap"></i><i class="pg-tap"></i><i class="pg-tap"></i><i class="pg-tap"></i><i class="pg-tap"></i><i class="pg-tap"></i><i class="pg-tap"></i>
    <i class="pg-touch"></i>
  </div></div>

  <div class="pg-card pg-union">
    <h4>Two phones meet</h4>
    <p>Each one sends the events the other is missing.</p>
    <div class="pg-ph" style="left:40px"><small>Phone A</small></div>
    <div class="pg-ph" style="left:330px"><small>Phone B</small></div>
    ${chip('f', 'FIRE')}${chip('s', 'SUPPLIES')}${chip('m g', 'MEDICAL')}${chip('s', 'SUPPLIES')}${chip('m', 'MEDICAL')}${chip('f g', 'FIRE')}
    <div class="pg-swap" style="position:absolute;left:236px;top:128px;color:#b9ae96">${ic(mdiSwapHorizontal, 48)}</div>
    <p class="pg-same">Same set on both phones.</p>
  </div>
  <div class="pg-card pg-duty">
    <h4>One phone's radio</h4>
    <svg class="pg-strip" viewBox="0 0 476 70" aria-hidden="true">
      <line x1="0" y1="29" x2="96" y2="29" stroke="#df9c20" stroke-opacity=".7" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>${blocks}
      <line x1="412" y1="29" x2="476" y2="29" stroke="#df9c20" stroke-opacity=".7" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>
      <line class="pg-cursor" x1="0" y1="2" x2="0" y2="58"/>
    </svg>
    <div class="pg-legend"><span><b>Passive</b>Listening, low power</span><span style="text-align:center"><b>Active wave</b>Beacon, then scan, 1.5 s each, for 60 s</span><span style="text-align:right"><b>Passive again</b>Back to listening</span></div>
  </div>
</div></div>`;
}

export function initPigeon(section, { reduced }) {
  const mount = section.querySelector('[data-device]');
  mount.innerHTML = build();
  const frame = mount.querySelector('.pg-frame');
  const stage = mount.querySelector('.pg-stage');
  const screen = mount.querySelector('.pg-screen');
  const q = (s, r = mount) => r.querySelector(s);
  const qa = (s, r = mount) => [...r.querySelectorAll(s)];

  // --- camera: desktop shows the whole stage; phones zoom and pan ---
  const cam = { fx: 500, fy: 380, z: 1 };
  const narrow = () => !reduced && matchMedia('(max-width: 820px)').matches; // reduced motion shows the whole device, no camera
  const fit = (focus, size, view) => (view >= size ? (size - view) / 2 : Math.max(0, Math.min(size - view, focus - view / 2)));
  function placeCam() {
    if (!narrow()) { stage.style.transform = `scale(${frame.clientWidth / 1000})`; return; }
    const s = (frame.clientHeight / 760) * cam.z;
    const W = frame.clientWidth / s, H = frame.clientHeight / s;
    stage.style.transform = `scale(${s}) translate(${-fit(cam.fx, 1000, W)}px, ${-fit(cam.fy, 760, H)}px)`;
  }
  new ResizeObserver(placeCam).observe(frame);
  placeCam();

  // --- measure phone targets (design px inside the phone screen) before any state is applied ---
  const k = () => stage.getBoundingClientRect().width / 1000;
  const C = (el) => { const r = el.getBoundingClientRect(), v = screen.getBoundingClientRect(), s = k(); return [(r.left + r.width / 2 - v.left) / s, (r.top + r.height / 2 - v.top) / s]; };
  const at = {
    report: C(q('.pg-report')), fire: C(q('.pg-tile[data-t="FIRE"]')), next: C(q('.pg-next')),
    title: C(q('.pg-ftitle')), desc: C(q('.pg-fdesc')), confirm: C(q('.pg-confirm')),
  };

  const e = {
    phone: q('.pg-phone'), touch: q('.pg-touch'), taps: qa('.pg-tap'), report: q('.pg-report'), sheet: q('.pg-sheet'), scrim: q('.pg-scrim'),
    s1: q('.s1'), s2: q('.s2'), fireTile: q('.pg-tile[data-t="FIRE"]'), tTitle: q('.pg-ftitle .v'), tDesc: q('.pg-fdesc .v'), fTitle: q('.pg-ftitle'), fDesc: q('.pg-fdesc'),
    stA: q('.stA'), stB: q('.stB'), icA: q('.icA'), pin: q('.pg-pin'), wave: q('.pg-wave'), peers: q('.pg-peers'),
    nodes: qa('.pg-node'), edges: qa('.pg-edge'), edgesOn: qa('.pg-edge-on'), tokens: qa('.pg-tk'),
    union: q('.pg-union'), duty: q('.pg-duty'),
  };
  const nodeParts = e.nodes.map((n) => ({ g: n, act: q('.pg-act', n), pulse: q('.pg-pulse', n), badge: q('.pg-badge', n) }));
  const syncIcon = q('.icB');

  // --- initial states ---
  gsap.set(e.s2, { opacity: 0 });
  gsap.set(e.sheet, { y: 520 });
  gsap.set([e.scrim, e.touch, ...e.taps, e.pin, e.stB, syncIcon, e.peers, e.union, e.duty, ...e.nodes, ...e.edges, ...e.edgesOn, ...e.tokens], { opacity: 0 });
  gsap.set(nodeParts.map((n) => n.badge), { scale: 0 });
  gsap.set(e.pin, { y: -140 });
  gsap.set([e.union, e.duty], { y: 24 });

  // --- timeline ---
  const tl = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } });
  const fade = (t, [a, b], from, to, extra = {}) => tl.fromTo(t, { opacity: from }, { opacity: to, duration: b - a, ...extra }, a);

  let last = [at.report[0] + 80, at.report[1] + 120];
  gsap.set(e.touch, { x: last[0], y: last[1] });
  const touchTo = ([a, b], to) => { tl.fromTo(e.touch, { x: last[0], y: last[1] }, { x: to[0], y: to[1], duration: b - a, ease: 'power2.inOut' }, a); last = [to[0], to[1]]; };
  let tapN = 0;
  const tap = (t, [x, y]) => {
    const r = e.taps[tapN++];
    gsap.set(r, { left: x, top: y });
    tl.fromTo(r, { opacity: 0.6, scale: 0.3 }, { opacity: 0, scale: 1.5, duration: 0.02, ease: 'power2.out' }, t);
    tl.fromTo(e.touch, { scale: 1 }, { scale: 0.8, duration: 0.005, yoyo: true, repeat: 1 }, t);
  };
  const type = (el, text, a, b) => {
    const o = { n: 0 };
    tl.fromTo(o, { n: 0 }, { n: text.length, duration: b - a, onUpdate() { el.textContent = text.slice(0, Math.round(o.n)); } }, a);
  };
  let camAt = { ...cam };
  const focus = ([a, b], to) => {
    tl.fromTo(cam, Object.fromEntries(Object.keys(to).map((key) => [key, camAt[key]])), { ...to, duration: b - a, ease: 'power2.inOut', onUpdate: placeCam }, a);
    camAt = { ...camAt, ...to };
  };

  // 1. report an incident on the phone
  fade(e.touch, [0.03, 0.04], 0, 1);
  touchTo([0.035, 0.07], at.report);
  tap(0.075, at.report);
  tl.fromTo(e.report, { scale: 1 }, { scale: 0.94, duration: 0.005, yoyo: true, repeat: 1 }, 0.075);
  fade(e.scrim, [0.08, 0.11], 0, 1);
  tl.fromTo(e.sheet, { y: 520 }, { y: 0, duration: 0.03, ease: 'power3.out' }, 0.08);
  touchTo([0.12, 0.15], at.fire);
  tap(0.155, at.fire);
  tl.fromTo(e.fireTile, { borderColor: '#e5e2dc', backgroundColor: '#f8f7f6' }, { borderColor: '#df9c20', backgroundColor: 'rgba(223,156,32,0.14)', duration: 0.008 }, 0.155);
  touchTo([0.165, 0.19], at.next);
  tap(0.195, at.next);
  fade(e.s1, [0.2, 0.225], 1, 0);
  fade(e.s2, [0.2, 0.225], 0, 1);
  touchTo([0.225, 0.24], [at.title[0] + 20, at.title[1] + 40]);
  tap(0.244, [at.title[0] + 20, at.title[1] + 40]);
  tl.fromTo(e.fTitle, { borderColor: '#e5e2dc' }, { borderColor: '#df9c20', duration: 0.006 }, 0.244);
  type(e.tTitle, 'Fire at the old market', 0.25, 0.275);
  touchTo([0.268, 0.285], [at.desc[0] + 20, at.desc[1] + 40]);
  tap(0.289, [at.desc[0] + 20, at.desc[1] + 40]);
  tl.fromTo(e.fDesc, { borderColor: '#e5e2dc' }, { borderColor: '#df9c20', duration: 0.006 }, 0.289);
  type(e.tDesc, 'Smoke from the second floor. People are moving north.', 0.295, 0.325);
  touchTo([0.325, 0.345], at.confirm);
  tap(0.35, at.confirm);

  // 2. the sheet closes, the pin drops, the radio wakes up
  tl.fromTo(e.sheet, { y: 0 }, { y: 520, duration: 0.03, ease: 'power3.in' }, 0.355);
  fade(e.scrim, [0.36, 0.385], 1, 0);
  fade(e.touch, [0.36, 0.37], 1, 0);
  tl.fromTo(e.pin, { y: -140, opacity: 0 }, { y: 0, opacity: 1, duration: 0.03, ease: 'bounce.out' }, 0.37);
  tl.fromTo(e.wave, { opacity: 0.8, scale: 0.4 }, { opacity: 0, scale: 3.6, duration: 0.05, ease: 'power2.out' }, 0.385);
  fade(e.peers, [0.39, 0.4], 0, 1);
  crossfade(0.385);
  function crossfade(t) {
    fade(e.stA, [t, t + 0.012], 1, 0); fade(e.stB, [t, t + 0.012], 0, 1);
    fade(e.icA, [t, t + 0.012], 1, 0); fade(syncIcon, [t, t + 0.012], 0, 1);
    tl.fromTo(syncIcon, { rotation: 0 }, { rotation: 1440, duration: 0.4 }, t);
  }

  // 3. pull back: the phone becomes one node in a mesh
  focus([0.4, 0.48], { z: 0.62, fx: 500, fy: 380 });
  tl.fromTo(e.phone, { x: 0, y: 0, scale: 1 }, { x: NODES[0][0] - 500, y: NODES[0][1] - 380, scale: 0.1, duration: 0.08, ease: 'power3.inOut' }, 0.4);
  fade(e.nodes[0], [0.4, 0.425], 0, 1);
  fade(nodeParts[0].act, [0.42, 0.45], 0, 1);
  tl.fromTo(nodeParts[0].badge, { scale: 0 }, { scale: 1, duration: 0.012, ease: 'back.out(2.5)' }, 0.44);
  e.nodes.slice(1).forEach((n, i) => fade(n, [0.44 + i * 0.006, 0.46 + i * 0.006], 0, 1));
  e.edges.forEach((l) => fade(l, [0.46, 0.49], 0, 1));

  // 4. the event spreads hop by hop; a phone that already has it ignores the copy
  const seen = {};
  HOPS.forEach(([round, a, b, dup], i) => {
    const t0 = ROUND_AT[round] + (seen[round] = (seen[round] ?? -1) + 1) * 0.004, t1 = t0 + FLY;
    const edgeIdx = EDGES.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
    const tk = e.tokens[i], on = e.edgesOn[edgeIdx];
    fade(on, [t0, t0 + 0.006], 0, 1);
    fade(on, [t1, t1 + 0.012], 1, 0);
    tl.fromTo(tk, { attr: { cx: NODES[a][0], cy: NODES[a][1] } }, { attr: { cx: NODES[b][0], cy: NODES[b][1] }, duration: FLY, ease: 'power1.inOut' }, t0);
    fade(tk, [t0, t0 + 0.004], 0, 1);
    fade(tk, [t1, t1 + (dup ? 0.012 : 0.005)], 1, 0);
    if (!dup) {
      const p = nodeParts[b];
      tl.fromTo(p.badge, { scale: 0 }, { scale: 1, duration: 0.012, ease: 'back.out(2.5)' }, t1);
      fade(p.act, [t1, t1 + 0.01], 0, 1);
      tl.fromTo(p.pulse, { attr: { r: 50 }, opacity: 0.8 }, { attr: { r: 96 }, opacity: 0, duration: 0.035, ease: 'power2.out' }, t1);
    }
  });

  // 5. two phones meet and merge their event sets: the union is the same on both
  focus([0.655, 0.675], { z: 1, fx: 500, fy: 570 });
  tl.fromTo(e.union, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.014, ease: 'power2.out' }, 0.66);
  const uChips = qa('.pg-ev', e.union), uSwap = q('.pg-swap', e.union), uSame = q('.pg-same', e.union);
  const slotY = [104, 138, 172];
  // A: FIRE, SUPPLIES, (MEDICAL arrives)   B: SUPPLIES, MEDICAL, (FIRE arrives)
  const place = [[53, slotY[0]], [53, slotY[1]], [53, slotY[2]], [343, slotY[0]], [343, slotY[1]], [343, slotY[2]]];
  uChips.forEach((c, i) => gsap.set(c, { left: place[i][0], top: place[i][1] }));
  gsap.set([uChips[2], uChips[5], uSame, uSwap], { opacity: 0 });
  fade([uChips[0], uChips[1], uChips[3], uChips[4]], [0.672, 0.684], 0, 1);
  fade(uSwap, [0.695, 0.703], 0, 1);
  tl.fromTo(uChips[2], { left: 343, top: slotY[1], opacity: 0 }, { left: 53, top: slotY[2], opacity: 1, duration: 0.04, ease: 'power2.inOut' }, 0.7);
  tl.fromTo(uChips[5], { left: 53, top: slotY[0], opacity: 0 }, { left: 343, top: slotY[2], opacity: 1, duration: 0.04, ease: 'power2.inOut' }, 0.7);
  tl.fromTo([uChips[1], uChips[3]], { scale: 1 }, { scale: 1.08, duration: 0.01, yoyo: true, repeat: 1 }, 0.708);
  fade(uSame, [0.742, 0.754], 0, 1);
  fade(e.union, [0.77, 0.782], 1, 0);

  // 6. battery-aware: awake only while there is news, then back to listening
  focus([0.77, 0.795], { z: 0.62, fx: 500, fy: 380 });
  nodeParts.forEach((p, i) => fade(p.act, [0.785 + HOPS_FROM_ORIGIN[i] * 0.012, 0.8 + HOPS_FROM_ORIGIN[i] * 0.012], 1, 0));
  focus([0.835, 0.855], { z: 1, fx: 500, fy: 570 });
  tl.fromTo(e.duty, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.014, ease: 'power2.out' }, 0.84);
  const blocks = qa('.pg-blk', e.duty), cursor = q('.pg-cursor', e.duty), legend = q('.pg-legend', e.duty);
  gsap.set(blocks, { opacity: 0 });
  gsap.set(legend, { opacity: 0 });
  fade(legend, [0.855, 0.868], 0, 1);
  const run = { x: 0 };
  tl.fromTo(run, { x: 0 }, { x: 476, duration: 0.1, onUpdate() { cursor.setAttribute('x1', run.x); cursor.setAttribute('x2', run.x); } }, 0.86);
  blocks.forEach((b, j) => tl.fromTo(b, { opacity: 0 }, { opacity: 1, duration: 0.004 }, 0.86 + ((100 + j * 22) / 476) * 0.1));

  tl.eventCallback('onUpdate', placeCam);
  ScrollTrigger.addEventListener('refresh', placeCam);
  pinScene(section, tl, { length: 9, hold: 0.03, captions: [[0, 0.78], [0.78, 1.03]], poster: 0.625, reduced });
}
