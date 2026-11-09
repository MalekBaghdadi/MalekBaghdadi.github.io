// A pixel sticker beside every entry on the CV, drawn like the runner (runner.js): two speech bubbles for the liaison
// work, a phone with a map pin for the iOS internship, a gamepad for the jams, a cloud for AWS, a router for the CCNA,
// a mortarboard for the degree and a book for school. Each pops into place with the scroll as its entry arrives, grey
// until it is pressed; pressed, it jumps, throws a few pixels and keeps its colours. Press all seven.
import { gsap } from 'gsap';
import { PAL, sprite } from './runner.js';
import { burst, rise } from './burst.js';
import { found } from './hunt.js';

const ART = [
  ['talk', [
    '.bbbbbbbb...',
    'bwwwwwwwwb..',
    'bwkkwkkwwb..',
    'bwwwwwwwwb..',
    '.bbbbbbbb...',
    '..bb.fffffff',
    '..b.fwwwwwwf',
    '....fwkkwkwf',
    '....fwwwwwwf',
    '.....fffffff',
    '.........ff.',
    '..........f.',
  ]],
  ['phone', [
    '..kkkkkkkk..',
    '..kwwwwwwk..',
    '..kwwffwwk..',
    '..kwfwwfwk..',
    '..kwfwwfwk..',
    '..kwwffwwk..',
    '..kwwffwwk..',
    '..kwwwwwwk..',
    '..kbbbbbbk..',
    '..kwwwwwwk..',
    '..kwwkkwwk..',
    '..kkkkkkkk..',
  ]],
  ['pad', [
    '............',
    '............',
    '..kkkkkkkk..',
    '.kbbbbbbbbk.',
    'kbbkbbbbybbk',
    'kbkkkbbfbfbk',
    'kbbkbbbbybbk',
    'kbbbbbbbbbbk',
    'kbbbkkkkbbbk',
    'kbbk....kbbk',
    '.kk......kk.',
    '............',
  ]],
  ['cloud', [
    '............',
    '.....kkk....',
    '....kwwwkk..',
    '..kkwwwwwwk.',
    '.kwwwwwwwwwk',
    'kwwwwwwwwwwk',
    'kwwwwwwwwwwk',
    '.kkkkkkkkkk.',
    '............',
    '..b...b...b.',
    '.b...b...b..',
    '............',
  ]],
  ['router', [
    '.k........k.',
    '.k........k.',
    '.k........k.',
    '.k........k.',
    'kkkkkkkkkkkk',
    'kbbbbbbbbbbk',
    'kbfbybwbwbbk',
    'kbbbbbbbbbbk',
    'kkkkkkkkkkkk',
    '.kk......kk.',
    '............',
    '............',
  ]],
  ['cap', [
    '............',
    '.....kk.....',
    '...kkkkkk...',
    '.kkkkkkkkkk.',
    'kkkkkkkkkkkk',
    '.kkkkkkkkky.',
    '...kkkkkk.y.',
    '..kbbbbbbky.',
    '..kbbbbbbkyy',
    '...kkkkkk.yy',
    '............',
    '............',
  ]],
  ['book', [
    '............',
    '.kkkkk.kkkkk',
    'kwwwwwkwwwwk',
    'kwbbbwkwbbwk',
    'kwwwwwkwwwwk',
    'kwbbbwkwbbwk',
    'kwwwwwkwwwwk',
    'kwbbwwkwbbwk',
    'kwwwwwkwwwwk',
    'kkkkkkkkkkkk',
    '.....ff.....',
    '.....f......',
  ]],
];

export function initStickers(st) {
  const entries = [...document.querySelectorAll('.after .entry')];
  if (entries.length !== ART.length) return; // the CV changed: no stickers until someone draws the new ones
  const px = matchMedia('(max-width: 820px)').matches ? 2 : 3;
  const got = new Set();
  entries.forEach((entry, i) => {
    const [kind, rows] = ART[i];
    const el = document.createElement('i');
    el.className = `sticker sticker-${kind}`;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = sprite(rows, px);
    entry.append(el);
    gsap.fromTo(el, { scale: 0, rotation: -50 }, { scale: 1, rotation: 0, ease: 'back.out(2.4)', scrollTrigger: st(entry, 'top 84%', 'top 60%') });
    el.addEventListener('click', () => {
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop', 'got');
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2;
      burst(x, r.top + r.height / 2, [PAL.b, PAL.f, PAL.y, PAL.k], 9, px + 1);
      const fresh = !got.has(i);
      got.add(i);
      if (fresh && got.size < ART.length) rise(r.right + 30, r.top + r.height / 2, `${got.size} of ${ART.length}`);
      if (fresh && got.size === ART.length) found('stickers', '<b>All seven stickers.</b> A whole CV, collected. The real one fits on a page.');
    });
  });
}
