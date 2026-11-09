import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitWords } from './split.js';
import { initWaves } from './hero-waves.js';
import { liveWhileVisible, rng } from './ambient.js';
import { vh, anticipatePin } from './viewport.js';
import { found } from './hunt.js';
import { initHeroPlay } from './hero-play.js';

const WIDE = 150;   // Anybody's widest width axis: the name rests here and fills the line
const NARROW = 50;  // where the load intro starts
const PINCH = 104;  // how narrow letters get under the pointer; lower than this the heavy weight fuses neighbours
const SQUEEZE = 62; // how narrow the scroll squeezes the name as it lifts away
const LEN = 3.4;    // screens of scroll the hero stays pinned for (the last one is NeatInk sliding over it)

/**
 * The opening. On load the name opens to full width and the signal bars connect. Scrolling then tells the site's
 * thesis: a highlighter runs under the line, the signal drops to "No connection", the name squeezes and lifts away,
 * and the three apps rise out of the page and light up, still working. Over the last screen NeatInk slides up over it.
 */
export function initHero({ reduced }) {
  const hero = document.querySelector('.hero');
  const stage = hero.querySelector('.hero-stage');
  const q = (s) => hero.querySelector(s);
  const qa = (s) => [...hero.querySelectorAll(s)];
  const name = q('.name');
  const lines = [...name.querySelectorAll('.line')];
  const chars = [];
  for (const line of lines) {
    const text = line.textContent;
    line.textContent = '';
    line.setAttribute('aria-hidden', 'true');
    for (const c of text) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      line.append(s);
      chars.push(s);
    }
  }
  const n = chars.length;
  let waves = null; // the signal's rings (hero-waves.js), once they exist

  // Each letter's width comes from three inputs, combined in one place so they never fight:
  // the load intro (0..1), the scroll squeeze (shared, 0..1, staggered left to right) and the pointer pinch (0..1).
  // A fourth rides with the pinch: a ping sent from the signal bars squeezes each letter as its ring goes by.
  const intro = chars.map(() => ({ v: reduced ? 1 : 0 }));
  const pinch = chars.map(() => 0);
  const wave = chars.map(() => 0);
  const state = { squeeze: 0 };
  function render() {
    chars.forEach((c, i) => {
      const s = Math.max(0, Math.min(1, state.squeeze * 1.6 - (i / (n - 1)) * 0.6));
      const base = WIDE - (WIDE - SQUEEZE) * s;
      let w = NARROW + (base - NARROW) * intro[i].v;
      if (w > PINCH) w -= (w - PINCH) * Math.max(pinch[i], wave[i]);
      c.style.fontStretch = `${w.toFixed(1)}%`;
    });
  }

  // Size the type so the widest line fills the column at full width without crowding the screen height.
  let size = 100;
  let rest = [];
  function fit() {
    chars.forEach((c) => { c.style.fontStretch = `${WIDE}%`; });
    name.style.setProperty('--name-size', '100px');
    const widest = Math.max(...lines.map((l) => { const a = l.firstElementChild, b = l.lastElementChild; return b.offsetLeft + b.offsetWidth - a.offsetLeft; }));
    size = Math.min(((100 * name.clientWidth) / widest) * 0.995, (vh() * 0.42) / (lines.length * 0.88));
    name.style.setProperty('--name-size', `${size}px`);
    rest = chars.map((c) => ({ x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop + c.offsetHeight / 2 }));
    render();
  }

  // Beirut's time, the one live detail in the status line; its colon blinks every second while the hero is on screen.
  // Pressed, it shows the visitor's own time for a few seconds, and how far that is from Beirut's.
  const clockEl = q('.clock');
  const clock = q('.clock time');
  clock.innerHTML = '<span></span><b class="colon amb">:</b><span></span>';
  clockEl.firstChild.replaceWith(Object.assign(document.createElement('span'), { className: 'clock-who', textContent: 'Beirut' }), ' ');
  const who = clockEl.firstChild, away = clockEl.appendChild(Object.assign(document.createElement('span'), { className: 'clock-away' }));
  const [hh, , mm] = clock.children;
  const zone = (timeZone) => new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone });
  const fmt = { beirut: zone('Asia/Beirut'), you: zone(undefined) };
  const read = (f, d) => Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
  const minutes = (p) => Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute) / 60000;
  let mine = false, mineTimer = 0;
  const tick = () => {
    const d = new Date(), parts = read(mine ? fmt.you : fmt.beirut, d);
    hh.textContent = parts.hour;
    mm.textContent = parts.minute;
    who.textContent = mine ? 'You' : 'Beirut';
    if (!mine) { away.textContent = ''; return; }
    const gap = Math.round(minutes(parts) - minutes(read(fmt.beirut, d))), h = Math.floor(Math.abs(gap) / 60), m = Math.abs(gap) % 60;
    away.textContent = gap ? ` ${[h && `${h} h`, m && `${m} min`].filter(Boolean).join(' ')} ${gap < 0 ? 'behind' : 'ahead of'} Beirut` : ' same time as Beirut';
  };
  tick();
  setInterval(tick, 20_000);
  clockEl.addEventListener('click', () => {
    mine = !mine;
    tick();
    waves?.resize(); // the bars moved along the line
    clearTimeout(mineTimer);
    if (mine) {
      found('clock', '🕰️ <b>Your time.</b> Beirut’s is the one I answer email in.');
      mineTimer = setTimeout(() => { mine = false; tick(); waves?.resize(); }, 7000);
    }
  });

  const bars = qa('.bars rect');
  const labelA = q('.net-a'), n0 = q('.n0'), n1 = q('.n1'), n2 = q('.n2');
  const thesis = splitWords(q('.thesis'));
  const pitch = q('.pitch');
  const top = q('.hero-top');
  const trio = q('.trio');
  const tab = q('.dev-tab'), left = q('.dev-l'), right = q('.dev-r');
  const shades = [tab, left, right].map((d) => d.querySelector('.shade'));
  const caps = qa('.dev figcaption');
  const line = q('.trio-line');
  const lineWords = splitWords(line);
  // a light that sweeps across each screen as it comes on, and a soft contact shadow where each device meets the page
  const glares = [tab, left, right].map((d) => d.querySelector('.scr').appendChild(Object.assign(document.createElement('i'), { className: 'glare' })));
  const floors = [tab, left, right].map((d) => d.appendChild(Object.assign(document.createElement('i'), { className: 'dev-floor' })));
  if (!reduced) {
    // a slow float while the hero is on screen and the visitor has stopped (style.css): it is there to keep the page
    // alive at rest, so it holds still while the scroll is moving things, and costs nothing then
    [tab, left, right].forEach((d) => d.classList.add('amb'));
    ScrollTrigger.addEventListener('scrollStart', () => hero.classList.add('scrolling'));
    ScrollTrigger.addEventListener('scrollEnd', () => hero.classList.remove('scrolling'));
  }

  fit();
  // Refit whenever ScrollTrigger refreshes (it does on a real resize, but not when a phone's address bar comes and
  // goes: refreshing then is what made the page jump), before it measures anything.
  ScrollTrigger.addEventListener('refreshInit', fit);
  document.fonts.load('800 100px "Anybody Variable"').then(() => ScrollTrigger.refresh());

  // ---- the scroll sequence (positions 0..1) ----
  const tl = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } });
  // a highlighter runs under the thesis, word by word
  tl.fromTo(thesis, { backgroundSize: '0% 38%' }, { backgroundSize: '100% 38%', duration: 0.02, stagger: { amount: 0.16 }, immediateRender: true }, 0.02);
  // the signal drops, strongest bar first
  [...bars].reverse().forEach((b, i) => tl.fromTo(b, { opacity: 1, scaleY: 1 }, { opacity: 0.18, scaleY: 0.4, transformOrigin: '50% 100%', duration: 0.03 }, 0.06 + i * 0.05));
  tl.fromTo(labelA, { opacity: 1 }, { opacity: 0, duration: 0.02 }, 0.25);
  tl.fromTo(n2, { opacity: 0 }, { opacity: 1, duration: 0.02 }, 0.25);
  // ...and the thesis feels it: the highlighter under "connection doesn't" turns the colour of "No connection",
  // and "connection" stutters like a weak signal as the last bars go
  const lost = thesis.filter((w) => /^(connection|doesn)/.test(w.textContent));
  tl.fromTo(lost, { '--hl': 'rgba(43, 59, 255, 0.2)' }, { '--hl': 'rgba(255, 90, 54, 0.3)', duration: 0.03 }, 0.19);
  const stutter = [1, 0.35, 0.9, 0.2, 0.75, 0.4, 1];
  stutter.slice(1).forEach((o, i) => tl.fromTo(lost[0], { opacity: stutter[i] }, { opacity: o, duration: 0.005 }, 0.165 + i * 0.012));
  // the name squeezes and lifts away; the pitch goes with it
  tl.fromTo(state, { squeeze: 0 }, { squeeze: 1, duration: 0.36, onUpdate: render }, 0.04);
  // (2D: the letters are re-set every frame anyway as their width changes, and an identity 3D transform left behind on
  // the way back up would put them on layers of their own, drawn a shade differently than before they ever moved)
  tl.fromTo(name, { y: 0 }, { y: () => -vh() * 0.12, duration: 0.18, ease: 'power1.in', force3D: false }, 0.26);
  // ...letter by letter, in the order they squeezed: each one is let go, tips and drifts up out of the page
  const r = rng(11);
  const peel = chars.map((_, i) => ({ y: -(0.2 + r() * 0.48), x: (i - (n - 1) / 2) * (0.006 + r() * 0.014), rotation: (r() - 0.5) * 26 }));
  tl.fromTo(chars, { y: 0, x: 0, rotation: 0, opacity: 1 }, { // distances in letter heights, so phones get the same drift
    y: (i) => peel[i].y * size, x: (i) => peel[i].x * size, rotation: (i) => peel[i].rotation, opacity: 0,
    duration: 0.09, stagger: 0.0085, ease: 'power2.in', force3D: false,
  }, 0.24);
  tl.fromTo(pitch, { y: 0, opacity: 1 }, { y: -40, opacity: 0, duration: 0.11, ease: 'power1.in' }, 0.22);
  // the three apps rise out of the page: lying back at first, standing up as they come
  // at rest the devices peek into whatever room is left under the text (a tenth to a quarter of the screen)
  const peek = () => {
    const H = stage.clientHeight;
    const free = H - (pitch.offsetTop + pitch.offsetHeight) - 28;
    return H - trio.offsetTop - Math.max(H * 0.1, Math.min(H * 0.26, free));
  };
  const lift = { transformPerspective: 1600, transformOrigin: '50% 100%' };
  tl.fromTo(tab, { y: peek, rotateX: 28, scale: 0.92, ...lift }, { y: 0, rotateX: 0, scale: 1, duration: 0.36, ease: 'power2.inOut', immediateRender: true }, 0.2);
  tl.fromTo(left, { y: () => peek() + 40, x: () => trio.clientWidth * 0.05, rotation: -12, rotateX: 28, ...lift }, { y: 0, x: 0, rotation: -5, rotateX: 0, duration: 0.38, ease: 'power2.inOut', immediateRender: true }, 0.18);
  tl.fromTo(right, { y: () => peek() + 40, x: () => -trio.clientWidth * 0.05, rotation: 12, rotateX: 28, ...lift }, { y: 0, x: 0, rotation: 5, rotateX: 0, duration: 0.38, ease: 'power2.inOut', immediateRender: true }, 0.18);
  // standing up, each one settles onto the page: its shadow gathers under it and darkens
  tl.fromTo(floors, { opacity: 0.25, scaleX: 1.45 }, { opacity: 1, scaleX: 1, duration: 0.36, ease: 'power2.inOut', immediateRender: true }, 0.2);
  // offline, and their screens light up anyway, a light running across the glass as each one comes on
  tl.fromTo(shades, { opacity: 0.62 }, { opacity: 0, duration: 0.06, stagger: 0.025, immediateRender: true }, 0.5);
  tl.fromTo(glares, { xPercent: -36 }, { xPercent: 36, duration: 0.09, stagger: 0.025, ease: 'power1.inOut', immediateRender: true }, 0.49);
  tl.fromTo(line, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, 0.5);
  tl.fromTo(lineWords, { opacity: 0.3 }, { opacity: 1, duration: 0.01, stagger: { amount: 0.1 }, immediateRender: true }, 0.52);
  tl.fromTo(caps, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.05, stagger: 0.01 }, 0.55);
  // the last screen of scroll is NeatInk sliding up over this one: the hero is pushed back and dimmed under it
  const over = 1 / LEN;
  const dim = document.createElement('i');
  dim.className = 'dim';
  stage.append(dim);
  tl.fromTo(dim, { opacity: 0 }, { opacity: 0.6, duration: over, ease: 'power1.in' }, 1 - over);
  tl.fromTo(trio, { scale: 1 }, { scale: 0.9, transformOrigin: '50% 100%', duration: over, ease: 'power1.in' }, 1 - over);
  tl.fromTo([tab, left, right], { rotateX: 0 }, { rotateX: 14, duration: over, ease: 'power1.in' }, 1 - over); // and lie back down
  tl.fromTo([top, line], { opacity: 1, y: 0 }, { opacity: 0.3, y: -30, duration: over, ease: 'power1.in' }, 1 - over);
  tl.set({}, {}, 1);
  tl.eventCallback('onUpdate', render);
  ScrollTrigger.addEventListener('refresh', render); // refresh renders the timeline to its end and back with events muted
  // behind it all, the signal: rings pulse out of the bars until the connection drops (hero-waves.js)
  waves = initWaves(stage, q('.bars'), tl, LEN, reduced);
  liveWhileVisible(hero, LEN);

  // Press the signal bars: a ping goes out of them, and the name feels it pass, each letter squeezed as the ring
  // crosses it. With the connection gone the ring breaks up before it gets anywhere (and the bars shake their head).
  const net = q('.net');
  net.addEventListener('click', () => {
    const down = state.squeeze > 0.3;
    found('ping', down ? '📡 <b>No connection.</b> That ping didn’t get far. The apps don’t mind.' : '📶 <b>Signal sent.</b> Not that anything on this page needs one.');
    if (reduced) return;
    net.classList.remove('pinged', 'failed');
    void net.offsetWidth;
    net.classList.add(down ? 'failed' : 'pinged');
    const band = size * 0.55;
    waves?.ping((r, x, y) => {
      const o = name.getBoundingClientRect();
      chars.forEach((c, i) => { wave[i] = Math.exp(-(((Math.hypot(o.left + rest[i].x - x, o.top + rest[i].y - y) - r) / band) ** 2)); });
      render();
    }, () => { wave.fill(0); render(); });
  });

  // the name's letters can be pulled like rubber, and the three devices lean after the mouse (hero-play.js)
  initHeroPlay({ hero, name, chars, trio: [tab, left, right], squeezed: () => state.squeeze > 0.02, reduced });

  if (reduced) {
    tl.time(0).pause();
    gsap.set([n0], { opacity: 0 });
    gsap.set([n1], { opacity: 1 });
    gsap.set(shades, { opacity: 0 }); // the still shows the screens lit
    gsap.set(floors, { opacity: 1, scaleX: 1 });
    return;
  }

  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: () => `+=${vh() * LEN}`,
    pin: stage,
    scrub: 0.4,
    animation: tl,
    anticipatePin: anticipatePin(),
    invalidateOnRefresh: true,
  });

  // ---- the load moment: the bars connect and the name opens to full width ----
  gsap.set(n0, { opacity: 1 });
  gsap.set(n1, { opacity: 0 });
  gsap.fromTo(bars, { fillOpacity: 0.2 }, { fillOpacity: 1, duration: 0.25, stagger: 0.18, delay: 0.25, ease: 'power1.out' });
  gsap.to(n0, { opacity: 0, duration: 0.25, delay: 1.05 });
  gsap.to(n1, { opacity: 1, duration: 0.25, delay: 1.05 });
  gsap.fromTo(trio, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, delay: 0.35, ease: 'power3.out' });
  gsap.to(intro, { v: 1, duration: 1.2, ease: 'expo.out', stagger: 0.05, delay: 0.1, onUpdate: render, onComplete: enablePointer });
  // the rest of the page arrives around it: the status line and the menu drop in, the thesis is written in word by
  // word, then the details and the buttons
  gsap.from([q('.status'), ...qa('.nav > *')], { y: -14, opacity: 0, duration: 0.8, stagger: 0.045, delay: 0.2, ease: 'power3.out' });
  gsap.from(q('.thesis'), { y: 22, duration: 1.1, delay: 0.45, ease: 'power3.out' });
  gsap.from(thesis, { opacity: 0, duration: 0.5, stagger: 0.05, delay: 0.45, ease: 'power1.out' });
  gsap.from(qa('.pitch-side > *'), { y: 18, opacity: 0, duration: 0.9, stagger: 0.12, delay: 0.85, ease: 'power3.out' });

  function enablePointer() {
    if (!matchMedia('(pointer: fine)').matches) return;
    let px = 0, py = 0, active = false, raf = 0;
    function frame() {
      const origin = name.getBoundingClientRect();
      const s2 = 2 * (size * 0.85) ** 2;
      let moving = false;
      chars.forEach((c, i) => {
        const dx = origin.left + rest[i].x - px, dy = origin.top + rest[i].y - py;
        const target = active && state.squeeze < 0.02 ? Math.exp(-(dx * dx + dy * dy) / s2) : 0;
        const next = pinch[i] + (target - pinch[i]) * 0.2;
        if (Math.abs(next - pinch[i]) > 0.001) moving = true;
        pinch[i] = next;
      });
      render();
      raf = moving || active ? requestAnimationFrame(frame) : 0;
    }
    const start = () => { if (!raf) raf = requestAnimationFrame(frame); };
    name.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; active = true; start(); });
    name.addEventListener('pointerleave', () => { active = false; start(); });
  }
}
