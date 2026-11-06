import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitChars, splitWords } from './split.js';
import { vh, anticipatePin } from './viewport.js';

gsap.registerPlugin(ScrollTrigger);


/**
 * Pins a scene's stage and ties `tl` to scroll position, so stopping stops it and scrolling up plays it backwards.
 * Around the scene's own beats it adds the shared moves: the device stands up out of the page as the scene arrives,
 * the title opens to full width, caption words light up as you read down the scroll, and over the last screen the
 * next chapter slides up over this one like a card while this stage is pushed back and dimmed.
 *
 * @param {HTMLElement} section
 * @param {gsap.core.Timeline} tl   the scene's beats, positioned in 0..1
 * @param {{length?: number, hold?: number, captions?: [number, number][], poster?: number, reduced?: boolean, stacked?: boolean, glass?: Element}} opts
 *   length   scroll distance in viewport heights
 *   hold     extra timeline after 1.0 during which the last frame just stays on screen
 *   captions [start, end] timeline positions for each caption <li>, in order
 *   poster   timeline position shown as the still when motion is off
 *   stacked  the next section overlaps this one's last screen (CSS margin-top: -100svh) and slides over it
 *   glass    the device's screen (positioned, clipping): a light runs across it as the device stands up
 */
export function pinScene(section, tl, { length = 5, hold = 0, captions = [], poster = 0.85, reduced = false, stacked = false, glass } = {}) {
  const stage = section.querySelector('.stage');
  const bar = section.querySelector('.progress i');
  const hint = section.querySelector('.hint');
  const device = section.querySelector('[data-device]');
  const copy = section.querySelector('.copy');
  const chrome = [...section.querySelectorAll('.note, .progress')];
  const title = splitChars(section.querySelector('.copy h2'));
  const items = [...section.querySelectorAll('.captions li')];
  const words = items.map((li) => splitWords(li));

  tl.fromTo(device, { rotateX: 26, yPercent: 14, scale: 0.9, transformPerspective: 1800, transformOrigin: '50% 100%' },
    { rotateX: 0, yPercent: 0, scale: 1, duration: 0.05, ease: 'power2.out', immediateRender: true }, 0);
  tl.fromTo(title, { fontStretch: '55%' }, { fontStretch: '125%', duration: 0.04, stagger: 0.004, ease: 'power2.out', immediateRender: true }, 0);
  const note = section.querySelector('.note');
  if (note) tl.fromTo(note, { opacity: 0 }, { opacity: 1, duration: 0.02, immediateRender: true }, 0.04); // only once the device stands upright
  if (glass) { // the room's light catches the glass as it comes upright (the hero's devices do the same)
    const glare = glass.appendChild(Object.assign(document.createElement('i'), { className: 'glare' }));
    tl.fromTo(glare, { xPercent: -36 }, { xPercent: 36, duration: 0.06, ease: 'power1.inOut', immediateRender: true }, 0.012);
  }

  items.forEach((li, i) => {
    const [a, b] = captions[i] ?? [0, 1];
    const fade = 0.035;
    tl.fromTo(li, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: fade, ease: 'power2.out', immediateRender: i === 0 }, a);
    tl.fromTo(words[i], { opacity: 0.32 }, { opacity: 1, duration: 0.008, stagger: { amount: Math.min(0.14, (b - a) * 0.45) }, immediateRender: true }, a + 0.01);
    if (b < 1 + hold) tl.to(li, { autoAlpha: 0, y: -14, duration: fade, ease: 'power2.in' }, b - fade);
  });
  if (hint) tl.to(hint, { autoAlpha: 0, duration: 0.02 }, 0.015);

  // The last screen of scroll is the next section sliding over this one; that stretch of timeline is `over` long.
  const end = 1 + hold;
  const over = stacked ? end / (length - 1) : 0;
  if (stacked) {
    const dim = document.createElement('i');
    dim.className = 'dim';
    stage.append(dim);
    tl.fromTo(dim, { opacity: 0 }, { opacity: 0.6, duration: over, ease: 'power1.in' }, end);
    // pushed back, the device also lies down a little, as the hero's do: it goes back into the page it stood up from
    tl.fromTo(section.querySelector('.device-wrap'), { scale: 1, rotateX: 0 }, { scale: 0.9, rotateX: 12, transformPerspective: 1600, transformOrigin: '50% 80%', duration: over, ease: 'power1.in' }, end);
    tl.fromTo([copy, ...chrome], { opacity: 1, y: 0 }, { opacity: 0.25, y: -30, duration: over, ease: 'power1.in' }, end);
  }
  tl.set({}, {}, end + over); // pad so progress maps onto the whole scene

  if (reduced) {
    tl.time(poster).pause();
    gsap.set([...items, ...words.flat()], { clearProps: 'opacity,visibility,transform' }); // nothing moves, so every caption just shows
    return;
  }

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => `+=${vh() * length}`,
    pin: stage,
    scrub: 0.4,
    animation: tl,
    anticipatePin: anticipatePin(),
    invalidateOnRefresh: true,
    onUpdate: (self) => { bar.style.transform = `scaleX(${self.progress})`; },
  });
}
