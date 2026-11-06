import { gsap } from 'gsap';

const PACE = 0.18; // screens per second: about three and a half minutes for the whole site
const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];

/**
 * A slow, steady scroll through the whole site for visitors who would rather watch than scroll. Any scrolling of their
 * own (wheel, touch, scroll keys, dragging the scrollbar, following a link) hands control straight back.
 * Needs the Lenis instance (motion on); with motion off the button stays hidden.
 */
export function initAutoScroll({ lenis, reduced }) {
  const btn = document.querySelector('.autoplay');
  if (!btn || reduced || !lenis) return;
  btn.hidden = false;
  const label = btn.querySelector('.autoplay-label');
  let playing = false;
  let y = 0;

  const atEnd = () => lenis.scroll >= lenis.limit - 2;
  const setLabel = () => { label.textContent = playing ? 'Pause' : atEnd() ? 'Watch again' : 'Auto-scroll'; };

  function tick(time, deltaTime) {
    // Something other than us moved the page (the scrollbar, find in page): the visitor has taken over.
    if (Math.abs(lenis.scroll - y) > 4) return stop();
    y = Math.min(lenis.limit, y + (innerHeight * PACE * Math.min(deltaTime, 50)) / 1000); // capped: a hidden tab must not jump ahead
    lenis.scrollTo(y, { immediate: true, force: true });
    if (y >= lenis.limit) stop();
  }
  function start() {
    if (atEnd()) lenis.scrollTo(0, { immediate: true, force: true });
    y = lenis.scroll;
    playing = true;
    btn.dataset.playing = '';
    setLabel();
    gsap.ticker.add(tick);
  }
  function stop() {
    playing = false;
    delete btn.dataset.playing;
    gsap.ticker.remove(tick);
    setLabel();
  }

  btn.addEventListener('click', () => (playing ? stop() : start()));
  const takeOver = () => { if (playing) stop(); };
  addEventListener('wheel', takeOver, { passive: true });
  addEventListener('touchstart', takeOver, { passive: true });
  addEventListener('keydown', (e) => { if (e.target !== btn && SCROLL_KEYS.includes(e.key)) takeOver(); });
  document.addEventListener('pointerdown', (e) => { if (e.target.closest('a')) takeOver(); });
  lenis.on('scroll', () => { if (!playing) setLabel(); });
}
