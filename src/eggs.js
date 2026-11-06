// Things to find. None of them is announced on the page (the README lists them, folded away). Each costs next to
// nothing until it is found: a listener or two, and anything heavier (the coin rain's canvas, the ink) only when used.
//
//   the console     a hello for whoever opens the dev tools, with a hint
//   leave the tab   its title loses the connection, and comes back online when you do
//   ↑↑↓↓←→←→ B A    coins rain, and Bug Run's runner turns gold
//   type "offline"  the page blinks out like a dropped signal... and keeps working, which is the point
//   the name        click its letters and they hop; hop all thirteen
//   the pigeons     poke one that is sitting on the mosque
//   NeatInk's page  write on it, or on the tablet, with a mouse or a pen
const typing = (e) => e.target.closest?.('input, textarea, select, [contenteditable], .bugrun');

// a small note at the top of the screen, shared by the eggs
let toastEl, toastTimer;
function toast(html, ms = 3200) {
  toastEl ??= Object.assign(document.createElement('div'), { className: 'egg-toast', role: 'status' });
  if (!toastEl.isConnected) document.body.append(toastEl);
  toastEl.innerHTML = html;
  toastEl.classList.remove('on');
  void toastEl.offsetWidth; // restart the entrance
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
}

export function initEggs({ reduced }) {
  hello();
  tabTitle();
  cheatCode(reduced);
  offline(reduced);
  hopLetters(reduced);
  pokePigeons();
  inkOnPaper();
}

function hello() {
  console.log('%cHey, you opened the console 👋', 'font: 700 16px system-ui, sans-serif; color: #2b3bff');
  console.log('%cThis site is plain JavaScript, GSAP and a lot of scroll. A few things are hidden in it; an old cheat code is a good place to start.', 'font: 13px system-ui, sans-serif; color: #434b6b');
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
    toast('<b>Cheat code accepted.</b> Bug Run’s runner is gold now.');
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

function offline(reduced) {
  let typed = '';
  addEventListener('keydown', (e) => {
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
    typed = (typed + e.key.toLowerCase()).slice(-7);
    if (typed !== 'offline') return;
    typed = '';
    const html = document.documentElement;
    if (!reduced) {
      html.classList.remove('egg-offline');
      void html.offsetWidth;
      html.classList.add('egg-offline'); // the screen stutters out and back (style.css)
      setTimeout(() => html.classList.remove('egg-offline'), 1400);
    }
    setTimeout(() => toast('📡 <b>No connection.</b> Everything here still works. That’s the whole idea.', 4200), reduced ? 0 : 900);
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
    toast('All thirteen letters. <b>You’re thorough.</b> I like that in a teammate.');
  }));
}

// A pigeon sitting on the mosque, poked, hops and flaps and says something. (The flock is placed by the scroll; a poke
// only borrows the bird for a moment, and lets go if the scroll moves it meanwhile.) The birds are small, so a click
// close to one counts too; one hidden behind the phone (where the city sits in a frame, on narrow screens) can't be poked.
function pokePigeons() {
  const SAY = ['coo', 'coo coo', 'rrr-coo?', 'coo!'];
  let pokes = 0;
  document.addEventListener('click', (e) => {
    const scene = e.target.closest?.('#pigeon');
    if (!scene || e.target.closest('a, button')) return;
    const dev = scene.querySelector('.pg-phone').getBoundingClientRect();
    let bird = null, near = 22 ** 2;
    for (const b of scene.querySelectorAll('.pc-bird[data-f="s"]')) {
      const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (!r.width || (x > dev.left && x < dev.right && y > dev.top && y < dev.bottom)) continue;
      const d = b.contains(e.target) ? -1 : (x - e.clientX) ** 2 + (y - e.clientY) ** 2;
      if (d < near) { near = d; bird = b; }
    }
    if (!bird || bird.classList.contains('poked')) return;
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
    const city = bird.closest('.pc-city'), r = bird.getBoundingClientRect(), cr = city.getBoundingClientRect();
    const bubble = Object.assign(document.createElement('i'), { className: 'pc-say', textContent: pokes % 5 === 0 ? '📨 delivered' : SAY[pokes % SAY.length] });
    bubble.style.left = `${(r.right - cr.left - 4).toFixed(0)}px`;
    bubble.style.top = `${(r.top - cr.top - 22).toFixed(0)}px`;
    city.append(bubble);
    setTimeout(() => bubble.remove(), 1500);
  });
}

// NeatInk's backdrop is paper: write on it (or on the tablet) with a mouse or a pen, and the ink fades away like the
// scene's own words. Touch is left alone: a finger on the page is scrolling. The ink library is fetched when a mouse or
// pen first comes over the paper, and the canvas the ink is drawn on exists only while there is ink on it.
function inkOnPaper() {
  const back = document.querySelector('.ni-back');
  if (!back) return;
  const stage = back.parentElement; // the ink goes over the whole scene, the tablet included
  const LIFE = 2.4;
  const strokes = [];
  let lib, getStroke, canvas, ctx, raf = 0, live = null, held = null;
  const load = () => (lib ??= import('perfect-freehand').then((m) => { getStroke = m.getStroke; }));
  back.addEventListener('pointerover', (e) => { if (e.pointerType !== 'touch') load(); });

  function render() {
    raf = 0;
    const now = performance.now() / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#bbc3ff';
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      const age = s.done ? now - s.done : 0;
      if (age > LIFE) { strokes.splice(i, 1); continue; }
      const outline = getStroke(s.pts, { size: s.pen ? 9 : 7, thinning: 0.55, smoothing: 0.5, streamline: 0.45, simulatePressure: !s.pen, last: !!s.done });
      if (outline.length < 3) continue;
      ctx.globalAlpha = 0.8 * (1 - Math.max(0, age - LIFE * 0.4) / (LIFE * 0.6));
      ctx.beginPath();
      ctx.moveTo(outline[0][0], outline[0][1]);
      for (const [px, py] of outline) ctx.lineTo(px, py);
      ctx.fill();
    }
    if (strokes.length) raf = requestAnimationFrame(render);
    else { canvas.remove(); canvas.width = canvas.height = 0; } // no ink left: give the memory back
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(render); };
  const at = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, e.pressure || 0.5]; };

  back.addEventListener('pointerdown', async (e) => {
    if (e.pointerType === 'touch' || e.button > 0) return;
    e.preventDefault(); // no text selection while writing
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
    }
    live = { pts: [at(e)], pen: e.pointerType === 'pen', done: 0, id: e.pointerId };
    strokes.push(live);
    if (held !== e.pointerId) end(e); // let go while the library was still on its way: a dot
    kick();
  });
  back.addEventListener('pointermove', (e) => {
    if (!live || e.pointerId !== live.id) return;
    live.pts.push(at(e));
    kick();
  });
  function end(e) {
    if (held === e.pointerId) held = null;
    if (live && e.pointerId === live.id) { live.done = performance.now() / 1000; live = null; kick(); }
  }
  back.addEventListener('pointerup', end);
  back.addEventListener('pointercancel', end);
  back.addEventListener('lostpointercapture', end);
}
