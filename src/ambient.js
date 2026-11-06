// Ambient life: small loops that keep a scene alive while it is on screen, even when the visitor stops scrolling
// (flames flicker, sirens blink, stars twinkle, a signal pulses). Everything else on the page follows the scroll; these
// are the exceptions, so they stay small, run only while their section is in view, never with motion off, and `?still`
// in the address freezes them for the screenshot checks (tools/shoot.mjs compares frames; a flicker would spoil that).
//
// In CSS an ambient element has the class `amb` and its animation written in longhands (never the `animation`
// shorthand, which would reset the play state): style.css keeps it paused unless an ancestor is `.is-live`.

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { vh } from './viewport.js';

export const still = new URLSearchParams(location.search).has('still');

/**
 * Toggles `is-live` on a pinned scene section while it can be seen: from its top coming up over the previous chapter
 * until the end of its own pin, when the next chapter has slid over it completely. (An IntersectionObserver would
 * keep it live underneath the next chapter, and any running animation costs a style pass on every scrolled frame.)
 * `screens` is the scene's pin length; `onChange(live)` hears about it too (for canvas loops).
 */
export function liveWhileVisible(section, screens, onChange) {
  const set = (live) => { section.classList.toggle('is-live', live); onChange?.(live); };
  ScrollTrigger.create({ trigger: section, start: 'top bottom', end: () => `+=${vh() * (screens + 1)}`, onToggle: (self) => set(self.isActive) });
}

/**
 * Keeps a backdrop in `wide` on wide screens and in `narrow` on phones: full-bleed behind the whole stage where there is
 * room around the device, inside the device's frame where the device fills the screen. `onMove` runs after each move.
 */
export function placeBackdrop(el, wide, narrow, onMove) {
  const mq = matchMedia('(max-width: 820px)');
  const put = () => {
    const parent = mq.matches ? narrow : wide;
    if (el.parentElement !== parent) parent.prepend(el);
    onMove?.(mq.matches);
  };
  mq.addEventListener('change', put);
  put();
}

/** A small seeded random, so generated art (skyline, stars, streaks) is the same on every visit. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
