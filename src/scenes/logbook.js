import './logbook.css';
import { gsap } from 'gsap';
import manifest from './logbook-manifest.json';
import { pinScene } from '../scene.js';

// What each stretch of the capture shows (marks are where the recording reached each screen), in the app's own words.
const CHAPTERS = [
  { from: 'today', title: 'Log the day', note: 'Quick-add buttons fill each target' },
  { from: 'history', title: 'See the streak build', note: 'A month of days at a glance' },
  { from: 'compete', title: 'Race a friend', note: 'Weekly head-to-head on any habit' },
  { from: 'profile', title: 'Collect cards', note: 'Unlocked from your own history' },
];

export function initLogbook(section, { reduced }) {
  const mount = section.querySelector('[data-device]');
  const { w, h, duration, marks, frames } = manifest;
  mount.innerHTML = `
    <div class="lb-phone"><canvas width="${w}" height="${h}" aria-hidden="true"></canvas></div>
    <ol class="lb-chapters" aria-hidden="true">${CHAPTERS.map((c) => `<li><i class="on-dot"></i><b>${c.title}</b><span>${c.note}</span></li>`).join('')}</ol>`;
  const canvas = mount.querySelector('canvas');
  const ctx = canvas.getContext('2d');

  // Frames load lazily, nearest-first would be nicer but in order is simple and the first one lands immediately.
  const imgs = new Array(frames.length).fill(null);
  let loadStarted = false;
  let want = 0; // last time drawn, so a frame that arrives late repaints
  const BASE = import.meta.env.BASE_URL + 'logbook/';
  function load() {
    if (loadStarted) return;
    loadStarted = true;
    let next = 0;
    const worker = async () => {
      while (next < frames.length) {
        const i = next++;
        const img = new Image();
        img.src = window.__FRAMES?.[frames[i].f] ?? BASE + frames[i].f; // single-file preview embeds the frames (tools/make-preview.mjs)
        try { await img.decode(); imgs[i] = img; if (i === 0 || Math.abs(i - lastIndex) < 3) draw(want); } catch { /* a missing frame falls back to its neighbour */ }
      }
    };
    for (let k = 0; k < 6; k++) worker();
  }
  new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) load(); }, { rootMargin: '200% 0px' }).observe(section);

  // The newest loaded frame at or before index i (frames that failed or haven't arrived fall back to an earlier one).
  const loaded = (i) => { for (let k = Math.min(i, frames.length - 1); k >= 0; k--) if (imgs[k]) return k; return -1; };
  let lastIndex = 0;
  function draw(T) {
    want = T;
    let lo = 0, hi = frames.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (frames[mid].t <= T) lo = mid; else hi = mid - 1; }
    lastIndex = lo;
    const a = loaded(lo), b = loaded(Math.min(lo + 1, frames.length - 1));
    if (a < 0) return;
    ctx.globalAlpha = 1;
    ctx.drawImage(imgs[a], 0, 0, w, h);
    // Blend into the next frame over its last 100 ms, so ~10 fps footage still reads as smooth motion on a slow scrub.
    const next = frames[lo + 1];
    if (next && b > a) {
      const f = Math.max(0, Math.min(1, 1 - (next.t - T) / 100));
      if (f > 0) { ctx.globalAlpha = f; ctx.drawImage(imgs[b], 0, 0, w, h); ctx.globalAlpha = 1; }
    }
  }

  const tl = gsap.timeline({ defaults: { ease: 'none', immediateRender: false } });
  const clock = { t: 0 };
  tl.fromTo(clock, { t: 0 }, { t: duration, duration: 1, onUpdate: () => draw(clock.t) }, 0);
  tl.eventCallback('onUpdate', () => draw(clock.t));

  // The chapter marker follows the recording's marks.
  const dots = [...mount.querySelectorAll('.on-dot')];
  const rows = [...mount.querySelectorAll('.lb-chapters li')];
  gsap.set(dots, { opacity: 0 });
  gsap.set(rows, { opacity: 0.45 });
  CHAPTERS.forEach((c, i) => {
    const a = marks[c.from] / duration;
    const b = i + 1 < CHAPTERS.length ? marks[CHAPTERS[i + 1].from] / duration : 1.03;
    const fade = 0.012;
    tl.fromTo(dots[i], { opacity: 0 }, { opacity: 1, duration: fade }, Math.max(0, a - fade));
    tl.fromTo(rows[i], { opacity: 0.45 }, { opacity: 1, duration: fade }, Math.max(0, a - fade));
    if (i + 1 < CHAPTERS.length) {
      tl.fromTo(dots[i], { opacity: 1 }, { opacity: 0, duration: fade }, b - fade);
      tl.fromTo(rows[i], { opacity: 1 }, { opacity: 0.45, duration: fade }, b - fade);
    }
  });

  if (reduced) load(); // the still needs its frame without waiting to scroll near
  pinScene(section, tl, { length: 8, hold: 0.03, captions: [[0, 0.3], [0.3, 1.03]], poster: 0.5, reduced });
}
