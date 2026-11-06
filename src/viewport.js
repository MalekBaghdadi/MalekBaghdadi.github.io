// One screen of scroll, in pixels, that does not change while a phone scrolls.
//
// On phones the address bar hides and shows as you scroll, and every time it does the window's innerHeight changes by
// 50 to 100px. The pinned scenes are many screens long (NeatInk is eleven), so measuring them in innerHeight made the
// page grow or shrink by up to two thousand pixels under the visitor's finger: the "jump between sections". This is
// the small viewport instead (100svh, the height with the bars showing): it is what the stages are sized to in CSS and
// what each chapter overlaps the last by, and it stays put while the bars come and go. On a desktop it is simply the
// window height. It is re-read whenever ScrollTrigger refreshes (a real resize, fonts, load), never in between.
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const probe = document.createElement('div');
probe.setAttribute('aria-hidden', 'true');
probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
document.body.append(probe);

let h = 0;
const measure = () => { h = probe.getBoundingClientRect().height || innerHeight; };
measure();
ScrollTrigger.addEventListener('refreshInit', measure);

/** The height of one screen of scroll, stable while a phone's address bar comes and goes. */
export const vh = () => h;

/**
 * How far ahead a pin engages. With the wheel, Lenis scrolls on the page's own clock and the pins follow in the same
 * frame, so there is nothing to anticipate (anticipating made a fast wheel skip the last stretch of each chapter's
 * slide). A finger scrolls natively, a frame ahead of the page: one frame's worth (about 16ms) of anticipation hides
 * that without the visible skip that a full 45ms gave on a quick flick.
 */
export const anticipatePin = () => (matchMedia('(hover: none), (pointer: coarse)').matches ? 0.35 : 0);
