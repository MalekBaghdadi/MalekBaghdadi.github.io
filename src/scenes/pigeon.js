// PLACEHOLDER: proves the pin + scrub + reverse framework; replaced by the real scene.
import { gsap } from 'gsap';
import { pinScene } from '../scene.js';

export function initPigeon(section, { reduced }) {
  const dev = section.querySelector('[data-device]');
  dev.style.cssText = 'aspect-ratio:16/10;max-width:900px;background:#fffbff;border-radius:18px;position:relative';
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;left:0;top:40%;width:60px;height:60px;background:#4b57a9';
  dev.append(box);
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  tl.to(box, { x: 600, duration: 1 }, 0);
  pinScene(section, tl, { captions: [[0, 0.5], [0.5, 1]], reduced });
}
