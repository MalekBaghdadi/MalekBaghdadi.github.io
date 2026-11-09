// The Play button in Game development, and Bug Run, which plays right there in the page: Play opens the runner's course
// up into the game, and ✕ (or Esc) folds it back into the course. There is no window over the page and the page is never
// locked: scroll the game away and it waits. The game itself (game/bugrun.js) is downloaded as a hand reaches for Play.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { vh } from './viewport.js';
import { found } from './hunt.js';

const coarse = () => matchMedia('(hover: none), (pointer: coarse)').matches;
const ICON_PLAY = '<svg class="amb" viewBox="0 0 5 7" width="10" height="14" shape-rendering="crispEdges" aria-hidden="true"><rect x="0" y="0" width="1" height="7"/><rect x="1" y="1" width="1" height="5"/><rect x="2" y="2" width="1" height="3"/><rect x="3" y="3" width="1" height="1"/></svg>';
// both sound icons stay in the button and the style shows one: swapping the button's insides under a click is what
// used to make a click on the icon count as a click outside the game, and close it
const ICON_SOUND = '<svg class="on" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  + '<svg class="off" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';

export function initGame({ lenis, reduced }) {
  const section = document.getElementById('games');
  if (!section) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'play';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'bugrun');
  btn.innerHTML = `${ICON_PLAY}<span>Play <b>Bug Run</b></span>`;
  section.append(btn);
  // the button's "press start" blink runs only while the section is on screen
  new IntersectionObserver(([e]) => section.classList.toggle('is-live', e.isIntersecting)).observe(section);

  let loading;
  const load = () => (loading ??= import('./game/bugrun.js'));
  for (const t of ['pointerenter', 'focus', 'touchstart']) btn.addEventListener(t, load, { once: true, passive: true });

  let panel, screen, card, soundBtn, game, world = 0, open = false, onScreen = false;
  const runner = () => section.querySelector('.runner'); // the scroll's runner and its course (runner.js), when there is one
  const fades = () => [btn, runner()].filter(Boolean);

  function build() {
    panel = document.createElement('div');
    panel.className = 'bugrun';
    panel.id = 'bugrun';
    panel.hidden = true;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Bug Run, a small game');
    panel.innerHTML = `<div class="br-bar">
        <p class="br-title" aria-hidden="true">Bug <span>Run</span></p>
        <p class="br-hint">${coarse() ? 'Tap to jump, hold for a higher jump' : '<kbd>Space</kbd> or <kbd>↑</kbd> to jump, hold for a higher jump · <kbd>Esc</kbd> to close'}</p>
        <button class="br-icon br-sound" type="button" aria-pressed="false" aria-label="Sound">${ICON_SOUND}</button>
        <button class="br-icon br-close" type="button" aria-label="Close the game">${ICON_CLOSE}</button>
      </div>
      <div class="br-screen" tabindex="0" role="application" aria-roledescription="game" aria-label="Bug Run. Space, the up arrow or a tap to jump; hold it for a higher jump. Escape closes the game.">
        <canvas width="256" height="112"></canvas>
        <div class="br-card" aria-live="polite"><p class="br-cta">Loading…</p></div>
      </div>`;
    section.append(panel);
    screen = panel.querySelector('.br-screen');
    card = panel.querySelector('.br-card');
    soundBtn = panel.querySelector('.br-sound');
    // The buttons do their one thing: a click doesn't take the keyboard from the game (so Space goes on jumping), and
    // nothing in the bar ever jumps, pauses or closes anything else.
    for (const b of panel.querySelectorAll('.br-icon')) b.addEventListener('mousedown', (e) => e.preventDefault());
    panel.querySelector('.br-close').addEventListener('click', closeGame);
    soundBtn.addEventListener('click', () => {
      if (!game) return;
      game.setSound(!game.sound());
      showSound();
    });
    panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); closeGame(); } });
    // The game waits while it can't be played: mostly scrolled away, the tab hidden, the visitor busy elsewhere on the
    // page (a press outside it, or the keyboard taken somewhere else).
    new IntersectionObserver(([e]) => {
      onScreen = e.intersectionRatio >= 0.5;
      if (onScreen) wake(); else game?.stop();
    }, { threshold: [0, 0.5, 1] }).observe(screen);
    document.addEventListener('visibilitychange', () => { if (document.hidden) game?.stop(); else wake(); });
    document.addEventListener('pointerdown', (e) => { if (open && !panel.contains(e.target)) game?.pause(); });
    screen.addEventListener('focusout', (e) => { if (e.relatedTarget && !panel.contains(e.relatedTarget)) game?.pause(); });
    // a new width (a turned phone, a resized window): refit, and give the section the room the game now needs
    new ResizeObserver(() => {
      if (!open) return;
      fit();
      if (!reduced && !gsap.isTweening(section)) { section.style.paddingBottom = `${room()}px`; ScrollTrigger.refresh(); }
    }).observe(panel);
  }

  // As big as the page allows in whole device pixels per art pixel (crisp pixels at any size): up to about four tenths
  // of the screen high, as wide as the course, and the world as wide as that leaves (200 to 480 art pixels).
  function fit() {
    const dpr = devicePixelRatio || 1, canvas = screen.querySelector('canvas');
    const across = panel.clientWidth - 6; // inside the screen's border
    const tall = Math.min(vh() * 0.42, 400);
    const n = Math.max(1, Math.min(Math.floor((tall * dpr) / 112), Math.floor((across * dpr) / 200)));
    const w = Math.max(160, Math.min(480, Math.floor((across * dpr) / n)));
    canvas.style.width = `${(w * n) / dpr}px`;
    canvas.style.height = `${(112 * n) / dpr}px`;
    panel.style.setProperty('--br-w', `${(w * n) / dpr + 6}px`); // the bar lines up with the screen
    if (w !== world) { world = w; game?.resize(w); }
  }
  // the room under the section's entries the open game takes: itself, its spot above the bottom edge, and a gap
  const room = () => parseFloat(getComputedStyle(panel).bottom) + panel.offsetHeight + Math.min(56, vh() * 0.06);
  const wake = () => { if (game && open && onScreen && !document.hidden) game.start(); };
  const showSound = () => soundBtn.setAttribute('aria-pressed', String(!!game?.sound()));

  function overlay(state, info) {
    screen.dataset.state = state;
    if (state === 'play') { card.hidden = true; return; }
    card.hidden = false;
    if (state === 'dead') found('arcade', '🕹️ <b>On the board.</b> Your best score stays on this device.', 0, true);
    const go = coarse() ? 'Tap' : '<kbd>Space</kbd>';
    card.innerHTML = state === 'title'
      ? `<strong>Bug Run</strong><p>Jump the bugs, grab the coins, bump the <b>?</b> blocks from below.</p><p class="br-cta">${go} to start</p>`
      : state === 'paused'
        ? `<strong>Paused</strong><p class="br-cta">${go} to carry on</p>`
        : `<strong>${info.newBest ? 'New best!' : 'Bugged out!'}</strong><p>Score <b>${info.score}</b> · ${info.coins} coin${info.coins === 1 ? '' : 's'} · best ${info.best}</p><p class="br-cta">${go} to try again</p>`;
  }
  // bring the whole game on screen (after it opens, or when it is pressed while half off screen)
  function show() {
    const r = panel.getBoundingClientRect(), h = vh();
    if (r.top >= 8 && r.bottom <= h - 8) return;
    const y = scrollY + r.top - Math.max(12, (h - r.height) / 2);
    if (lenis) lenis.scrollTo(y, { duration: 0.8 });
    else scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }

  btn.addEventListener('click', async () => {
    if (open) return;
    open = true;
    if (!panel) build();
    document.dispatchEvent(new Event('site:pause-autoscroll'));
    btn.setAttribute('aria-expanded', 'true');
    section.classList.add('br-open');
    panel.hidden = false;
    fit();
    gsap.killTweensOf([section, panel, ...fades()]);
    const settle = () => { ScrollTrigger.refresh(); show(); };
    if (reduced) settle();
    else {
      // the course opens up: the section makes room, the runner's course fades and the game rises in its place
      const from = parseFloat(getComputedStyle(section).paddingBottom);
      gsap.fromTo(section, { paddingBottom: from }, { paddingBottom: room(), duration: 0.55, ease: 'power3.inOut', onComplete: settle });
      gsap.to(fades(), { autoAlpha: 0, duration: 0.2 });
      // (opacity, not visibility: the screen has to be able to take the keyboard straight away)
      gsap.fromTo(panel, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.5, delay: 0.15, ease: 'power3.out' });
    }
    screen.focus({ preventScroll: true });
    const { mountGame } = await load();
    if (!game) {
      game = mountGame(screen, { overlay, want: show }, { width: world });
      showSound();
    }
    wake();
  });

  function closeGame() {
    if (!open) return;
    open = false;
    game?.quit();
    btn.setAttribute('aria-expanded', 'false');
    gsap.killTweensOf([section, panel, ...fades()]);
    const done = () => {
      panel.hidden = true;
      section.classList.remove('br-open');
      gsap.set(section, { clearProps: 'paddingBottom' });
      gsap.set(panel, { clearProps: 'opacity,visibility,transform' });
      ScrollTrigger.refresh();
      btn.focus({ preventScroll: true });
    };
    if (reduced) { done(); return; }
    // ...and folds back: the game sinks away, the section closes up, the course and the button come back
    const now = parseFloat(getComputedStyle(section).paddingBottom);
    section.style.paddingBottom = '';
    const to = parseFloat(getComputedStyle(section).paddingBottom);
    section.style.paddingBottom = `${now}px`;
    gsap.to(panel, { opacity: 0, y: 20, duration: 0.25, ease: 'power2.in' });
    gsap.to(section, { paddingBottom: to, duration: 0.5, delay: 0.12, ease: 'power3.inOut', onComplete: done });
    gsap.to(fades(), { autoAlpha: 1, duration: 0.35, delay: 0.4, clearProps: 'opacity,visibility' });
  }
}
