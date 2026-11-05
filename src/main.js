import '@fontsource-variable/anybody/wdth.css';
import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-500.css';
import '@fontsource/atkinson-hyperlegible-next/latin-700.css';
import './style.css';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initHero } from './hero.js';
import { initNeatInk } from './scenes/neatink.js';
import { initPigeon } from './scenes/pigeon.js';
import { initLogbook } from './scenes/logbook.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.toggle('reduced', reduced);

initHero({ reduced });
// Scenes are created in page order so ScrollTrigger measures each pin spacer after the one above it.
initNeatInk(document.getElementById('neatink'), { reduced });
initPigeon(document.getElementById('pigeon'), { reduced });
initLogbook(document.getElementById('logbook'), { reduced });

// Fonts and frame images change layout; re-measure once everything has settled.
addEventListener('load', () => ScrollTrigger.refresh());
