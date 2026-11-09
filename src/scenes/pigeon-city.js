// Pigeon's city: a night skyline behind the demo that lives through the incident the phone reports.
// A fire breaks out on the second floor of the old market while the report is typed; the broadcast pings out of it;
// as the event spreads through the mesh an ambulance and a fire truck arrive, sirens going; the truck raises its
// ladder and puts the fire out while two phones merge their events; the sirens stop and the ambulance leaves as the
// radios go back to listening. All of it rides the scene's timeline (scroll); small ambient loops (flames, smoke,
// sirens, stars, aviation lights) keep the street alive when the scroll stops.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { rng } from '../ambient.js';

const W = 1600; // the city's design box, 1600 x 340; the kerb is at y = 300 and the street runs below it
const H = 340;
const KERB = 300;
const SOUK = { x: 146, w: 188 }; // the old market, where the fire is
const FIRE = { x: 240, y: 212 }; // the fire's base, on the market's second floor

const lit = [[], [], []]; // lit windows by district (filled by skyline())
export const windows = []; // every window's top-left corner (7 x 10, in the city's box); eggs.js lets a visitor switch them on

function skyline() {
  const r = rng(7);
  lit.forEach((d) => (d.length = 0));
  windows.length = 0;
  // far: one silhouette of towers
  let far = `M0 ${KERB}`;
  for (let x = 0; x < W;) {
    const w = 34 + r() * 66, h = 110 + r() * 150;
    far += `V${(KERB - h).toFixed(0)}H${Math.min(W, x + w).toFixed(0)}`;
    x += w;
  }
  far += `V${KERB}Z`;

  // near: blocks with windows, a few lit; water tanks and antennas on the roofs. Landmarks are drawn by hand.
  const skip = [[138, 342], [556, 706], [1172, 1250]];
  const near = [];
  for (let x = -8; x < W + 8;) {
    const hit = skip.find(([a, b]) => x + 40 > a && x < b);
    if (hit) { x = hit[1] + 4 + r() * 10; continue; }
    const next = skip.find(([a]) => a > x);
    const w = Math.min(52 + r() * 62, next ? next[0] - 4 - x : Infinity);
    if (w > 30) near.push({ x, w, h: 64 + r() * 120, roof: r() });
    x += w + 3 + r() * 8;
  }
  // Every window is drawn dark here; the lit ones are drawn again on a layer of their own, one group per district,
  // so the power can go out (and come back) across the city. All window positions are kept for the phones that light up.
  const district = (x) => (x < 560 ? 0 : x < 1100 ? 1 : 2);
  const win = (x, y, on) => {
    windows.push([x, y]);
    if (on) lit[district(x)].push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="7" height="10" fill="#df9c20" fill-opacity="${(0.22 + r() * 0.45).toFixed(2)}"/>`);
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="7" height="10" fill="#2e2920"/>`;
  };
  const blocks = near.map(({ x, w, h, roof }) => {
    const y = KERB - h;
    let s = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#24201a"/>`;
    const rx = x + w * 0.55;
    if (roof < 0.3) s += `<rect x="${rx.toFixed(1)}" y="${(y - 15).toFixed(1)}" width="15" height="10" rx="2" fill="#24201a"/><path d="M${(rx + 2).toFixed(1)} ${(y - 5).toFixed(1)}V${y.toFixed(1)}M${(rx + 13).toFixed(1)} ${(y - 5).toFixed(1)}V${y.toFixed(1)}" stroke="#24201a" stroke-width="2"/>`;
    else if (roof < 0.5) s += `<path d="M${(x + w * 0.3).toFixed(1)} ${y.toFixed(1)}V${(y - 26).toFixed(1)}M${(x + w * 0.3 - 6).toFixed(1)} ${(y - 18).toFixed(1)}H${(x + w * 0.3 + 6).toFixed(1)}" stroke="#2c271f" stroke-width="2"/>`;
    else if (roof < 0.66) s += `<rect x="${(x + 6).toFixed(1)}" y="${(y - 8).toFixed(1)}" width="${(w - 12).toFixed(1)}" height="8" fill="#24201a"/>`;
    const cols = Math.floor((w - 10) / 15), rows = Math.floor((h - 14) / 19);
    const ox = x + (w - cols * 15 + 8) / 2;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) s += win(ox + i * 15, y + 10 + j * 19, r() < 0.26);
    return s;
  }).join('');

  const tower = (() => {
    let s = '<rect x="1180" y="58" width="60" height="242" fill="#25211a"/><rect x="1192" y="50" width="36" height="8" fill="#25211a"/><path d="M1210 50V18" stroke="#2c271f" stroke-width="2"/>';
    for (let j = 0; j < 12; j++) for (let i = 0; i < 3; i++) s += win(1190 + i * 16, 70 + j * 18, r() < 0.3);
    return s;
  })();

  const souk = (() => {
    let s = `<rect x="${SOUK.x}" y="226" width="${SOUK.w}" height="${KERB - 226}" fill="#2b261e"/><rect x="142" y="222" width="196" height="6" fill="#353024"/>`;
    s += '<rect x="166" y="180" width="148" height="46" fill="#2b261e"/><rect x="162" y="176" width="156" height="6" fill="#353024"/>';
    for (let i = 0; i < 5; i++) s += `<rect x="${178 + i * 27}" y="194" width="14" height="18" fill="#17140f"/>`;
    for (let i = 0; i < 6; i++) {
      const x = 154 + i * 30;
      s += `<path d="M${x} ${KERB}V262A11 11 0 0 1 ${x + 22} 262V${KERB}Z" fill="${i === 1 || i === 4 ? '#df9c20' : '#17140f'}"${i === 1 || i === 4 ? ' fill-opacity="0.24"' : ''}/>`;
    }
    return s;
  })();

  const mosque = `<g fill="#1f1b15">
    <rect x="586" y="232" width="88" height="68"/><path d="M586 232C586 170 674 170 674 232Z"/><rect x="629" y="164" width="2" height="16"/><circle cx="630" cy="162" r="3"/>
    <rect x="566" y="120" width="10" height="180"/><path d="M564 120L571 94L578 120Z"/><rect x="562" y="150" width="18" height="5"/><rect x="562" y="196" width="18" height="4"/>
    <rect x="684" y="120" width="10" height="180"/><path d="M682 120L689 94L696 120Z"/><rect x="680" y="150" width="18" height="5"/><rect x="680" y="196" width="18" height="4"/></g>
    <g fill="#2e2920"><path d="M604 270V258A6 6 0 0 1 616 258V270Z"/><path d="M644 270V258A6 6 0 0 1 656 258V270Z"/></g>`;
  lit[1].push('<g fill="#df9c20" fill-opacity="0.2"><path d="M604 270V258A6 6 0 0 1 616 258V270Z"/><path d="M644 270V258A6 6 0 0 1 656 258V270Z"/></g>');

  // a tower crane over the building site on the right
  const zig = (x0, x1, y0, y1, step, vertical) => {
    let d = '';
    for (let t = 0, k = 0; vertical ? y0 + t < y1 : x0 + t < x1; t += step, k++) {
      d += vertical ? `M${k % 2 ? x1 : x0} ${y0 + t}L${k % 2 ? x0 : x1} ${y0 + t + step}` : `M${x0 + t} ${k % 2 ? y1 : y0}L${x0 + t + step} ${k % 2 ? y0 : y1}`;
    }
    return d;
  };
  const crane = `<g stroke="#2f2a21" stroke-width="2" fill="none">
    <path d="M1452 70V${KERB}M1464 70V${KERB}${zig(1452, 1464, 74, KERB, 14, true)}"/>
    <path d="M1378 66H1588M1378 74H1588${zig(1378, 1588, 66, 74, 12, false)}"/>
    <path d="M1458 50L1452 66M1458 50L1464 66M1458 50L1588 66M1458 50L1378 66M1548 74V150"/>
    <path d="M1543 150h10v6a5 5 0 0 1 -10 0" stroke-width="2.5"/></g>
    <rect x="1380" y="74" width="26" height="14" fill="#2f2a21"/>`;

  const street = `<rect x="0" y="${KERB}" width="${W}" height="${H - KERB}" fill="#1b1813"/><rect x="0" y="${KERB}" width="${W}" height="2" fill="#332d24"/>
    <path d="M0 318H${W}" stroke="#3a3428" stroke-width="2" stroke-dasharray="20 18"/>`;

  // Phones lighting up in dark rooms as the alert reaches them: a cold glow in a window, picked from all over the city.
  const pr = rng(31);
  const phones = windows.filter(() => pr() < 0.095).map(([x, y]) => `<g class="pc-ph" data-x="${x.toFixed(0)}"><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="7" height="10" fill="#9db8f5" fill-opacity="0.3"/><rect x="${(x + 2).toFixed(1)}" y="${(y + 4).toFixed(1)}" width="3" height="4.5" fill="#eef3ff"/></g>`).join('');

  const svg = (cls, body) => `<svg class="${cls}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${body}</svg>`;
  return svg('pc-sky-line', `<path d="${far}" fill="#1c1914"/>${mosque}${crane}${blocks}${tower}${souk}${street}`)
    + svg('pc-lights', lit.map((d, i) => `<g class="pc-d${i}">${d.join('')}</g>`).join(''))
    + svg('pc-phones', phones);
}

// A pigeon, side on, facing right, its feet at (0, 0): wings up, level, down, and folded for sitting.
// (Exported: birds.js flies the same bird over the rest of the page.)
export const bird = `<svg class="pc-bird" width="24" height="21" viewBox="-12 -16 24 21" overflow="visible" aria-hidden="true">
  <path d="M-5-5.2L-11.5-6.6-10.8-3.4Z" fill="#77736a"/><path class="w wu" d="M1-6C-1-12-4-15.2-7.4-15.6-4.4-11.2-3.2-8-2-5.4Z" fill="#7f7a70"/>
  <path class="w wm" d="M1.5-5.6C-3-6.8-8-6.8-11.6-5.2-7.6-4.1-3-3.9 0-4.2Z" fill="#7f7a70"/>
  <path class="w wd" d="M1-5C-1-1-3 3-6.4 4.6-4.6 1-3.6-2-2.6-4.6Z" fill="#7f7a70"/>
  <path class="s" d="M-.6-1.9V0M1.6-1.9V0" stroke="#c47a6a" stroke-width=".9"/>
  <ellipse cx="0" cy="-5" rx="6.6" ry="3.4" fill="#a19c91"/><path class="w ws" d="M3.2-6.6C0-7.2-5.2-6.6-8.4-4.4-4.2-3.3 0-3.5 3-4.3Z" fill="#7f7a70"/>
  <circle cx="5" cy="-6.6" r="1.8" fill="#6f8a7e"/><circle cx="6.3" cy="-8.1" r="2.4" fill="#8c9592"/>
  <path d="M8.5-8.3 10.8-7.7 8.5-7.2Z" fill="#d9c9a0"/><circle cx="7" cy="-8.7" r=".55" fill="#f0b04a"/></svg>`;
// [perch x, perch y] on the mosque's roof and a minaret's balcony; the first two come back at the end
const PERCH = [[600, 232], [622, 232], [646, 232], [664, 232], [573, 150], [687, 150]];

// One flame: a red-orange tongue around an orange one around a pale core, in a 40 x 100 box.
const flame = `<svg viewBox="0 0 40 100" preserveAspectRatio="none" aria-hidden="true">
  <path d="M20 100C6 100 0 86 2 72C4 60 12 54 12 40C12 32 10 26 8 20C16 26 20 34 21 42C24 30 24 16 20 0C32 12 40 30 38 50C37 62 40 70 38 80C36 92 30 100 20 100Z" fill="#e8613f"/>
  <path d="M20 100C10 100 6 90 8 80C10 70 16 64 16 54C20 60 22 66 22 72C26 64 26 54 24 44C32 54 34 66 32 78C31 90 28 100 20 100Z" fill="#df9c20"/>
  <path d="M20 100C14 100 12 94 13 88C14 82 18 78 18 72C22 78 24 84 24 88C25 94 24 100 20 100Z" fill="#ffe08a"/></svg>`;
const FLAMES = [[50, 50, 140], [18, 40, 100], [90, 44, 112], [2, 28, 64], [120, 28, 70]]; // left, width, height in the fire box

const wheel = (x, y, r) => `<g transform="translate(${x} ${y})"><g class="wh"><circle r="${r}" fill="#14120f"/><circle r="${r / 2}" fill="#6d665b"/><path d="M0 ${-r / 2}V${r / 2}M${-r / 2} 0H${r / 2}" stroke="#14120f" stroke-width="1.6"/></g></g>`;
const lights = (x, y) => `<g class="pc-bar-off" fill="#3a3530"><rect x="${x}" y="${y}" width="9" height="4" rx="1"/><rect x="${x + 10}" y="${y}" width="9" height="4" rx="1"/></g>
  <g class="pc-bar"><rect x="${x}" y="${y}" width="9" height="4" rx="1" fill="#ff4d4d"/><rect x="${x + 10}" y="${y}" width="9" height="4" rx="1" fill="#6f9cff"/></g>`;

// Headlight beams: a pale cone ahead of the vehicle (to the left), fading out along the street.
const beam = (id, d) => `<defs><linearGradient id="${id}" x1="1" x2="0" y1="0" y2="0"><stop offset="0" stop-color="#ffe6a8" stop-opacity="0.42"/><stop offset="1" stop-color="#ffe6a8" stop-opacity="0"/></linearGradient></defs><path d="${d}" fill="url(#${id})"/>`;
// Side views, facing left (towards the fire).
const ambulance = `<svg viewBox="0 0 124 56" width="99" height="44.7" aria-hidden="true">
  ${beam('pc-beam-a', 'M5 31L-84 19V52L5 36Z')}
  <path d="M6 46V28Q6 21 12 19L34 15V46Z" fill="#efe9dd"/><path d="M10 29L13 23L30 20V30Z" fill="#2b3540"/>
  <rect x="34" y="8" width="86" height="38" rx="4" fill="#efe9dd"/><rect x="40" y="14" width="18" height="12" rx="2" fill="#2b3540"/>
  <rect x="6" y="34" width="114" height="5" fill="#e57373"/><g fill="#e57373"><rect x="79" y="13" width="6" height="16"/><rect x="74" y="18" width="16" height="6"/></g>
  <rect x="3" y="40" width="6" height="5" fill="#3a3530"/><rect x="4" y="31" width="4" height="4" fill="#ffd27a"/>
  ${lights(36, 4)}${wheel(24, 46, 8)}${wheel(100, 46, 8)}</svg>`;
let rungs = '';
for (let x = 52; x < 160; x += 9) rungs += `M${x} 12V17`;
const truck = `<svg viewBox="0 0 170 60" width="143" height="50.5" overflow="visible" aria-hidden="true">
  ${beam('pc-beam-t', 'M6 35L-96 22V57L6 40Z')}
  <path d="M6 50V30Q6 22 13 20L40 16V50Z" fill="#cf4f3f"/><path d="M11 31L14 24L35 21V32Z" fill="#2b3540"/>
  <rect x="40" y="20" width="126" height="30" rx="3" fill="#cf4f3f"/>
  <g fill="#a83d31"><rect x="48" y="26" width="30" height="13" rx="2"/><rect x="82" y="26" width="30" height="13" rx="2"/><rect x="116" y="26" width="42" height="13" rx="2"/></g>
  <rect x="6" y="42" width="160" height="3" fill="#efe3c8"/><rect x="3" y="44" width="6" height="5" fill="#3a3530"/><rect x="5" y="35" width="4" height="4" fill="#ffd27a"/>
  <rect x="150" y="15" width="10" height="6" fill="#d9cfbe"/>
  <g class="pc-ladder"><g stroke="#d9cfbe" stroke-width="2"><path d="M46 12H164M46 17H164"/><path d="${rungs}" stroke-width="1.5"/></g></g>
  ${lights(16, 13)}${wheel(28, 50, 9)}${wheel(118, 50, 9)}${wheel(146, 50, 9)}</svg>`;

function sky() {
  const r = rng(23);
  let stars = '';
  for (let i = 0; i < 11; i++) {
    const x = 2 + r() * 96, y = 3 + r() * 40;
    if (x < 16 && y < 22) { i--; continue; } // clear of the moon
    const s = (1.8 + r() * 1.8).toFixed(1);
    stars += `<i class="pc-star amb" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${s}px;height:${s}px;animation-duration:${(2.6 + r() * 3.2).toFixed(1)}s;animation-delay:-${(r() * 5).toFixed(1)}s"></i>`;
  }
  return `<div class="pc-sky"><svg class="pc-moon" viewBox="0 0 48 48" aria-hidden="true"><defs><mask id="pc-moon-cut"><rect width="48" height="48" fill="#fff"/><circle cx="33" cy="17" r="18" fill="#000"/></mask></defs><circle cx="24" cy="24" r="19" fill="#e9dfc8" mask="url(#pc-moon-cut)"/></svg>${stars}</div>`;
}

export function buildCity() {
  const puffs = (cls, n) => Array.from({ length: n }, (_, i) => `<i class="${cls} amb" style="animation-delay:-${(i * (cls === 'pc-puff' ? 1.05 : 0.6)).toFixed(2)}s"></i>`).join('');
  const embers = Array.from({ length: 5 }, (_, i) => `<i class="pc-ember amb" style="left:${30 + ((i * 37) % 90)}px;animation-delay:-${(i * 0.37).toFixed(2)}s;animation-duration:${(1.5 + (i % 3) * 0.45).toFixed(2)}s"></i>`).join('');
  return `<div class="pc-city backdrop" aria-hidden="true">${sky()}
  <div class="pc-box">
    ${skyline()}
    <i class="pc-avl amb" style="left:1210px;top:18px"></i><i class="pc-avl amb" style="left:1458px;top:50px;animation-delay:-0.6s"></i><i class="pc-avl amb" style="left:1588px;top:66px;animation-delay:-1.1s"></i>
    <i class="pc-glow amb"></i>
    <svg class="pc-burn" viewBox="166 180 148 46" width="148" height="46"><g fill="#ffb052">${Array.from({ length: 5 }, (_, i) => `<rect x="${178 + i * 27}" y="194" width="14" height="18"/>`).join('')}</g></svg>
    <i class="pc-wet"></i><i class="pc-refl"><b class="amb"></b></i>
    <div class="pc-smoke">${puffs('pc-puff', 7)}</div>
    <div class="pc-fire">${FLAMES.map(([l, w, h], i) => `<div class="pc-flame amb" style="left:${l}px;width:${w}px;height:${h}px;animation-duration:${[0.42, 0.55, 0.48, 0.36, 0.4][i]}s">${flame}</div>`).join('')}${embers}</div>
    <div class="pc-steam">${puffs('pc-steamp', 5)}</div>
    <i class="pc-ping"></i><i class="pc-ping"></i><i class="pc-ping"></i>
    ${PERCH.map(() => bird).join('')}
    <div class="pc-veh pc-amb"><i class="pc-siren"><b class="amb"></b><b class="amb"></b></i><i class="pc-siren pc-siren-r"><b class="amb"></b><b class="amb"></b></i>${ambulance}</div>
    <div class="pc-veh pc-truck"><i class="pc-siren"><b class="amb"></b><b class="amb"></b></i><i class="pc-siren pc-siren-r"><b class="amb"></b><b class="amb"></b></i>${truck}</div>
    <svg class="pc-spray" viewBox="230 100 190 170" width="190" height="170"><path class="amb" d="M405 250Q338 104 252 186" fill="none" stroke="#a9cdf2" stroke-width="4.2" stroke-linecap="round" stroke-dasharray="8 9"/><path class="amb" d="M404 251Q346 122 262 192" fill="none" stroke="#d6e8fa" stroke-opacity="0.6" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 11"/></svg>
  </div></div>`;
}

/**
 * The pigeons: perched on the mosque until the broadcast pings out of the market, then off across the city as the alert
 * spreads (the app's namesake, carrying the message), each one flapping as it goes. Two come back and settle on the
 * roof at the end. Everything is a function of the timeline's time `t` (0..1), so it plays backwards too.
 */
function flock(els) {
  const ease = (s) => 1 - (1 - s) ** 2;
  const FLAP = ['u', 'm', 'd', 'm'];
  const birds = els.map((el, i) => ({
    el, i, perch: PERCH[i], size: [1, 0.86, 0.94, 0.8, 0.9, 0.84][i], face: i % 3 ? -1 : 1,
    t0: 0.392 + i * 0.007, t1: 0.392 + i * 0.007 + 0.2 + (i % 3) * 0.025, // take off, gone over the edge
    r0: i < 2 ? 0.905 + i * 0.016 : 2, // the first two come back
    last: '',
  }));
  function place(b, x, y, face, frame) {
    const key = `${x.toFixed(1)},${y.toFixed(1)},${face},${frame}`;
    if (key === b.last) return;
    b.last = key;
    b.el.style.display = frame ? 'block' : 'none';
    if (!frame) return;
    b.el.style.transform = `translate(${(x - 12).toFixed(1)}px, ${(y - 16).toFixed(1)}px) scale(${(face * b.size).toFixed(2)}, ${b.size})`;
    b.el.dataset.f = frame;
  }
  return (t) => {
    for (const b of birds) {
      const [px, py] = b.perch;
      if (t < b.t0) { place(b, px, py, b.face, 's'); continue; }
      if (t <= b.t1) { // up and away to the right, climbing, with a little rise and fall in each wingbeat
        const s = (t - b.t0) / (b.t1 - b.t0);
        const x = px + (1820 - px) * s ** 1.3;
        const y = py - (290 + b.i * 28) * ease(s) + 9 * Math.sin(s * 30 + b.i);
        place(b, x, y, 1, FLAP[Math.floor(s * 56 + b.i * 1.3) % 4]);
        continue;
      }
      const r1 = b.r0 + 0.065;
      if (t < b.r0) { place(b, 0, 0, 1, ''); continue; }
      if (t < r1) { // back in from the right, gliding down onto the roof, wings out for the landing
        const s = (t - b.r0) / (r1 - b.r0), e = ease(s);
        const sx = 1500 + b.i * 120, sy = -240 - b.i * 50;
        const x = sx + (px - sx) * e, y = sy + (py - sy) * (1 - (1 - s) ** 2.4) - 26 * Math.sin(Math.PI * s);
        place(b, x, y, -1, s > 0.9 ? 'u' : FLAP[Math.floor(s * 40 + b.i) % 4]);
        continue;
      }
      place(b, px, py, -1, 's');
    }
  };
}

/**
 * Lays the city out in `el`'s current container (the stage on wide screens, the device frame on phones) and adds its
 * story to the scene timeline `tl` (positions are the Pigeon timeline's, 0..1).
 */
export function initCity(el, tl) {
  const q = (s) => el.querySelector(s);
  const qa = (s) => [...el.querySelectorAll(s)];
  const box = q('.pc-box');
  const fire = q('.pc-fire'), glow = q('.pc-glow'), burn = q('.pc-burn'), smoke = q('.pc-smoke'), steam = q('.pc-steam'), pings = qa('.pc-ping');
  const amb = q('.pc-amb'), truckEl = q('.pc-truck'), spray = q('.pc-spray'), ladder = q('.pc-ladder');
  const ambWheels = qa('.pc-amb .wh'), truckWheels = qa('.pc-truck .wh');
  const sirens = qa('.pc-bar, .pc-siren');
  const districts = qa('.pc-lights g'), phones = qa('.pc-ph'), wet = q('.pc-wet'), refl = q('.pc-refl');

  // On wide screens the whole skyline spans the stage; on phones a window onto it, with the market at the left edge.
  let narrow = false;
  function layout() {
    const cw = el.clientWidth, ch = el.clientHeight;
    if (!cw) return;
    const view = narrow ? 740 : W, x0 = narrow ? 128 : 0;
    const lift = narrow ? 0 : 44; // on the stage, the street runs just above the scene's progress line
    const k = cw / view;
    box.style.transform = `translate(${(-x0 * k).toFixed(1)}px, ${(ch - H * k - lift).toFixed(1)}px) scale(${k.toFixed(4)})`;
  }
  new ResizeObserver(layout).observe(el);

  // where each piece starts: fire out, vehicles off to the right, ladder down
  gsap.set([fire, glow, burn, smoke, steam, spray, ...pings, ...phones, wet, refl], { opacity: 0 });
  gsap.set(fire, { scale: 0.12, transformOrigin: '50% 100%' });
  gsap.set(amb, { x: 1660 });
  gsap.set(truckEl, { x: 1700 });

  const AMB_PARK = 520, TRUCK_PARK = 352, AMB_R = 6.4, TRUCK_R = 7.57; // wheel radii in city units
  const AMB_IN = 1660 - AMB_PARK, TRUCK_IN = 1700 - TRUCK_PARK, AMB_OUT = AMB_PARK + 160;
  const turn = (dist, r) => -(dist / r) * (180 / Math.PI); // wheels roll with the distance driven (r in city units)

  // 1. while the report is typed, a fire takes hold of the market's second floor
  tl.fromTo(fire, { opacity: 0, scale: 0.12 }, { opacity: 1, scale: 0.38, duration: 0.05, ease: 'power1.out' }, 0.05);
  tl.fromTo(fire, { scale: 0.38 }, { scale: 1, duration: 0.25, ease: 'power1.in' }, 0.1);
  tl.fromTo([glow, burn, refl], { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.06);
  tl.fromTo(smoke, { opacity: 0 }, { opacity: 1, duration: 0.18 }, 0.09);
  // ...and takes the power with it: the city's lights stutter and go out, district by district away from the market.
  // Only the fire, the moon and (soon) the phones are left. This is what the app is for.
  const cut = [1, 0.25, 0.85, 0.1, 0.6, 0];
  districts.forEach((g, d) => cut.slice(1).forEach((o, k) => tl.fromTo(g, { opacity: cut[k] }, { opacity: o, duration: 0.004 }, 0.115 + d * 0.014 + k * 0.006)));
  // 2. the broadcast pings out of it, three rings
  pings.forEach((p, i) => tl.fromTo(p, { scale: 0.3, opacity: 0.9 }, { scale: 6 + i * 1.5, opacity: 0, duration: 0.05, ease: 'power2.out' }, 0.385 + i * 0.011));
  // as the alert spreads through the mesh, phones light up in dark rooms, nearest the market first; once the radios go
  // back to listening the screens time out
  const jr = rng(41);
  phones.forEach((p) => {
    const far = Math.min(1, Math.abs(+p.dataset.x - FIRE.x) / 1300), j = jr() * 0.02;
    tl.fromTo(p, { opacity: 0 }, { opacity: 1, duration: 0.005 }, 0.405 + far * 0.2 + j);
    tl.fromTo(p, { opacity: 1 }, { opacity: 0, duration: 0.01 }, 0.79 + far * 0.05 + j);
  });
  // 3. as the event spreads, the ambulance and the fire truck arrive, sirens going
  tl.fromTo(amb, { x: 1660 }, { x: AMB_PARK, duration: 0.12, ease: 'power2.out' }, 0.49);
  tl.fromTo(ambWheels, { rotation: 0 }, { rotation: turn(AMB_IN, AMB_R), duration: 0.12, ease: 'power2.out', transformOrigin: '50% 50%' }, 0.49);
  tl.fromTo(truckEl, { x: 1700 }, { x: TRUCK_PARK, duration: 0.12, ease: 'power2.out' }, 0.53);
  tl.fromTo(truckWheels, { rotation: 0 }, { rotation: turn(TRUCK_IN, TRUCK_R), duration: 0.12, ease: 'power2.out', transformOrigin: '50% 50%' }, 0.53);
  // 4. ladder up, water on, the fire dies down into steam while the two phones merge
  tl.fromTo(ladder, { rotation: 0 }, { rotation: 30, duration: 0.025, ease: 'power1.inOut', svgOrigin: '158 15' }, 0.635);
  tl.fromTo(spray, { opacity: 0 }, { opacity: 1, duration: 0.01 }, 0.662);
  tl.fromTo(fire, { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.08, duration: 0.13, ease: 'power1.in' }, 0.67);
  tl.fromTo([glow, burn, refl], { opacity: 1 }, { opacity: 0, duration: 0.12 }, 0.68);
  tl.fromTo(wet, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.672); // the water runs down the street: wet, and it stays wet
  tl.fromTo(steam, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.68);
  tl.fromTo(smoke, { opacity: 1 }, { opacity: 0, duration: 0.12 }, 0.7);
  tl.fromTo(spray, { opacity: 1 }, { opacity: 0, duration: 0.012 }, 0.8);
  tl.fromTo(steam, { opacity: 1 }, { opacity: 0, duration: 0.08 }, 0.82);
  tl.fromTo(ladder, { rotation: 30 }, { rotation: 0, duration: 0.025, ease: 'power1.inOut', svgOrigin: '158 15' }, 0.82);
  // 5. the radios go back to listening: sirens off, the ambulance leaves
  tl.fromTo(sirens, { opacity: 1 }, { opacity: 0, duration: 0.02 }, 0.845);
  tl.fromTo(amb, { x: AMB_PARK }, { x: -160, duration: 0.11, ease: 'power2.in' }, 0.86);
  tl.fromTo(ambWheels, { rotation: turn(AMB_IN, AMB_R) }, { rotation: turn(AMB_IN + AMB_OUT, AMB_R), duration: 0.11, ease: 'power2.in', transformOrigin: '50% 50%' }, 0.86);
  // 6. and the power comes back, district by district
  const back = [0, 0.7, 0.2, 1];
  districts.forEach((g, d) => back.slice(1).forEach((o, k) => tl.fromTo(g, { opacity: back[k] }, { opacity: o, duration: 0.004 }, 0.885 + d * 0.022 + k * 0.006)));

  // Each loop runs only while its part of the story is on screen (style gates on these flags): flames while it burns,
  // smoke and steam while they rise, sirens while the vehicles are there with lights on, water while the truck sprays.
  const PHASES = { fire: [0.05, 0.8], smoke: [0.09, 0.82], steam: [0.68, 0.9], sirens: [0.49, 0.865], spray: [0.66, 0.812] };
  const clock = { t: 0 };
  const fly = flock(qa('.pc-bird'));
  const flag = () => {
    for (const [k, [a, b]] of Object.entries(PHASES)) el.toggleAttribute(`data-${k}`, clock.t >= a && clock.t < b);
    fly(clock.t);
  };
  tl.fromTo(clock, { t: 0 }, { t: 1, duration: 1, onUpdate: flag }, 0);
  ScrollTrigger.addEventListener('refresh', flag); // a refresh renders the timeline with events muted
  flag();

  return {
    /** Call after the city moves between the stage and the frame. */
    relayout(isNarrow) { narrow = isNarrow; layout(); },
  };
}
