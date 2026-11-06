import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const PACE = 0.18; // screens per second at 1×: about three and a half minutes for the whole site
// The speed slider runs from a quarter of that pace to four times it. It is logarithmic with 1× in the middle, so every
// step along the track changes the speed by the same ratio: a quarter of the track doubles or halves it.
const MIN = 0.25;
const MAX = 4;
const SPAN = Math.log2(MAX / MIN);
const STEP = 1 / 16; // one arrow key press: a sixteenth of the track (×1.19)
const EASE = 0.25; // seconds for the scroll to ease into a new speed, and to get going after a start
const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
const STORE = 'autoscroll-speed';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const toTrack = (speed) => Math.log2(speed / MIN) / SPAN; // speed -> 0..1 up the track
const toSpeed = (t) => MIN * 2 ** (clamp(t, 0, 1) * SPAN); // 0..1 up the track -> speed
const format = (speed) => `${Number(speed.toPrecision(2))}×`;
// The frame's own timestamp (the one requestAnimationFrame gets), not the time this code happens to run: on a busy
// phone the two drift apart by several milliseconds from frame to frame, and the steps would drift with them.
const frameTime = () => document.timeline?.currentTime ?? performance.now();

/**
 * A slow, steady scroll through the whole site for visitors who would rather watch than scroll. While it plays, a
 * slider above the button sets the speed (up is faster). Any scrolling of their own (wheel, touch, scroll keys, dragging
 * the scrollbar, following a link) hands control straight back. Needs the Lenis instance (motion on); with motion off
 * the button stays hidden.
 *
 * Smoothness, phones especially: the page is scrolled natively once per frame, first thing in GSAP's tick, so the
 * pinned and scrubbed animations follow it in that same frame. Browsers scroll in whole pixels, so the steps can only be
 * even (2, 3, 2, 3 px) if the timing is: hence the frame timestamp. Lenis is left to follow along as it does for touch
 * scrolling; scrolling through it every frame made it flip its classes on <html> (a style recalc) twice a frame.
 */
export function initAutoScroll({ lenis, reduced }) {
  const dock = document.querySelector('.autoplay-dock');
  const btn = dock?.querySelector('.autoplay');
  if (!btn || reduced || !lenis) return;
  btn.hidden = false;
  const label = btn.querySelector('.autoplay-label');
  const slider = dock.querySelector('.autoplay-speed');
  const readout = slider.querySelector('.autoplay-speed-value');
  const track = slider.querySelector('.autoplay-speed-track');

  let playing = false;
  let speed = 1; // set on the slider, in multiples of PACE
  let pace = 0; // the speed actually scrolled at, easing toward `speed`
  let pos = 0; // where the page should be, in fractional pixels
  let at = 0; // where it is: the browser rounds to whole pixels
  let last = 0; // the previous frame's timestamp
  let vh = innerHeight;
  addEventListener('resize', () => { vh = innerHeight; });

  const atEnd = () => scrollY >= lenis.limit - 2;
  const setLabel = () => { label.textContent = playing ? 'Pause' : atEnd() ? 'Watch again' : 'Auto-scroll'; };

  function tick() {
    const now = frameTime();
    // Capped: a hidden tab or a long frame must not jump the page ahead. Never negative: the click that starts it can
    // be timed after the start of the frame that follows it.
    const dt = clamp(now - last, 0, 50) / 1000;
    last = now;
    // Something other than us moved the page (the scrollbar, find in page): the visitor has taken over.
    if (Math.abs(scrollY - at) > 3) return stop();
    pace += (speed - pace) * (1 - Math.exp(-dt / EASE));
    const limit = lenis.limit;
    pos = Math.min(limit, pos + vh * PACE * pace * dt);
    scrollTo({ top: pos, behavior: 'instant' });
    if (scrollY !== at) {
      at = scrollY;
      ScrollTrigger.update();
    }
    if (pos >= limit) stop();
  }
  function start() {
    // At the end, start over from the top. Anywhere else, stop a wheel glide that is still running and go on from here.
    lenis.scrollTo(atEnd() ? 0 : scrollY, { immediate: true, force: true });
    pos = at = scrollY;
    pace = 0;
    last = frameTime();
    playing = true;
    dock.dataset.playing = '';
    setLabel();
    gsap.ticker.add(tick, false, true); // first in the tick, ahead of the animations that follow the scroll
  }
  function stop() {
    playing = false;
    delete dock.dataset.playing;
    gsap.ticker.remove(tick);
    setLabel();
    if (document.activeElement === slider) btn.focus({ preventScroll: true }); // the slider hides; keep focus close by
  }
  // A layout refresh (a resize, a font arriving) may move the page under us: carry on from wherever it put us.
  ScrollTrigger.addEventListener('refresh', () => { if (playing) pos = at = scrollY; });

  btn.addEventListener('click', () => (playing ? stop() : start()));
  const takeOver = () => { if (playing) stop(); };
  addEventListener('wheel', (e) => { if (!slider.contains(e.target)) takeOver(); }, { passive: true });
  // Touches on the controls are not the visitor taking over: on phones the touch on Pause used to stop it, and the
  // click that followed started it again.
  addEventListener('touchstart', (e) => { if (!dock.contains(e.target)) takeOver(); }, { passive: true });
  addEventListener('keydown', (e) => { if (!dock.contains(e.target) && SCROLL_KEYS.includes(e.key)) takeOver(); });
  document.addEventListener('pointerdown', (e) => { if (e.target.closest('a')) takeOver(); });
  lenis.on('scroll', () => { if (!playing) setLabel(); });

  // ---- the speed slider ----
  function setSpeed(next, save) {
    speed = clamp(next, MIN, MAX);
    const text = format(speed);
    slider.style.setProperty('--p', toTrack(speed).toFixed(4));
    readout.textContent = text;
    slider.setAttribute('aria-valuenow', String(Number(speed.toFixed(2))));
    slider.setAttribute('aria-valuetext', `${text} speed`);
    if (save) {
      try { localStorage.setItem(STORE, String(speed)); } catch { /* storage blocked: the speed just won't stick */ }
    }
  }
  const saved = (() => { try { return Number(localStorage.getItem(STORE)); } catch { return NaN; } })();
  setSpeed(saved > 0 ? saved : 1, false);

  // Dragging: grabbing the thumb keeps it under the finger; pressing anywhere else on the slider jumps it there.
  let drag = null;
  function dragTo(y) {
    let t = 1 - (y - drag.grab - drag.top) / drag.height;
    if (Math.abs(t - 0.5) < 0.03) t = 0.5; // a little catch at 1×, so it is easy to get back to
    setSpeed(toSpeed(t), false);
  }
  slider.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button > 0) return;
    const r = track.getBoundingClientRect();
    const thumb = r.bottom - toTrack(speed) * r.height;
    drag = { id: e.pointerId, top: r.top, height: r.height, grab: Math.abs(e.clientY - thumb) <= 18 ? e.clientY - thumb : 0 };
    try { slider.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
    slider.dataset.dragging = '';
    dragTo(e.clientY);
  });
  slider.addEventListener('pointermove', (e) => { if (drag?.id === e.pointerId) dragTo(e.clientY); });
  const release = (e) => {
    if (drag?.id !== e.pointerId) return;
    drag = null;
    delete slider.dataset.dragging;
    setSpeed(speed, true);
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) slider.addEventListener(type, release);

  // Keys move the slider (never the page): arrows by a step, Page Up/Down by a doubling, Home/End to the ends.
  slider.addEventListener('keydown', (e) => {
    const t = Math.round(toTrack(speed) / STEP) * STEP;
    const next = { ArrowUp: t + STEP, ArrowRight: t + STEP, ArrowDown: t - STEP, ArrowLeft: t - STEP,
      PageUp: t + 4 * STEP, PageDown: t - 4 * STEP, Home: 0, End: 1 }[e.key];
    if (next === undefined && e.key !== ' ') return;
    e.preventDefault();
    if (next !== undefined) setSpeed(toSpeed(next), true);
  });

  // The wheel over the slider turns the speed (up is faster) instead of scrolling the page.
  let wheelSave;
  slider.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; // pinch or ctrl+wheel: the page zooms as usual
    e.preventDefault();
    const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1);
    setSpeed(toSpeed(toTrack(speed) - px / 1200), false);
    clearTimeout(wheelSave);
    wheelSave = setTimeout(() => setSpeed(speed, true), 400);
  }, { passive: false });
}
