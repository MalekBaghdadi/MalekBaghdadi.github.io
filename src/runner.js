// A pixel runner along the bottom of "Game development": it runs with the scroll (stop and it stops, scroll up and it
// runs backwards), jumps at each block, bumps it from below and a coin pops out. Drawn in the site's own ink,
// ultramarine and flare, with the marquee's square for a coin. Everything is a function of the scroll position.
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const PAL = { k: '#0f1633', b: '#2b3bff', s: '#e9b48f', f: '#ff5a36', w: '#ffffff', g: '#434b6b' };
// 12 x 16 sprites, facing right: two running frames and a jump
const TOP = [
  '....kkkk....',
  '...kkkkkkk..',
  '...kkkssks..',
  '...kksssss..',
  '....sssss...',
];
const FRAMES = {
  a: [...TOP, '...bbbbbb...', '..bbbbbbbb..', '..sbbbbbbs..', '...bbbbbb...', '...kkkkkk...', '...kkkkkk...', '..kk...kk...', '.kk.....kk..', '.kk......kk.', 'ff.......ff.', '............'],
  b: [...TOP, '...bbbbbb...', '...bbbbbb...', '...bsbbsb...', '...bbbbbb...', '...kkkkkk...', '....kkkk....', '....kkkk....', '....kk.k....', '....kk.k....', '....ff.ff...', '............'],
  j: [...TOP, 's..bbbbbb..s', 'sbbbbbbbbbbs', '..bbbbbbbb..', '...bbbbbb...', '...kkkkkk...', '..kkkkkkkk..', '.kk......kk.', 'kk........kk', 'ff........ff', '............', '............'],
};
const BLOCK = [
  'kkkkkkkkkk',
  'kbbbbbbbbk',
  'kbbwwwwbbk',
  'kbwbbbbwbk',
  'kbbbbbwbbk',
  'kbbbbwbbbk',
  'kbbbbwbbbk',
  'kbbbbbbbbk',
  'kbbbbwbbbk',
  'kkkkkkkkkk',
];

// The world around it: pixel clouds drifting behind (slower than the runner, so they read as far away), a flag at the
// end of the course that goes up as the runner reaches it, and a coin tally.
const CLOUD = [
  '....cccc......',
  '..ccwwwwcc....',
  '.cwwwwwwwwccc.',
  'cwwwwwwwwwwwwc',
  '.cccccccccccc.',
];
const FLAG = [
  'bbbbbbb.',
  'bwwbbbbb',
  'bbwwbbbb',
  'bbbbbbb.',
];
PAL.c = '#c9cedb';

const pixels = (rows, px) => rows.flatMap((row, y) => [...row].map((c, x) => (c === '.' ? '' : `<rect x="${x * px}" y="${y * px}" width="${px}" height="${px}" fill="${PAL[c]}"/>`))).join('');
const sprite = (rows, px, cls = '') => `<svg class="${cls}" width="${rows[0].length * px}" height="${rows.length * px}" shape-rendering="crispEdges" aria-hidden="true">${pixels(rows, px)}</svg>`;

export function initRunner(section) {
  if (!section) return;
  const px = matchMedia('(max-width: 820px)').matches ? 2 : 3;
  const used = BLOCK.map((r) => r.replace(/[bw]/g, 'g'));
  const SPOTS = [0.34, 0.6, 0.84]; // blocks, as fractions of the track
  const track = document.createElement('div');
  track.className = 'runner';
  track.setAttribute('aria-hidden', 'true');
  track.innerHTML = `<i class="runner-ground"></i>
    ${[0, 1, 2].map(() => `<div class="runner-cloud">${sprite(CLOUD, px)}</div>`).join('')}
    <div class="runner-flag" style="height:${26 * px}px"><i class="runner-pole"></i><div class="runner-cloth" style="bottom:${2 * px}px">${sprite(FLAG, px)}</div></div>
    <p class="runner-score"><i></i><b>× 0</b></p>
    ${SPOTS.map(() => `<div class="runner-block"><i class="runner-coin"></i>${sprite(BLOCK, px, 'on')}${sprite(used, px, 'off')}</div>`).join('')}
    <i class="runner-dust"></i><i class="runner-dust"></i>
    <div class="runner-me">${sprite(FRAMES.a, px, 'fa')}${sprite(FRAMES.b, px, 'fb')}${sprite(FRAMES.j, px, 'fj')}</div>`;
  section.append(track);
  const me = track.querySelector('.runner-me');
  const blocks = [...track.querySelectorAll('.runner-block')].map((el) => ({ el, coin: el.querySelector('.runner-coin') }));
  const clouds = [...track.querySelectorAll('.runner-cloud')], cloth = track.querySelector('.runner-cloth');
  const score = track.querySelector('.runner-score b'), dust = [...track.querySelectorAll('.runner-dust')];
  const W = 12 * px, JUMP = 14 * px, REACH = 26 * px; // sprite width, jump height, half the jump's run-up
  const POLE = 19 * px; // the flag's travel up its pole (26px tall, the cloth 4px, 2px off the ground)
  let coins = -1;

  let width = 0;
  const measure = () => {
    width = track.clientWidth;
    blocks.forEach((b, i) => {
      b.x = SPOTS[i] * width;
      b.el.style.left = `${b.x - 5 * px}px`;
      b.el.style.bottom = `${3 + 16 * px + JUMP - 2 * px}px`; // the runner's head meets it at the top of the jump
    });
  };
  function update(p) {
    const x = -W + p * (width + 2 * W); // from off the left edge to off the right one
    const mid = x + W / 2;
    let y = 0, jumping = false, landed = -1, got = 0;
    for (const b of blocks) {
      const d = (mid - (b.x - REACH)) / (2 * REACH); // 0..1 across this block's jump
      if (d > 0 && d < 1) { y = -JUMP * Math.sin(Math.PI * d); jumping = true; }
      if (d >= 1 && d < 1.6) landed = (d - 1) / 0.6; // just landed: a puff of dust at the feet
      const after = (mid - b.x) / (3 * REACH); // after the head-butt: the block bumps, the coin rises and fades
      const bump = after > 0 && after < 0.25 ? Math.sin((after / 0.25) * Math.PI) : 0;
      b.el.style.transform = `translateY(${(-bump * 2 * px).toFixed(1)}px)`;
      b.el.classList.toggle('used', after > 0);
      if (after > 0) got++;
      const c = Math.max(0, Math.min(1, after));
      b.coin.style.transform = `translateY(${(-c * 14 * px).toFixed(1)}px) rotateY(${(c * 540).toFixed(0)}deg)`;
      b.coin.style.opacity = c > 0 && c < 1 ? (1 - c).toFixed(2) : '0';
    }
    me.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    me.dataset.frame = jumping ? 'j' : Math.floor(x / (7 * px)) % 2 ? 'b' : 'a';
    dust.forEach((el, i) => {
      el.style.opacity = landed >= 0 ? (0.7 * (1 - landed)).toFixed(2) : '0';
      if (landed >= 0) el.style.transform = `translate(${(mid + (i ? 1 : -1) * (4 + landed * 9) * px).toFixed(1)}px, ${(-landed * 3 * px).toFixed(1)}px)`;
    });
    if (got !== coins) { coins = got; score.textContent = `× ${got}`; score.parentElement.classList.toggle('full', got === blocks.length); }
    clouds.forEach((el, i) => { el.style.transform = `translateX(${((0.12 + i * 0.33 - p * (0.16 + i * 0.05)) * width).toFixed(1)}px)`; });
    const up = Math.max(0, Math.min(1, (mid - (width - 70 * px)) / (40 * px))); // the flag rises as the runner reaches the pole
    cloth.style.transform = `translateY(${(-up * POLE).toFixed(1)}px)`;
  }
  ScrollTrigger.create({
    trigger: section, start: 'top 75%', end: 'bottom 25%',
    onRefresh: (self) => { measure(); update(self.progress); },
    onUpdate: (self) => update(self.progress),
  });
  measure();
  update(0);
}
