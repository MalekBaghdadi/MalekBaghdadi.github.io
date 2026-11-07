// Bug Run: the little game that opens up in the page when Play is pressed in Game development. One button: jump the
// bugs, grab the coins, bump the "?" blocks from below. The sky turns from day to sunset to a starry night and back as
// the score climbs.
//
// It is downloaded only when someone reaches for Play (game.js), drawn on a canvas 112 art pixels high that the page
// scales up in whole pixels, as wide as the page has room for, and asleep whenever it is closed, scrolled away, paused
// or the tab is hidden: it costs the site nothing until it is played, and very little while it is. Nothing is created
// per frame (bugs, coins and sparks are reused).
import { FRAMES, BLOCK, PAL } from '../runner.js';

let W = 256; // the world's width in art pixels: whatever fits the page (game.js), from about 200 on a phone to 480
const H = 112, GROUND = 92; // its height, and the top of the grass
const GRAVITY = 900, JUMP = 262, CUT = 110; // px/s², take-off speed, and what letting go early cuts a jump to
const COYOTE = 0.08, BUFFER = 0.13; // a jump still counts just after leaving the ground, and just before landing
const RX = 40; // the runner's left edge
const KEY_BEST = 'bugrun-best', KEY_GOLD = 'bugrun-gold', KEY_SOUND = 'bugrun-sound';
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode: it just won't stick */ } },
};

// ---- art ----
const canvasOf = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); return c; };
const pix = (rows, pal) => canvasOf(rows[0].length, rows.length, (x) => rows.forEach((r, j) => {
  for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } }
}));
const flipped = (src) => canvasOf(src.width, src.height, (x) => { x.scale(-1, 1); x.drawImage(src, -src.width, 0); });

const BUG_TOP = ['.....rrrrr..', '...rrrkrrrr.', '.kkrrrrrrkrr', 'kwkkrrkrrrrr', 'kkkkrrrrrkrr', '.kk.rrrrrrr.'];
const BUG = [[...BUG_TOP, '..k..k..k...', '.k..k..k....'], [...BUG_TOP, '..k..k..k...', '...k..k..k..']];
const FLY = [
  ['....ww.ww..', '...wwwwwww.', '....wwwww..', '.kk.ggggg..', 'kwkgggggggk', '.kkggkggk..', '....g.g....', '...........'],
  ['...........', '...........', '...........', '.kk.ggggg..', 'kwkgggggggk', '.kkggkggk..', '...wwwwww..', '....ww.ww..'],
];
const CLOUD = ['......wwww......', '...wwwwwwwww.ww.', '.wwwwwwwwwwwwwww', 'cwwwwwwwwwwwwwwc', '.cccccccccccccc.'];
// glyphs, 3 x 5, for the score and the banners
const FONT = {
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
  5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111',
  A: '010101111101101', B: '110101110101110', E: '111100110100111', F: '111100110100100', H: '101101111101101',
  I: '111010010010111', N: '101111111101101', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  W: '101101111111101', '!': '010010010000010', '+': '000010111010000', x: '000101010101000', ' ': '000000000000000',
};

function makeArt(gold) {
  const runPal = gold ? { ...PAL, b: '#ffc53d', k: '#7a4a00', f: '#ff5a36' } : PAL;
  const ROWW = [3, 5, 7, 7, 7, 5, 3];
  return {
    run: [pix(FRAMES.a, runPal), pix(FRAMES.b, runPal)],
    jump: pix(FRAMES.j, runPal),
    bug: BUG.map((f) => pix(f, { r: '#ff4d4d', k: '#0f1633', w: '#ffffff' })),
    fly: FLY.map((f) => pix(f, { g: '#35c98a', k: '#0f1633', w: 'rgba(255,255,255,0.85)' })),
    block: pix(BLOCK, { k: '#0f1633', b: '#2b3bff', w: '#ffffff' }),
    used: pix(BLOCK.map((r) => r.replace(/[bw]/g, 'g')), { k: '#0f1633', g: '#7d86a8' }),
    cloud: pix(CLOUD, { w: '#ffffff', c: '#dbe4ff' }),
    coin: [1, 0.6, 0.15, 0.6].map((s, f) => canvasOf(7, 7, (x) => {
      ROWW.forEach((w0, j) => {
        const w = Math.max(1, Math.round(w0 * s)) | 1, x0 = (7 - w) / 2;
        x.fillStyle = '#e09a00'; x.fillRect(x0, j, w, 1);
        if (w > 2 && j > 0 && j < 6) { x.fillStyle = '#ffd23f'; x.fillRect(x0 + 1, j, w - 2, 1); }
      });
      if (f === 0) { x.fillStyle = '#fff6c2'; x.fillRect(3, 2, 1, 2); }
    })),
    glyph: (color) => Object.fromEntries(Object.entries(FONT).map(([ch, bits]) => [ch, canvasOf(3, 5, (x) => {
      x.fillStyle = color;
      for (let i = 0; i < 15; i++) if (bits[i] === '1') x.fillRect(i % 3, (i / 3) | 0, 1, 1);
    })])),
  };
}

// The sky over a cycle of the score: day, sunset, night (stars, moon), dawn. Colours are mixed between the stops.
const SKY = [
  { top: '#6fa8ff', bottom: '#d6e6ff', far: '#8ea2ff', near: '#4a62e8', orb: '#ffd23f', stars: 0 },
  { top: '#4b4bd6', bottom: '#ffb27a', far: '#a77ad8', near: '#6a4ac0', orb: '#ff7a45', stars: 0.25 },
  { top: '#0f1633', bottom: '#2a3a8a', far: '#2c3877', near: '#1d285c', orb: '#f3ecdc', stars: 1 },
  { top: '#6f78ff', bottom: '#ffd0c0', far: '#9095f0', near: '#5a64d8', orb: '#ffb36b', stars: 0.3 },
];
const CYCLE = 1600; // score points for a whole day
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const SKYRGB = SKY.map((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, typeof v === 'string' ? hex(v) : v])));
const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

/**
 * Mounts the game in `screen` (an element holding a canvas) and wires its controls. `width` is the world's width in art
 * pixels. Returns { start, stop, pause, quit, resize, setSound, sound }: start and stop wake it and put it to sleep (game.js
 * does, as it is scrolled to and away), pause holds a run, quit ends it (closed). `hud.overlay(state, info)` is told when to show
 * the title, pause or game-over card, and `hud.want()` when the game is pressed while it is asleep (half off screen).
 */
export function mountGame(screen, hud, { width = 256 } = {}) {
  W = width;
  const cv = screen.querySelector('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  let art = makeArt(store.get(KEY_GOLD) === '1');
  let white = art.glyph('#ffffff'), ink = art.glyph('#0f1633'), gold = art.glyph('#ffd23f');

  // ---- state ----
  const me = { y: GROUND, vy: 0, ground: true, air: 0, buffer: 0, holding: false, dead: false, deadT: 0, frameDist: 0 };
  const pool = (n, make) => Array.from({ length: n }, make);
  // (enough of each for the widest world, 480 pixels of course on screen at once)
  const foes = pool(16, () => ({ on: false, kind: 'bug', x: 0, y: 0, w: 0, h: 0, t: 0 }));
  const coins = pool(48, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, free: false, t: 0, got: 0 }));
  const blocks = pool(4, () => ({ on: false, x: 0, y: 0, used: false, bump: 0 }));
  const sparks = pool(120, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0, color: '#fff', g: 0 }));
  const texts = pool(8, () => ({ on: false, x: 0, y: 0, life: 0, str: '' }));
  let stars = [];
  const sky = () => { stars = Array.from({ length: Math.round(W / 9) }, (_, i) => [(i * 97) % W, 4 + ((i * 53) % 52), (i * 0.37) % 1]); };
  sky();
  let state = 'title', speed = 78, dist = 0, coinCount = 0, best = +(store.get(KEY_BEST) || 0), score = 0;
  let next = 60, shake = 0, flash = 0, hitstop = 0, banner = 0, bannerText = '', nextBanner = 500, newBest = false;
  let scroll = 0, time = 0, deadLock = 0;

  const take = (arr) => arr.find((o) => !o.on);
  const spark = (x, y, n, color, spread = 40, up = 40, g = 120) => {
    for (let i = 0; i < n; i++) {
      const s = take(sparks);
      if (!s) return;
      Object.assign(s, { on: true, x, y, vx: (Math.random() - 0.5) * spread, vy: -Math.random() * up, life: 0, max: 0.35 + Math.random() * 0.35, color, g });
    }
  };
  const say = (x, y, str) => { const t = take(texts); if (t) Object.assign(t, { on: true, x, y, life: 0, str }); };

  function reset() {
    Object.assign(me, { y: GROUND, vy: 0, ground: true, air: 0, buffer: 0, dead: false, deadT: 0 });
    [foes, coins, blocks, sparks, texts].forEach((a) => a.forEach((o) => { o.on = false; }));
    speed = 78; dist = 0; coinCount = 0; score = 0; next = 80; shake = 0; flash = 0; hitstop = 0; banner = 0; nextBanner = 500; newBest = false;
  }

  // ---- sound: tiny synthesised blips, off until the visitor turns them on ----
  let sound = store.get(KEY_SOUND) === '1', audio = null;
  function sfx(kind) {
    if (!sound) return;
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
    const [type, f0, f1, dur, vol] = { jump: ['square', 380, 760, 0.12, 0.05], coin: ['square', 988, 1480, 0.14, 0.04], bump: ['triangle', 160, 90, 0.12, 0.12], hit: ['sawtooth', 420, 60, 0.4, 0.07], best: ['square', 660, 1320, 0.3, 0.04] }[kind];
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + dur);
  }

  // ---- input: one button (space, up, W, a click or a tap), held for a higher jump ----
  function press() {
    if (!awake) { hud.want?.(); return; } // asleep, half off screen: bring it on first
    if (state === 'paused') { setState('play'); kick(); return; } // back where it was, without a jump
    if (state === 'title') { reset(); setState('play'); } // the first press starts the run with a jump
    else if (state === 'dead') { if (deadLock > 0) return; reset(); setState('play'); }
    me.holding = true;
    me.buffer = BUFFER;
    kick();
  }
  function release() {
    me.holding = false;
    if (!me.ground && me.vy < -CUT) me.vy = -CUT; // let go early: a shorter hop
  }
  const KEYS = new Set(['Space', 'ArrowUp', 'KeyW', 'KeyX', 'KeyJ']);
  const mod = (e) => e.ctrlKey || e.metaKey || e.altKey;
  screen.addEventListener('keydown', (e) => { if (KEYS.has(e.code) && !mod(e)) { e.preventDefault(); if (!e.repeat) press(); } });
  screen.addEventListener('keyup', (e) => { if (KEYS.has(e.code)) release(); });
  // A mouse or pen acts the moment it is pressed. So does a finger while the run is on (and the game holds the touch,
  // style.css, so a held jump can't scroll the page). Otherwise a finger starts or restarts the run with a tap, on its
  // click: a swipe across the game on the way down the page scrolls past it instead of starting it.
  let touch = false;
  screen.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    touch = e.pointerType === 'touch';
    screen.focus({ preventScroll: true });
    if (touch && state !== 'play') return;
    e.preventDefault();
    press();
  });
  screen.addEventListener('click', () => { if (touch && state !== 'play') { press(); release(); } });
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);

  function setState(s) {
    state = s;
    hud.overlay(s, { score, best, coins: coinCount, newBest });
  }

  // ---- the course ----
  function spawn() {
    const x = W + 8, sc = score, roll = Math.random();
    const gap = () => speed * (2 * JUMP / GRAVITY) + 26 + Math.random() * (90 - Math.min(40, sc / 40)); // always clearable
    // everything moves with the ground, so the gaps laid out here are the gaps that arrive (bugs that crawled at their
    // own speeds caught up with each other on a wide course, and closed a gap too short to land in)
    const foe = (kind, fx, fy) => { const f = take(foes); if (f) Object.assign(f, { on: true, kind, x: fx, y: fy, w: kind === 'bug' ? 12 : 11, h: 8, t: Math.random() }); };
    const coinAt = (cx, cy) => { const c = take(coins); if (c) Object.assign(c, { on: true, x: cx, y: cy, vx: 0, vy: 0, free: false, t: Math.random() * 4, got: 0 }); };
    if (sc > 120 && roll < 0.12) { // a "?" block up where only a good jump reaches it
      const b = take(blocks);
      if (b) Object.assign(b, { on: true, x, y: GROUND - 50, used: false, bump: 0 });
      next = gap() + 40; // room after it: a jump for whatever comes next mustn't bump it (bumped, you drop) onto a bug
      return;
    }
    if (roll < 0.22) { // a row of coins, low or high
      const high = Math.random() < 0.5;
      for (let i = 0; i < 4; i++) coinAt(x + i * 10, high ? GROUND - 34 : GROUND - 10);
      next = 50 + Math.random() * 30;
      return;
    }
    if (sc > 300 && roll < 0.36) { // a fly: low ones are jumped, high ones are run under (jump and you hit it)
      const low = Math.random() < 0.5;
      foe('fly', x, low ? GROUND - 13 : GROUND - 28);
      if (low) for (let i = 0; i < 3; i++) coinAt(x - 8 + i * 9, GROUND - 32 - (i === 1 ? 4 : 0));
      next = gap();
      return;
    }
    if (sc > 150 && roll < 0.55) { // a pair: hold the jump to clear both
      foe('bug', x, GROUND - 8);
      foe('bug', x + 12, GROUND - 8);
      next = gap() + 14;
      return;
    }
    foe('bug', x, GROUND - 8);
    if (Math.random() < 0.45) for (let i = 0; i < 3; i++) coinAt(x - 6 + i * 8, GROUND - 26 - (i === 1 ? 6 : 0)); // an arc over it
    next = gap();
  }

  const hitbox = { x: RX + 3, w: 6, h: 13 };
  const overlap = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

  function die() {
    me.dead = true;
    me.vy = -170;
    hitstop = 0.12;
    shake = 0.35;
    flash = 1;
    deadLock = 0.55;
    sfx('hit');
    if (score > best) { best = score; newBest = true; store.set(KEY_BEST, String(best)); }
    setState('dead');
  }

  // ---- one step of the world ----
  function step(dt) {
    if (state === 'paused') return; // the world holds still
    time += dt;
    if (hitstop > 0) { hitstop -= dt; return; }
    shake = Math.max(0, shake - dt);
    flash = Math.max(0, flash - dt * 3);
    banner = Math.max(0, banner - dt);
    deadLock -= dt;
    const live = state === 'play';
    const v = live ? speed : state === 'dead' ? 0 : 34; // the title screen strolls along
    scroll += v * dt;

    if (state === 'dead') { // the runner pops up and falls out of the world
      me.deadT += dt;
      me.vy += GRAVITY * dt;
      me.y += me.vy * dt;
    } else {
      // jumping: buffered presses, a little grace after leaving the ground, gravity, landing
      me.buffer -= dt;
      me.air = me.ground ? 0 : me.air + dt;
      if (live && me.buffer > 0 && (me.ground || me.air < COYOTE)) {
        me.vy = -JUMP;
        me.ground = false;
        me.buffer = 0;
        me.air = COYOTE;
        sfx('jump');
        spark(RX + 6, GROUND, 4, 'rgba(255,255,255,0.8)', 30, 20, 60);
        if (!me.holding) me.vy = -CUT - 40; // a tap: a small hop
      }
      if (!me.ground) {
        me.vy += GRAVITY * dt;
        me.y += me.vy * dt;
        if (me.y >= GROUND) {
          me.y = GROUND;
          me.vy = 0;
          me.ground = true;
          spark(RX + 6, GROUND, 5, 'rgba(255,255,255,0.75)', 50, 18, 40);
        }
      }
      me.frameDist += v * dt;
    }
    if (!live) return;

    dist += v * dt;
    speed = Math.min(175, speed + dt * 1.7);
    score = Math.floor(dist / 8) + coinCount * 10;
    if (score >= nextBanner) { banner = 1.1; bannerText = 'FASTER!'; nextBanner += 500; }
    if (!newBest && best > 0 && score > best) { newBest = true; banner = 1.2; bannerText = 'NEW BEST!'; sfx('best'); }
    if (me.ground && Math.random() < dt * 9) spark(RX + 2, GROUND, 1, 'rgba(255,255,255,0.5)', 10, 8, 20); // dust from the feet

    next -= v * dt;
    if (next <= 0) spawn();

    const px = hitbox.x, py = me.y - hitbox.h;
    for (const f of foes) {
      if (!f.on) continue;
      f.x -= v * dt;
      f.t += dt;
      if (f.kind === 'fly') f.y += Math.sin(f.t * 6) * 6 * dt; // a little bob
      if (f.x < -16) { f.on = false; continue; }
      if (overlap(px, py, hitbox.w, hitbox.h, f.x + 2, f.y + 1, f.w - 4, f.h - 2)) { die(); return; }
    }
    for (const b of blocks) {
      if (!b.on) continue;
      b.x -= v * dt;
      b.bump = Math.max(0, b.bump - dt * 6);
      if (b.x < -12) { b.on = false; continue; }
      // bonked from below: the runner's head meets the block's underside on the way up
      if (!b.used && me.vy < 0 && overlap(px - 1, py - 3, hitbox.w + 2, 4, b.x, b.y + 6, 10, 4)) {
        b.used = true;
        b.bump = 1;
        me.vy = 40;
        sfx('bump');
        for (let i = 0; i < 5; i++) {
          const c = take(coins);
          if (c) Object.assign(c, { on: true, x: b.x + 2, y: b.y - 6, vx: -30 + i * 15 + v * 0.2, vy: -150 - Math.random() * 60, free: true, t: 0, got: 0 });
        }
      }
    }
    for (const c of coins) {
      if (!c.on) continue;
      c.t += dt;
      if (c.free) { // popped out of a block: up, over and into the tally
        c.vy += 520 * dt;
        c.x += c.vx * dt - v * dt;
        c.y += c.vy * dt;
        if (c.t > 0.45) { collect(c); continue; }
      } else c.x -= v * dt;
      if (c.x < -10) { c.on = false; continue; }
      if (!c.free && overlap(px - 1, py, hitbox.w + 2, hitbox.h, c.x, c.y, 7, 7)) collect(c);
    }
    for (const s of sparks) {
      if (!s.on) continue;
      s.life += dt;
      if (s.life > s.max) { s.on = false; continue; }
      s.vy += s.g * dt;
      s.x += (s.vx - v * 0.5) * dt;
      s.y += s.vy * dt;
    }
    for (const t of texts) { if (t.on && (t.life += dt) > 0.7) t.on = false; }
  }
  function collect(c) {
    c.on = false;
    coinCount++;
    sfx('coin');
    spark(c.x + 3, c.y + 3, 6, '#ffd23f', 70, 70, 160);
    say(c.x, c.y - 4, '+10');
  }

  // ---- drawing ----
  const text = (str, x, y, font = white, shadow = true) => {
    for (let i = 0; i < str.length; i++) {
      const g = font[str[i]];
      if (!g) continue;
      if (shadow) ctx.drawImage(ink[str[i]], x + i * 4 + 1, y + 1);
      ctx.drawImage(g, x + i * 4, y);
    }
  };
  const pad = (n, len) => String(n).padStart(len, '0');
  function hills(color, base, amp, freq, par) {
    const off = scroll * par;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    for (let x = 0; x <= W; x += 4) {
      const u = (x + off) * freq;
      ctx.lineTo(x, base - amp * (0.6 * Math.sin(u) + 0.4 * Math.sin(u * 2.3 + 1.7)));
    }
    ctx.lineTo(W, GROUND);
    ctx.fill();
  }
  function draw() {
    // the time of day follows the score (the title screen sits in the morning)
    const phase = (((state === 'title' ? 120 : score) % CYCLE) / CYCLE) * SKY.length;
    const i0 = Math.floor(phase), i1 = (i0 + 1) % SKY.length, f = phase - i0;
    const A = SKYRGB[i0], B = SKYRGB[i1];
    ctx.save();
    if (shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 4 * shake), Math.round((Math.random() - 0.5) * 3 * shake));
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, mix(A.top, B.top, f));
    sky.addColorStop(1, mix(A.bottom, B.bottom, f));
    ctx.fillStyle = sky;
    ctx.fillRect(-4, -4, W + 8, GROUND + 4);
    const starA = A.stars + (B.stars - A.stars) * f;
    if (starA > 0.02) {
      for (const [sx, sy, tw] of stars) {
        ctx.globalAlpha = starA * (0.5 + 0.5 * Math.sin(time * 2 + tw * 9));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect((sx - scroll * 0.02 + W) % W, sy, 1, 1);
      }
      ctx.globalAlpha = 1;
    }
    // sun or moon, arcing across the sky over the cycle
    const arc = (phase % 1) * Math.PI, ox = 30 + (phase % 1) * (W - 60), oy = 40 - Math.sin(arc) * 26;
    ctx.fillStyle = mix(A.orb, B.orb, f);
    ctx.beginPath();
    ctx.arc(Math.round(ox), Math.round(oy), 7, 0, Math.PI * 2);
    ctx.fill();
    if (i0 === 2 || (i0 === 1 && f > 0.6)) { ctx.fillStyle = mix(A.top, B.top, f); ctx.beginPath(); ctx.arc(Math.round(ox) + 4, Math.round(oy) - 2, 6, 0, Math.PI * 2); ctx.fill(); }
    for (let k = 0, n = Math.ceil(W / 90); k < n; k++) ctx.drawImage(art.cloud, Math.round(((k * 110 + 30 - scroll * (0.12 + (k % 3) * 0.05)) % (W + 40) + W + 40) % (W + 40) - 20), 10 + (k % 3) * 13);
    hills(mix(A.far, B.far, f), GROUND - 14, 10, 0.03, 0.2);
    hills(mix(A.near, B.near, f), GROUND - 4, 8, 0.05, 0.45);
    // ground: grass, a darker edge, earth with pebbles going by
    ctx.fillStyle = '#3cc472'; ctx.fillRect(0, GROUND, W, 3);
    ctx.fillStyle = '#2a9d5a'; ctx.fillRect(0, GROUND + 3, W, 1);
    ctx.fillStyle = '#8a5a3b'; ctx.fillRect(0, GROUND + 4, W, H - GROUND - 4);
    ctx.fillStyle = '#6e4529';
    for (let x = -(scroll % 24); x < W; x += 24) { ctx.fillRect(Math.round(x) + 5, GROUND + 8, 2, 1); ctx.fillRect(Math.round(x) + 16, GROUND + 13, 3, 1); }
    ctx.fillStyle = '#5fd890';
    for (let x = -(scroll % 18); x < W; x += 18) ctx.fillRect(Math.round(x) + 3, GROUND - 1, 1, 1); // tufts

    for (const b of blocks) if (b.on) ctx.drawImage(b.used ? art.used : art.block, Math.round(b.x), Math.round(b.y - b.bump * 3));
    for (const c of coins) if (c.on) ctx.drawImage(art.coin[Math.floor(c.t * 10) % 4], Math.round(c.x), Math.round(c.y));
    for (const fo of foes) {
      if (!fo.on) continue;
      const fr = fo.kind === 'bug' ? art.bug[Math.floor(fo.t * 10) % 2] : art.fly[Math.floor(fo.t * 16) % 2];
      ctx.drawImage(fr, Math.round(fo.x), Math.round(fo.y));
    }
    // the runner
    const ry = Math.round(me.y) - 16;
    if (me.dead) {
      ctx.save();
      ctx.translate(RX + 6, ry + 8);
      ctx.rotate(Math.min(Math.PI, me.deadT * 9));
      ctx.drawImage(art.jump, -6, -8);
      ctx.restore();
    } else ctx.drawImage(me.ground ? art.run[Math.floor(me.frameDist / 7) % 2] : art.jump, RX, ry);
    for (const s of sparks) {
      if (!s.on) continue;
      ctx.globalAlpha = 1 - s.life / s.max;
      ctx.fillStyle = s.color;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }
    ctx.globalAlpha = 1;
    for (const t of texts) if (t.on) text(t.str, Math.round(t.x), Math.round(t.y - t.life * 16), gold);
    ctx.restore();

    // the tally: score on the left, best in the middle, coins on the right
    text(pad(score, 5), 4, 4);
    if (best > 0) text(`HI ${pad(Math.max(best, score), 5)}`, W / 2 - 16, 4, newBest ? gold : white);
    ctx.drawImage(art.coin[0], W - 30, 3);
    text(`x${pad(coinCount, 2)}`, W - 21, 4);
    if (banner > 0 && Math.floor(banner * 8) % 2 === 0) text(bannerText, W / 2 - bannerText.length * 2, 30, gold);
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${(flash * 0.7).toFixed(2)})`; ctx.fillRect(0, 0, W, H); }
  }

  // ---- the loop: fixed 120 Hz steps, drawn once a frame. It runs only while the game is awake (open, on screen, the tab
  // visible: game.js says so with start and stop), and stops by itself while paused or once a crash has played out. ----
  let raf = 0, last = 0, acc = 0, awake = false, isGold = null;
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    acc += dt;
    while (acc >= 1 / 120) { step(1 / 120); acc -= 1 / 120; }
    draw();
    const still = state === 'paused' || (state === 'dead' && me.deadT > 1.6);
    if (awake && !still) raf = requestAnimationFrame(frame);
  }
  function kick() { if (awake && !raf) { last = 0; acc = 0; raf = requestAnimationFrame(frame); } }
  function start() {
    const g = store.get(KEY_GOLD) === '1'; // a cheat code may have been entered since last time
    if (g !== isGold) { isGold = g; art = makeArt(g); white = art.glyph('#ffffff'); ink = art.glyph('#0f1633'); gold = art.glyph('#ffd23f'); draw(); }
    awake = true;
    hud.overlay(state, { score, best, coins: coinCount, newBest });
    kick();
  }
  function stop() {
    awake = false;
    cancelAnimationFrame(raf);
    raf = 0;
    release();
    if (state === 'play') { setState('paused'); draw(); }
  }
  function pause() { if (state === 'play') setState('paused'); } // the loop draws the moment it stopped, and rests
  function quit() { stop(); reset(); setState('title'); draw(); } // closed: the next time it opens, it starts afresh
  function resize(width) {
    if (width === W) return;
    W = width;
    cv.width = W;
    ctx.imageSmoothingEnabled = false; // (a resized canvas forgets it)
    sky();
    draw();
  }
  addEventListener('blur', () => pause()); // another window took the keyboard
  draw();
  if (import.meta.env.DEV) { // for tools/game-test.mjs only (stripped from the build): watch the course, press, skip ahead
    window.__bugrun = {
      peek: () => ({ state, awake, running: !!raf, W, speed, score, dist, coins: coinCount, y: me.y, vy: me.vy, ground: me.ground, foes: foes.filter((f) => f.on).map(({ kind, x, y, w, h }) => ({ kind, x, y, w, h })), blocks: blocks.filter((b) => b.on).map(({ x, y, used }) => ({ x, y, used })) }),
      press, release, skipTo: (points) => { dist = points * 8; },
    };
  }
  return { start, stop, pause, quit, resize, setSound: (on) => { sound = on; store.set(KEY_SOUND, on ? '1' : '0'); }, sound: () => sound };
}
