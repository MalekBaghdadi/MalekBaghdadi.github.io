// Things to do with the hero, beyond scrolling it.
//
//   rubber letters   take hold of a letter of the name with a mouse or a pen and pull: it stretches away from its place,
//                    its neighbours dragged along after it, and snaps back with a wobble when let go. (A click without
//                    a pull is still a hop, eggs.js.) A finger is left alone: on a touch screen a drag is a scroll.
//   leaning devices  the three devices drift a little after the mouse, the phones more than the tablet, so the trio
//                    has depth. They move on the `translate` property, through two CSS variables the float animation
//                    reads too (style.css), so nothing here touches the transform the scroll owns.
import { gsap } from 'gsap';
import { found } from './hunt.js';

export function initHeroPlay({ hero, name, chars, trio, squeezed, reduced }) {
  if (reduced) return;
  rubber(name, chars, squeezed);
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) lean(hero, trio);
}

function rubber(name, chars, squeezed) {
  const off = chars.map(() => ({ x: 0, y: 0 }));
  let grab = null, dragged = false;
  const draw = () => chars.forEach((c, i) => {
    const o = off[i], on = Math.abs(o.x) + Math.abs(o.y) > 0.05;
    c.style.translate = on ? `${o.x.toFixed(1)}px ${o.y.toFixed(1)}px` : '';
    c.style.rotate = on ? `${(o.x * 0.05).toFixed(2)}deg` : '';
  });

  name.addEventListener('pointerdown', (e) => {
    const i = chars.indexOf(e.target.closest?.('.ch'));
    if (i < 0 || e.pointerType === 'touch' || e.button > 0 || squeezed()) return;
    const at = chars.map((c) => { const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    const reach = parseFloat(getComputedStyle(name).fontSize) * 0.95;
    // how much of the pull each letter takes: all of it for the one held, less with distance
    const give = at.map(([x, y]) => Math.exp(-(((x - at[i][0]) ** 2 + (y - at[i][1]) ** 2) / reach ** 2)));
    grab = { id: e.pointerId, x: e.clientX, y: e.clientY, give, reach, far: 0, moved: false };
  });
  name.addEventListener('pointermove', (e) => {
    if (!grab || e.pointerId !== grab.id) return;
    const dx = e.clientX - grab.x, dy = e.clientY - grab.y, d = Math.hypot(dx, dy);
    if (!grab.moved) {
      if (d < 6) return;
      grab.moved = true;
      name.setPointerCapture?.(e.pointerId);
      name.classList.add('pulling');
      gsap.killTweensOf(off);
      for (const c of chars) c.classList.remove('hop');
    }
    grab.far = Math.max(grab.far, d);
    const k = 1 / (1 + d / (grab.reach * 2.4)); // rubber: the further it is pulled, the harder it pulls back
    off.forEach((o, j) => { o.x = dx * k * grab.give[j]; o.y = dy * k * grab.give[j]; });
    draw();
  });
  const letGo = (e) => {
    if (!grab || e.pointerId !== grab.id) return;
    const g = grab;
    grab = null;
    if (!g.moved) return;
    name.classList.remove('pulling');
    dragged = true; // the click that follows a pull is not a hop
    setTimeout(() => { dragged = false; }, 0);
    off.forEach((o, j) => gsap.to(o, { x: 0, y: 0, duration: 1.1, delay: (1 - g.give[j]) * 0.09, ease: 'elastic.out(1.1, 0.3)', onUpdate: draw }));
    if (g.far > 60) found('rubber', '<b>Rubber letters.</b> Pull as hard as you like, they know where they live.');
  };
  name.addEventListener('pointerup', letGo);
  name.addEventListener('pointercancel', letGo);
  name.addEventListener('click', (e) => { if (dragged) e.stopPropagation(); }, true);
}

function lean(hero, trio) {
  const DEPTH = [9, 20, 20]; // the tablet, then the two phones in front of it: pixels at the edge of the screen
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
  function frame() {
    x += (tx - x) * 0.1;
    y += (ty - y) * 0.1;
    trio.forEach((d, i) => {
      d.style.setProperty('--px', `${(x * DEPTH[i]).toFixed(2)}px`);
      d.style.setProperty('--py', `${(y * DEPTH[i] * 0.5).toFixed(2)}px`);
    });
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(frame) : 0;
  }
  const go = () => { if (!raf) raf = requestAnimationFrame(frame); };
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tx = (e.clientX / innerWidth) * 2 - 1;
    ty = (e.clientY / innerHeight) * 2 - 1;
    go();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { tx = ty = 0; go(); });
}
