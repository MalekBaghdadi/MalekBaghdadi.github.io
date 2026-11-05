import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitWords } from './split.js';

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

  // Each letter's width comes from three inputs, combined in one place so they never fight:
  // the load intro (0..1), the scroll squeeze (shared, 0..1, staggered left to right) and the pointer pinch (0..1).
  const intro = chars.map(() => ({ v: reduced ? 1 : 0 }));
  const pinch = chars.map(() => 0);
  const state = { squeeze: 0 };
  function render() {
    chars.forEach((c, i) => {
      const s = Math.max(0, Math.min(1, state.squeeze * 1.6 - (i / (n - 1)) * 0.6));
      const base = WIDE - (WIDE - SQUEEZE) * s;
      let w = NARROW + (base - NARROW) * intro[i].v;
      if (w > PINCH) w -= (w - PINCH) * pinch[i];
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
    size = Math.min(((100 * name.clientWidth) / widest) * 0.995, (innerHeight * 0.42) / (lines.length * 0.88));
    name.style.setProperty('--name-size', `${size}px`);
    rest = chars.map((c) => ({ x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop + c.offsetHeight / 2 }));
    render();
  }

  // Beirut's time, the one live detail in the status line.
  const clock = q('.clock time');
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Beirut' });
  const tick = () => { clock.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 20_000);

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

  fit();
  document.fonts.load('800 100px "Anybody Variable"').then(() => { fit(); ScrollTrigger.refresh(); });
  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { fit(); ScrollTrigger.refresh(); }, 150); });

  // ---- the scroll sequence (positions 0..1) ----
  const tl = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } });
  // a highlighter runs under the thesis, word by word
  tl.fromTo(thesis, { backgroundSize: '0% 38%' }, { backgroundSize: '100% 38%', duration: 0.02, stagger: { amount: 0.16 }, immediateRender: true }, 0.02);
  // the signal drops, strongest bar first
  [...bars].reverse().forEach((b, i) => tl.fromTo(b, { opacity: 1, scaleY: 1 }, { opacity: 0.18, scaleY: 0.4, transformOrigin: '50% 100%', duration: 0.03 }, 0.06 + i * 0.05));
  tl.fromTo(labelA, { opacity: 1 }, { opacity: 0, duration: 0.02 }, 0.25);
  tl.fromTo(n2, { opacity: 0 }, { opacity: 1, duration: 0.02 }, 0.25);
  // the name squeezes and lifts away; the pitch goes with it
  tl.fromTo(state, { squeeze: 0 }, { squeeze: 1, duration: 0.36, onUpdate: render }, 0.04);
  tl.fromTo(name, { y: 0, opacity: 1 }, { y: () => -innerHeight * 0.12, opacity: 0, duration: 0.18, ease: 'power1.in' }, 0.26);
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
  // offline, and their screens light up anyway
  tl.fromTo(shades, { opacity: 0.62 }, { opacity: 0, duration: 0.06, stagger: 0.025, immediateRender: true }, 0.5);
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
  tl.fromTo([top, line], { opacity: 1, y: 0 }, { opacity: 0.3, y: -30, duration: over, ease: 'power1.in' }, 1 - over);
  tl.set({}, {}, 1);
  tl.eventCallback('onUpdate', render);
  ScrollTrigger.addEventListener('refresh', render); // refresh renders the timeline to its end and back with events muted

  if (reduced) {
    tl.time(0).pause();
    gsap.set([n0], { opacity: 0 });
    gsap.set([n1], { opacity: 1 });
    gsap.set(shades, { opacity: 0 }); // the still shows the screens lit
    return;
  }

  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: () => `+=${innerHeight * LEN}`,
    pin: stage,
    scrub: 0.4,
    animation: tl,
    anticipatePin: 1,
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
