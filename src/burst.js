// A small flourish shared by the things a visitor can press: a burst of pixels. A handful of fixed-position elements
// moved by the Web Animations API and removed when done; nothing is kept.

/** A burst of square pixels out of the point (x, y) on the screen, falling as they go. */
export function burst(x, y, colors, n = 8, px = 4) {
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i');
    el.className = 'px-bit';
    el.style.cssText = `left:${x - px / 2}px;top:${y - px / 2}px;width:${px}px;height:${px}px;background:${colors[i % colors.length]}`;
    document.body.append(el);
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.7, d = 22 + Math.random() * 30;
    const dx = Math.cos(a) * d, dy = Math.sin(a) * d - 14;
    el.animate([
      { transform: 'translate(0, 0)', opacity: 1 },
      { transform: `translate(${dx * 0.8}px, ${dy * 0.8}px)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy + 26}px)`, opacity: 0 },
    ], { duration: 520 + Math.random() * 180, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' }).onfinish = () => el.remove();
  }
}
