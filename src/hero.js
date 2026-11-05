import { gsap } from 'gsap';

const WIDE = 150; // Anybody's widest width axis; the name rests here and fills the line
const NARROW = 50;
const PINCH = 104; // how narrow letters get under the pointer; lower than this the heavy weight fuses neighbours

// The hero's one orchestrated moment: the name opens from condensed to wide, then a pointer pinches nearby letters.
export function initHero({ reduced }) {
  const name = document.querySelector('.name');
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

  let rest = [];
  let size = 100;
  const setStretch = (el, v) => { el.style.fontStretch = `${v}%`; };

  // Size the type so the widest line, at full width, fills the column (and never swallows the screen height).
  function fit() {
    chars.forEach((c) => setStretch(c, WIDE));
    name.style.setProperty('--name-size', '100px');
    const widest = Math.max(...lines.map((l) => l.lastElementChild.getBoundingClientRect().right - l.firstElementChild.getBoundingClientRect().left));
    size = Math.min((100 * name.clientWidth) / widest * 0.995, (innerHeight * 0.6) / (lines.length * 0.88));
    name.style.setProperty('--name-size', `${size}px`);
    const origin = name.getBoundingClientRect();
    rest = chars.map((c) => {
      const r = c.getBoundingClientRect();
      return { x: r.left - origin.left + r.width / 2, y: r.top - origin.top + r.height / 2 };
    });
  }

  document.fonts.load('800 100px "Anybody Variable"').finally(() => {
    fit();
    let resizeTimer;
    addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fit, 120); });
    if (reduced) return;

    chars.forEach((c) => setStretch(c, NARROW));
    gsap.from('.pitch', { opacity: 0, y: 14, duration: 0.9, delay: 0.55, ease: 'power2.out' });
    gsap.to(chars, {
      fontStretch: `${WIDE}%`,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.05,
      onComplete: enablePointer,
    });
  });

  function enablePointer() {
    if (!matchMedia('(pointer: fine)').matches) return;
    const cur = chars.map(() => WIDE);
    let px = 0, py = 0, active = false, raf = 0;
    const sigma = () => size * 0.85;

    function frame() {
      const origin = name.getBoundingClientRect();
      const s2 = 2 * sigma() ** 2;
      let moving = false;
      chars.forEach((c, i) => {
        const dx = origin.left + rest[i].x - px;
        const dy = origin.top + rest[i].y - py;
        const target = active ? WIDE - (WIDE - PINCH) * Math.exp(-(dx * dx + dy * dy) / s2) : WIDE;
        const next = cur[i] + (target - cur[i]) * 0.2;
        if (Math.abs(next - cur[i]) > 0.05) moving = true;
        cur[i] = next;
        setStretch(c, next.toFixed(1));
      });
      raf = moving || active ? requestAnimationFrame(frame) : 0;
    }
    const start = () => { if (!raf) raf = requestAnimationFrame(frame); };

    name.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; active = true; start(); });
    name.addEventListener('pointerleave', () => { active = false; start(); });
  }
}
