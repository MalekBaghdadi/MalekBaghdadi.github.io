// The Play button in Game development, and the window Bug Run opens in. The game itself (game/bugrun.js) is
// downloaded the first time someone presses Play; until then this is a button and an empty <dialog>.
const coarse = () => matchMedia('(hover: none), (pointer: coarse)').matches;
const ICON_PLAY = '<svg class="amb" viewBox="0 0 5 7" width="10" height="14" shape-rendering="crispEdges" aria-hidden="true"><rect x="0" y="0" width="1" height="7"/><rect x="1" y="1" width="1" height="5"/><rect x="2" y="2" width="1" height="3"/><rect x="3" y="3" width="1" height="1"/></svg>';
const ICON_SOUND_ON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_SOUND_OFF = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

export function initGame({ lenis }) {
  const section = document.getElementById('games');
  if (!section) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'play';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.innerHTML = `${ICON_PLAY}<span>Play <b>Bug Run</b></span>`;
  section.append(btn);
  // the button's "press start" blink runs only while the section is on screen
  new IntersectionObserver(([e]) => section.classList.toggle('is-live', e.isIntersecting)).observe(section);

  let dialog, screen, card, soundBtn, game, loading;
  const artWidth = () => (dialog && dialog.clientWidth < 560 ? 200 : 256); // narrow phones: a narrower world, bigger pixels
  let world = 256;
  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'bugrun';
    dialog.setAttribute('aria-labelledby', 'bugrun-title');
    dialog.innerHTML = `<div class="br-box">
      <div class="br-head">
        <h2 id="bugrun-title">Bug <span>Run</span></h2>
        <p class="br-sub">Jump the bugs. Grab the coins.</p>
        <button class="br-icon br-sound" type="button" aria-pressed="false" aria-label="Sound">${ICON_SOUND_OFF}</button>
        <button class="br-icon br-close" type="button" aria-label="Close the game">${ICON_CLOSE}</button>
      </div>
      <div class="br-screen" tabindex="0" autofocus role="application" aria-roledescription="game" aria-label="Bug Run. Space, the up arrow or a tap to jump; hold it for a higher jump.">
        <canvas></canvas>
        <div class="br-card" aria-live="polite"><p class="br-cta">Loading…</p></div>
      </div>
      <p class="br-keys">${coarse() ? 'Tap to jump, hold for a higher one.' : 'Space or ↑ to jump, hold for a higher one · Esc to close'}</p>
    </div>`;
    document.body.append(dialog);
    screen = dialog.querySelector('.br-screen');
    card = dialog.querySelector('.br-card');
    soundBtn = dialog.querySelector('.br-sound');
    dialog.querySelector('.br-close').addEventListener('click', () => dialog.close());
    // a click on the dimmed page around the window closes it too
    dialog.addEventListener('click', (e) => { if (!e.target.closest('.br-box')) dialog.close(); });
    dialog.addEventListener('close', () => {
      game?.pause();
      lenis?.start();
      document.documentElement.classList.remove('game-open');
      btn.focus({ preventScroll: true });
    });
    soundBtn.addEventListener('click', () => {
      if (!game) return;
      game.setSound(!game.sound());
      showSound();
      screen.focus({ preventScroll: true });
    });
    new ResizeObserver(fit).observe(dialog);
  }
  // Whole device pixels per art pixel, as big as the window allows: crisp pixels at any size.
  function fit() {
    if (!dialog?.open) return;
    const canvas = screen.querySelector('canvas'), dpr = devicePixelRatio || 1;
    const cs = getComputedStyle(screen), inner = screen.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const byWidth = Math.floor((inner * dpr) / world), byHeight = Math.floor(((innerHeight - 190) * dpr) / 112);
    const n = Math.max(1, Math.min(byWidth, byHeight));
    canvas.style.width = `${(world * n) / dpr}px`;
    canvas.style.height = `${(112 * n) / dpr}px`;
  }
  const showSound = () => {
    const on = game.sound();
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.innerHTML = on ? ICON_SOUND_ON : ICON_SOUND_OFF;
  };
  function overlay(state, info) {
    if (state === 'play') { card.hidden = true; return; }
    card.hidden = false;
    const go = coarse() ? 'Tap' : '<kbd>Space</kbd>';
    card.innerHTML = state === 'title'
      ? `<strong>Bug Run</strong><p>Jump the bugs, grab the coins, bump the <b>?</b> blocks from below.</p><p class="br-cta">${go} to start</p>`
      : state === 'paused'
        ? `<strong>Paused</strong><p class="br-cta">${go} to carry on</p>`
        : `<strong>${info.newBest ? 'New best!' : 'Bugged out!'}</strong><p>Score <b>${info.score}</b> · ${info.coins} coin${info.coins === 1 ? '' : 's'} · best ${info.best}</p><p class="br-cta">${go} to try again</p>`;
  }

  btn.addEventListener('click', async () => {
    if (!dialog) build();
    document.dispatchEvent(new Event('site:pause-autoscroll'));
    lenis?.stop();
    document.documentElement.classList.add('game-open');
    dialog.showModal();
    fit();
    screen.focus({ preventScroll: true });
    if (!game) {
      loading ??= import('./game/bugrun.js');
      const { mountGame } = await loading;
      world = artWidth();
      game ??= mountGame(screen, { overlay }, { width: world });
      fit();
      showSound();
    }
    if (dialog.open) game.resume();
  });
}
