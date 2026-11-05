import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Pins a scene's stage and ties `tl` (a timeline of duration 1) to scroll position, so stopping stops it
 * and scrolling up plays it backwards. Also swaps the section's captions at the given progress ranges.
 *
 * @param {HTMLElement} section
 * @param {gsap.core.Timeline} tl   built with positions in 0..1
 * @param {{length?: number, captions?: [number, number][], poster?: number, reduced?: boolean}} opts
 *   length   scroll distance in viewport heights
 *   hold     extra timeline after 1.0 during which the last frame just stays on screen
 *   captions [start, end] progress for each caption <li>, in order
 *   poster   progress shown as the still when motion is reduced
 */
export function pinScene(section, tl, { length = 5, hold = 0, captions = [], poster = 0.85, reduced = false } = {}) {
  const stage = section.querySelector('.stage');
  const bar = section.querySelector('.progress i');
  const hint = section.querySelector('.hint');

  const items = [...section.querySelectorAll('.captions li')];
  items.forEach((li, i) => {
    const [a, b] = captions[i] ?? [0, 1];
    const fade = 0.035;
    tl.fromTo(li, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: fade, ease: 'power2.out' }, a);
    if (b < 1 + hold) tl.to(li, { autoAlpha: 0, y: -14, duration: fade, ease: 'power2.in' }, b - fade);
  });
  if (hint) tl.to(hint, { autoAlpha: 0, duration: 0.02 }, 0.015);
  tl.set({}, {}, 1 + hold); // pad to 1 (+ a hold on the last frame) so progress maps to positions

  if (reduced) {
    tl.progress(poster).pause();
    return;
  }

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => `+=${innerHeight * length}`,
    pin: stage,
    scrub: 0.6,
    animation: tl,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => { bar.style.transform = `scaleX(${self.progress})`; },
  });
}
