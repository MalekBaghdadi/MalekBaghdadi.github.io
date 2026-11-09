import '@fontsource-variable/anybody/wdth.css';
import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-500.css';
import '@fontsource/atkinson-hyperlegible-next/latin-700.css';
import 'lenis/dist/lenis.css';
import './style.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initHero } from './hero.js';
import { initNeatInk } from './scenes/neatink.js';
import { initPigeon } from './scenes/pigeon.js';
import { initLogbook } from './scenes/logbook.js';
import { initSections } from './sections.js';
import { initAutoScroll } from './autoscroll.js';
import { initGame } from './game.js';
import { initEggs } from './eggs.js';
import { initHunt } from './hunt.js';
import { initVisitor } from './birds.js';
import { still } from './ambient.js';

gsap.registerPlugin(ScrollTrigger);
// Keep moving layers in 3D: GSAP otherwise drops a finished transform back to 2D, which repaints the big device layers mid-scroll.
gsap.config({ force3D: true });

// Motion is on unless the visitor turns it off with the page's own button. The OS "reduce motion" flag is not used:
// on Windows it is often switched off without anyone meaning it, and the scroll animations are the demos themselves,
// moving only while the visitor scrolls.
const saved = (() => { try { return localStorage.getItem('motion'); } catch { return null; } })();
const reduced = saved === 'off';
document.documentElement.classList.toggle('reduced', reduced);
document.documentElement.classList.toggle('still', still); // ?still: ambient loops frozen, for the screenshot checks

const toggle = document.querySelector('.motion-toggle');
toggle.setAttribute('aria-pressed', String(reduced));
toggle.addEventListener('click', () => {
  try { localStorage.setItem('motion', reduced ? 'on' : 'off'); } catch { /* storage blocked: the switch can't stick */ }
  location.reload();
});

let lenis = null;
if (!reduced) {
  // Smooth, weighted scrolling for wheel and trackpad (touch keeps the phone's native scrolling), driven by GSAP's clock.
  lenis = new Lenis({ lerp: 0.11, anchors: true, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// The footer's small print is built first: it is part of the page's height, which the pins below are measured against.
const smallPrint = initHunt({ reduced });
initVisitor({ reduced, lenis, box: smallPrint });
initHero({ reduced });
// Pinned sections are created in page order so ScrollTrigger measures each pin spacer after the one above it.
initNeatInk(document.getElementById('neatink'), { reduced });
initPigeon(document.getElementById('pigeon'), { reduced });
initLogbook(document.getElementById('logbook'), { reduced });
initSections({ reduced });
initAutoScroll({ lenis, reduced });
initGame({ lenis, reduced }); // with motion off too: the game only runs when it is asked for
initEggs({ reduced });

// Fonts and frame images change layout; re-measure once everything has settled.
addEventListener('load', () => ScrollTrigger.refresh());
