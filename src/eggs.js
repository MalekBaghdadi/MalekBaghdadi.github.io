// Things to find. None of them is announced where it is (the footer's small print keeps count, hunt.js, and the README
// lists them, folded away). Each costs next to nothing until it is found: a listener or two, and anything heavier (the
// coin rain's canvas, the ink) only when used. More live with what they play with: the signal ping, the clock and the
// rubber letters in hero.js and hero-play.js, the visitor in birds.js, Logbook's floor in logbook-streaks.js, the
// marquee and the stickers in sections.js.
//
//   the console     a hello for whoever opens the dev tools, with a hint, and `eggs()` for the list
//   leave the tab   its title loses the connection, and comes back online when you do
//   ↑↑↓↓←→←→ B A    coins rain, and Bug Run's runner turns gold
//   type "offline"  the page blinks out like a dropped signal... and keeps working, which is the point
//   type "coo"      a flock crosses the screen with the mail
//   the name        click its letters and they hop; hop all thirteen
//   the headings    their letters hop as a mouse brushes over them
//   the pigeons     poke one that is sitting on the mosque
//   the moon        click it: a shooting star, and the moon moves on a phase
//   the windows     click the city's windows to switch their lights on and off
//   NeatInk's page  write on it, or on the tablet, with a mouse or a pen; write enough and it is "converted"
import { found, table, onAllFound } from './hunt.js';
import { flyAcross } from './birds.js';
import { windows } from './scenes/pigeon-city.js';

const typing = (e) => e.target.closest?.('input, textarea, select, [contenteditable], .bugrun');

export function initEggs({ reduced }) {
  hello();
  tabTitle();
  cheatCode(reduced);
  typed(reduced);
  hopLetters(reduced);
  if (!reduced) brushHeadings();
  city(reduced);
  inkOnPaper();
  onAllFound(() => { if (!reduced) { flyAcross(14); coinRain(); } });
}

function hello() {
  console.log('%cHey, you opened the console 👋', 'font: 700 16px system-ui, sans-serif; color: #2b3bff');
  console.log('%cThis site is plain JavaScript, GSAP and a lot of scroll. A few things are hidden in it; an old cheat code is a good place to start. Type eggs() to see how you are doing.', 'font: 13px system-ui, sans-serif; color: #434b6b');
  window.eggs = () => {
    found('console', '🛠️ <b>Hello, developer.</b> The source is on GitHub, if you’d rather read than hunt.');
    console.table(table());
    return 'Found ones by name, the rest by a hint. Good luck.';
  };
}

function tabTitle() {
  const title = document.title;
  let back;
  document.addEventListener('visibilitychange', () => {
    clearTimeout(back);
    if (document.hidden) document.title = '📡 Connection lost… come back?';
    else {
      document.title = '✅ Back online';
      back = setTimeout(() => { document.title = title; }, 1800);
      found('tab', '✅ <b>Back online.</b> Nothing here stopped working while you were away.', 0, true);
    }
  });
}

function cheatCode(reduced) {
  const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
  let at = 0;
  addEventListener('keydown', (e) => {
    if (typing(e)) return;
    at = e.code === CODE[at] ? at + 1 : e.code === CODE[0] ? 1 : 0;
    if (at < CODE.length) return;
    at = 0;
    try { localStorage.setItem('bugrun-gold', '1'); } catch { /* the runner stays blue */ }
    found('konami', '<b>Cheat code accepted.</b> Bug Run’s runner is gold now.');
    if (!reduced) coinRain();
  });
}

// Pixel coins falling across the whole screen for a couple of seconds, on a canvas made for it and thrown away after.
function coinRain() {
  const c = document.createElement('canvas');
  c.className = 'egg-rain';
  c.setAttribute('aria-hidden', 'true');
  const dpr = Math.min(devicePixelRatio || 1, 2), w = innerWidth, h = innerHeight;
  c.width = w * dpr;
  c.height = h * dpr;
  document.body.append(c);
  const x = c.getContext('2d');
  x.scale(dpr, dpr);
  const coins = Array.from({ length: Math.round(Math.min(90, w / 14)) }, () => ({
    x: Math.random() * w, y: -20 - Math.random() * h * 0.8, vy: 120 + Math.random() * 160, s: 3 + Math.round(Math.random() * 2), t: Math.random() * 4,
  }));
  const ROWS = [3, 5, 7, 7, 7, 5, 3];
  const coin = (cx, cy, s, t) => { // seven rows of a coin, squeezed by its spin
    const k = [1, 0.6, 0.15, 0.6][Math.floor(t * 10) % 4];
    ROWS.forEach((rw, j) => {
      const ww = Math.max(1, Math.round(rw * k)) | 1;
      x.fillStyle = '#e09a00';
      x.fillRect(cx - (ww * s) / 2, cy + j * s, ww * s, s);
      if (ww > 2 && j && j < 6) { x.fillStyle = '#ffd23f'; x.fillRect(cx - ((ww - 2) * s) / 2, cy + j * s, (ww - 2) * s, s); }
    });
  };
  let last = performance.now();
  const start = last;
  (function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    x.clearRect(0, 0, w, h);
    let any = false;
    for (const k of coins) {
      k.vy += 300 * dt;
      k.y += k.vy * dt;
      k.t += dt;
      if (k.y < h + 30) { any = true; coin(k.x, k.y, k.s, k.t); }
    }
    if (any && now - start < 5000) requestAnimationFrame(frame);
    else c.remove();
  })(last);
}

// Words typed anywhere on the page (there is nowhere on it to type, so nobody types by accident).
function typed(reduced) {
  let buf = '';
  addEventListener('keydown', (e) => {
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
    buf = (buf + e.key.toLowerCase()).slice(-7);
    if (buf === 'offline') {
      buf = '';
      const html = document.documentElement;
      if (!reduced) {
        html.classList.remove('egg-offline');
        void html.offsetWidth;
        html.classList.add('egg-offline'); // the screen stutters out and back (style.css)
        setTimeout(() => html.classList.remove('egg-offline'), 1400);
      }
      setTimeout(() => found('offline', '📡 <b>No connection.</b> Everything here still works. That’s the whole idea.', 4200), reduced ? 0 : 900);
    } else if (buf.endsWith('coo')) {
      buf = '';
      if (!reduced) flyAcross(9);
      found('coo', '🕊️ <b>Coo.</b> Message carried. No towers were involved.');
    }
  });
}

// The big name: a letter hops when it is clicked. Hop all thirteen and the whole name does a wave.
function hopLetters(reduced) {
  const chars = [...document.querySelectorAll('.name .ch')];
  if (!chars.length) return;
  const hopped = new Set();
  const hop = (el) => { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); };
  chars.forEach((el, i) => el.addEventListener('click', () => {
    if (!reduced) hop(el);
    hopped.add(i);
    if (hopped.size < chars.length) return;
    hopped.clear();
    if (!reduced) chars.forEach((c, k) => setTimeout(() => { hop(c); c.classList.add('lit'); setTimeout(() => c.classList.remove('lit'), 900); }, k * 55));
    found('letters', 'All thirteen letters. <b>You’re thorough.</b> I like that in a teammate.');
  }));
}

// Every other big heading: its letters hop, one by one, as a mouse brushes over them.
function brushHeadings() {
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const ch = e.target.closest?.('.copy h2 .ch, .ledger > h2 .ch, .contact h2 .ch');
    if (!ch || ch.classList.contains('brush')) return;
    ch.classList.add('brush');
    ch.addEventListener('animationend', () => ch.classList.remove('brush'), { once: true });
  });
}

// Pigeon's city answers a click: a pigeon on the mosque is poked, the moon throws a shooting star, a window's light
// goes on or off. (Nothing in the demo itself is clickable, and the device in front lets clicks through.) The birds and
// the windows are small, so a click close to one counts.
function city(reduced) {
  const scene = document.getElementById('pigeon');
  if (!scene) return;
  const inside = (r, x, y) => x > r.left && x < r.right && y > r.top && y < r.bottom;
  document.addEventListener('click', (e) => {
    if (!scene.contains(e.target) || e.target.closest('a, button')) return;
    const dev = scene.querySelector('.pg-phone').getBoundingClientRect();
    if (poke(e, dev)) return;
    if (inside(dev, e.clientX, e.clientY) || e.target.closest('.copy > *')) return; // the phone, or the words, are in front
    if (!moon(e)) lamp(e);
  });

  // A pigeon sitting on the mosque, poked, hops and flaps and says something. (The flock is placed by the scroll; a
  // poke only borrows the bird for a moment, and lets go if the scroll moves it meanwhile.) One hidden behind the phone
  // (where the city sits in a frame, on narrow screens) can't be poked.
  const SAY = ['coo', 'coo coo', 'rrr-coo?', 'coo!'];
  let pokes = 0;
  function poke(e, dev) {
    let bird = null, near = 22 ** 2;
    for (const b of scene.querySelectorAll('.pc-bird[data-f="s"]')) {
      const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (!r.width || inside(dev, x, y)) continue;
      const d = b.contains(e.target) ? -1 : (x - e.clientX) ** 2 + (y - e.clientY) ** 2;
      if (d < near) { near = d; bird = b; }
    }
    if (!bird) return false;
    if (bird.classList.contains('poked')) return true;
    pokes++;
    const at = bird.style.transform;
    bird.classList.add('poked');
    const FLAP = ['u', 'm', 'd', 'm'];
    let k = 0;
    const flap = setInterval(() => {
      if (bird.style.transform !== at) { clearInterval(flap); bird.classList.remove('poked'); return; } // the scroll took it
      if (++k > 9) { clearInterval(flap); bird.dataset.f = 's'; bird.classList.remove('poked'); return; }
      bird.dataset.f = FLAP[k % 4];
    }, 70);
    // the bubble goes on the city's unscaled layer, so it reads at the same size on a phone, where the skyline is small
    const town = bird.closest('.pc-city'), r = bird.getBoundingClientRect(), cr = town.getBoundingClientRect();
    const bubble = Object.assign(document.createElement('i'), { className: 'pc-say', textContent: pokes % 5 === 0 ? '📨 delivered' : SAY[pokes % SAY.length] });
    bubble.style.left = `${(r.right - cr.left - 4).toFixed(0)}px`;
    bubble.style.top = `${(r.top - cr.top - 22).toFixed(0)}px`;
    town.append(bubble);
    setTimeout(() => bubble.remove(), 1500);
    found('poke', '🐦 <b>Poked.</b> They carry messages. They do not carry grudges, luckily.', 0, true);
    return true;
  }

  // The moon: each click sends a shooting star across the sky and moves the moon on a phase (crescent to full, round again).
  const PHASES = [[33, 17], [40, 10], [50, 0], [70, -20]]; // where the mask's shadow sits
  let phase = 0;
  function moon(e) {
    const el = scene.querySelector('.pc-moon'), r = el?.getBoundingClientRect();
    if (!r?.width || Math.hypot(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2) > Math.max(24, r.width * 0.75)) return false;
    phase = (phase + 1) % PHASES.length;
    const cut = el.querySelector('mask circle');
    cut.setAttribute('cx', PHASES[phase][0]);
    cut.setAttribute('cy', PHASES[phase][1]);
    if (!reduced) {
      const sky = el.parentElement, star = Object.assign(document.createElement('i'), { className: 'pc-shoot' });
      star.style.left = `${(22 + Math.random() * 50).toFixed(1)}%`;
      star.style.top = `${(4 + Math.random() * 22).toFixed(1)}%`;
      sky.append(star);
      star.addEventListener('animationend', () => star.remove(), { once: true });
    }
    found('moon', '🌠 <b>Make a wish.</b> Mine was a stable connection. I stopped waiting for it.');
    return true;
  }

  // The windows: the nearest one to a click (within a finger's width) switches on, or off again. The lights a visitor
  // put on are their own layer, so they stay on through the power cut: somebody found a candle.
  let mine, lit = new Map();
  function lamp(e) {
    const box = scene.querySelector('.pc-box'), r = box?.getBoundingClientRect();
    if (!r?.width) return;
    const k = r.width / 1600, x = (e.clientX - r.left) / k, y = (e.clientY - r.top) / k;
    let best = -1, near = Math.max(9, 15 / k) ** 2;
    windows.forEach(([wx, wy], i) => {
      const d = (wx + 3.5 - x) ** 2 + (wy + 5 - y) ** 2;
      if (d < near) { near = d; best = i; }
    });
    if (best < 0) return;
    if (!mine) {
      box.querySelector('.pc-phones').insertAdjacentHTML('afterend', '<svg class="pc-mine" width="1600" height="340" viewBox="0 0 1600 340" aria-hidden="true"></svg>');
      mine = box.querySelector('.pc-mine');
    }
    if (lit.has(best)) { lit.get(best).remove(); lit.delete(best); return; }
    const [wx, wy] = windows[best];
    const lampEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    for (const [a, v] of Object.entries({ x: wx.toFixed(1), y: wy.toFixed(1), width: 7, height: 10, fill: '#ffd98a' })) lampEl.setAttribute(a, v);
    mine.append(lampEl);
    lit.set(best, lampEl);
    if (lit.size === 5) found('lights', '💡 <b>Somebody’s home.</b> Five windows lit by hand. The grid had nothing to do with it.');
  }
}

// NeatInk's backdrop is paper: write on it (or on the tablet) with a mouse or a pen, and the ink fades away like the
// scene's own words. Write more than a scribble and stop, and the page does what the app does: a light runs along what
// was written and it comes out as type. (It can't read; it always "reads" something flattering, and says so.) Touch is
// left alone: a finger on the page is scrolling. The ink library is fetched when a mouse or pen first comes over the
// paper, and the canvas the ink is drawn on exists only while there is ink on it.
function inkOnPaper() {
  const back = document.querySelector('.ni-back');
  if (!back) return;
  const stage = back.parentElement; // the ink goes over the whole scene, the tablet included
  const LIFE = 2.4, ENOUGH = 520; // seconds the ink lasts once the pen is down for good; pixels of line worth converting
  const READS = [['Hire Malek', 'at least, that’s how I read it'], ['Works offline', 'everything looks like that to me'], ['Nice handwriting', 'the real app would actually read it'], ['Ship it', 'I may be projecting']];
  const strokes = [];
  let lib, getStroke, canvas, ctx, raf = 0, live = null, held = null, rested = 0, inked = 0, wait = 0, conv = null, reads = 0;
  const load = () => (lib ??= import('perfect-freehand').then((m) => { getStroke = m.getStroke; }));
  back.addEventListener('pointerover', (e) => { if (e.pointerType !== 'touch') load(); });

  function render() {
    raf = 0;
    const now = performance.now() / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#bbc3ff';
    // being converted: the light runs left to right over what was written, and the ink is gone behind it
    const p = conv ? Math.min(1, (now - conv.t0) / conv.dur) : 0, scan = conv ? conv.x0 - 24 + (conv.x1 - conv.x0 + 48) * p : 0;
    if (conv) conv.el.style.clipPath = `inset(-20% ${(100 - p * 100).toFixed(1)}% -20% 0)`;
    const age = live ? 0 : now - rested; // the ink fades together, once the pen has rested
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      if (s.conv ? p >= 1 : age > LIFE) { strokes.splice(i, 1); continue; }
      const outline = getStroke(s.pts, { size: s.pen ? 9 : 7, thinning: 0.55, smoothing: 0.5, streamline: 0.45, simulatePressure: !s.pen, last: !!s.done });
      if (outline.length < 3) continue;
      ctx.save();
      if (s.conv) { ctx.beginPath(); ctx.rect(scan, 0, canvas.width, canvas.height); ctx.clip(); }
      ctx.globalAlpha = s.conv ? 0.8 : 0.8 * (1 - Math.max(0, age - LIFE * 0.4) / (LIFE * 0.6));
      ctx.beginPath();
      ctx.moveTo(outline[0][0], outline[0][1]);
      for (const [px, py] of outline) ctx.lineTo(px, py);
      ctx.fill();
      ctx.restore();
    }
    if (conv && p < 1) { // the light itself
      const g = ctx.createLinearGradient(scan - 70, 0, scan + 6, 0);
      g.addColorStop(0, 'rgba(187, 195, 255, 0)');
      g.addColorStop(0.9, 'rgba(187, 195, 255, 0.34)');
      g.addColorStop(1, 'rgba(187, 195, 255, 0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(scan - 70, conv.y0 - 26, 76, conv.y1 - conv.y0 + 52);
    }
    if (conv && p >= 1) { inked = 0; conv = null; }
    if (strokes.length) raf = requestAnimationFrame(render);
    else { canvas.remove(); canvas.width = canvas.height = 0; } // no ink left: give the memory back
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(render); };
  const at = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, e.pressure || 0.5]; };

  function convert() {
    if (live || conv || !strokes.length || inked < ENOUGH || !canvas?.isConnected) return;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const s of strokes) {
      s.conv = true;
      for (const [x, y] of s.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
    const [big, small] = READS[reads++ % READS.length];
    const el = Object.assign(document.createElement('p'), { className: 'ni-read' });
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<b>${big}</b><span>${small}</span>`;
    const size = Math.max(26, Math.min(68, (y1 - y0) * 0.42, (x1 - x0) / (big.length * 0.5)));
    el.style.cssText = `left:${x0.toFixed(0)}px;top:${((y0 + y1) / 2).toFixed(0)}px;font-size:${size.toFixed(0)}px;clip-path:inset(-20% 100% -20% 0)`;
    stage.append(el);
    conv = { el, x0, x1, y0, y1, t0: performance.now() / 1000, dur: Math.max(0.6, Math.min(1.3, (x1 - x0) / 520)) };
    setTimeout(() => el.classList.add('out'), 3400);
    setTimeout(() => el.remove(), 4100);
    kick();
    found('convert', '<b>Converted.</b> The real app reads your handwriting. This page only flatters it.', 0, true);
  }

  back.addEventListener('pointerdown', async (e) => {
    if (e.pointerType === 'touch' || e.button > 0) return;
    e.preventDefault(); // no text selection while writing
    clearTimeout(wait);
    if (live) { live.done = performance.now() / 1000; live = null; } // a stroke whose end went missing
    held = e.pointerId;
    back.setPointerCapture?.(e.pointerId);
    await load();
    if (!canvas?.isConnected) {
      canvas ??= Object.assign(document.createElement('canvas'), { className: 'ni-scribble' });
      canvas.setAttribute('aria-hidden', 'true');
      stage.append(canvas);
      ctx = canvas.getContext('2d');
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      inked = 0;
    }
    live = { pts: [at(e)], pen: e.pointerType === 'pen', done: 0, id: e.pointerId };
    strokes.push(live);
    if (held !== e.pointerId) end(e); // let go while the library was still on its way: a dot
    kick();
  });
  back.addEventListener('pointermove', (e) => {
    if (!live || e.pointerId !== live.id) return;
    const pt = at(e), prev = live.pts[live.pts.length - 1];
    inked += Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
    live.pts.push(pt);
    kick();
  });
  function end(e) {
    if (held === e.pointerId) held = null;
    if (!live || e.pointerId !== live.id) return;
    live.done = rested = performance.now() / 1000;
    live = null;
    kick();
    clearTimeout(wait);
    wait = setTimeout(convert, 900); // the pen has rested: read what is there, if there is enough of it
    found('ink', '🖋️ <b>Ink.</b> It fades, like the scene’s own. Write a word or two and let it rest.', 0, true);
  }
  back.addEventListener('pointerup', end);
  back.addEventListener('pointercancel', end);
  back.addEventListener('lostpointercapture', end);
}
