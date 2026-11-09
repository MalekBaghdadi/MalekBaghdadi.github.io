// The hunt: everything hidden in the page, and how much of it this visitor has found.
//
// Each hidden thing reports in with `found(id, …)` the first time it is set off. The note it shows then carries a count
// ("7 of 19 found"), the footer's small print keeps the tally, and its button opens the log: what has been found by
// name, and a hint for each thing that hasn't. Find everything this device can find and the page throws a small party.
// What has been found is remembered in `localStorage`. The same small print says how far the visitor has scrolled.
const KEY = 'eggs-found';

// id, its name once found, the hint until then, and what it needs: 'd' a mouse and a keyboard, 'w' a wide screen,
// 'm' motion left on (the page's own switch)
const EGGS = [
  ['ping', 'Send a signal', 'Signal bars aren’t only for show.'],
  ['clock', 'Your time, not Beirut’s', 'The clock at the top knows more than one city.'],
  ['letters', 'All thirteen letters', 'The name is made of buttons.'],
  ['rubber', 'Rubber letters', 'The name is also made of rubber.', 'dm'],
  ['visitor', 'The visitor', 'Wait a while at the very top. Someone may drop by.', 'm'],
  ['ink', 'Write on the paper', 'NeatInk’s page is paper. Paper is for writing on.', 'd'],
  ['convert', 'Handwriting, converted', 'Write a little more, then let the page read it.', 'd'],
  ['poke', 'Poke a pigeon', 'Somewhere, a bird is waiting to be bothered.', 'w'],
  ['moon', 'Wish on a star', 'The night sky over the city isn’t painted on.'],
  ['lights', 'Somebody’s home', 'A city is a lot of light switches.'],
  ['streak', 'A week, logged', 'Logbook’s floor counts days. Yours too.', 'd'],
  ['stickers', 'All seven stickers', 'Every entry on the CV has a small friend.', 'm'],
  ['arcade', 'A run on the board', 'There is a whole game in here.'],
  ['fling', 'Fling the marquee', 'Big words can be thrown.', 'm'],
  ['coo', 'Speak pigeon', 'Say what the pigeons say.', 'd'],
  ['offline', 'Go offline', 'Type the thing this site is about.', 'd'],
  ['konami', 'The cheat code', 'An old code from the cartridge days.', 'd'],
  ['console', 'Look under the hood', 'Developers have their own door in.', 'd'],
  ['tab', 'Leave, and come back', 'What happens when you look away?'],
];
let open = EGGS; // what this visitor can find, on this device, with motion as it is (initHunt narrows it)
let ids = new Set(open.map(([id]) => id));
const got = new Set();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...got])); } catch { /* storage blocked: the tally lasts the visit */ } };

// a small note at the top of the screen, shared by everything hidden
let toastEl, toastTimer;
export function toast(html, ms = 3400) {
  toastEl ??= Object.assign(document.createElement('div'), { className: 'egg-toast', role: 'status' });
  if (!toastEl.isConnected) document.body.append(toastEl);
  toastEl.innerHTML = html;
  toastEl.classList.remove('on');
  void toastEl.offsetWidth; // restart the entrance
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
}

let party = () => {};
/** What to do when the last hidden thing is found (eggs.js brings the birds and the coins). */
export const onAllFound = (fn) => { party = fn; };

/**
 * A hidden thing was set off. Shows its note (if it has one; with `once`, only the first time), with the count the first
 * time, and returns whether this was the first time.
 */
export function found(id, html, ms, once = false) {
  const fresh = ids.has(id) && !got.has(id);
  if (fresh) { got.add(id); save(); tally(); }
  if (html && (fresh || !once)) toast(html + (fresh ? `<i class="egg-n">${got.size} of ${open.length} found</i>` : ''), fresh ? Math.max(ms ?? 0, 4200) : ms);
  if (fresh && got.size === open.length) {
    setTimeout(() => {
      toast(`<b>That’s all ${open.length}.</b> You read documentation for fun, don’t you? We should talk.`, 7000);
      party();
    }, html ? 4600 : 300);
  }
  return fresh;
}

/** The list, for the console: `eggs()`. */
export function table() {
  return Object.fromEntries(open.map(([id, name, hint]) => [got.has(id) ? name : '???', got.has(id) ? 'found' : hint]));
}

let btn, list, odo;
function tally() {
  if (!btn) return;
  btn.innerHTML = `<b>${got.size}</b> of ${open.length} hidden things found`;
  list.innerHTML = open.map(([id, name, hint]) => (got.has(id) ? `<li class="got">${name}</li>` : `<li>${hint}</li>`)).join('')
    + (open.length < EGGS.length ? `<li class="more">${EGGS.length - open.length} more need a mouse and a keyboard, a wider screen, or motion left on.</li>` : '');
}

/** The footer's small print: how far the visitor scrolled to get there, the tally, and the log behind it. */
export function initHunt({ reduced }) {
  const can = { d: matchMedia('(hover: hover) and (pointer: fine)').matches, w: matchMedia('(min-width: 821px)').matches, m: !reduced };
  open = EGGS.filter(([, , , needs = '']) => [...needs].every((n) => can[n]));
  ids = new Set(open.map(([id]) => id));
  try { for (const id of JSON.parse(localStorage.getItem(KEY) || '[]')) if (ids.has(id)) got.add(id); } catch { /* nothing remembered */ }
  const footer = document.querySelector('.contact');
  if (!footer) return null;
  const box = document.createElement('div');
  box.className = 'hunt';
  box.innerHTML = `<p class="hunt-odo" aria-hidden="true"></p>
    <button class="hunt-btn" type="button" aria-expanded="false" aria-controls="hunt-log"></button>`;
  footer.append(box);
  const panel = document.createElement('div');
  panel.className = 'hunt-log';
  panel.id = 'hunt-log';
  panel.hidden = true;
  panel.setAttribute('data-lenis-prevent', '');
  panel.innerHTML = '<p>Hidden in this page</p><ol></ol>';
  document.body.append(panel);
  btn = box.querySelector('.hunt-btn');
  list = panel.querySelector('ol');
  odo = box.querySelector('.hunt-odo');
  tally();

  const show = (on) => {
    if (on) { // it opens just above its button, its right edge on the button's where there is room
      const r = btn.getBoundingClientRect(), gutter = parseFloat(getComputedStyle(footer).paddingLeft);
      panel.style.bottom = `${Math.max(12, innerHeight - r.top + 14)}px`;
      panel.style.right = `${Math.max(gutter, innerWidth - r.right)}px`;
    }
    panel.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
  };
  btn.addEventListener('click', () => show(panel.hidden));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { show(false); btn.focus(); } });
  document.addEventListener('pointerdown', (e) => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) show(false); });

  // How far the page has been scrolled, in real distance (a CSS pixel is 1/96 of an inch), and in pigeons. Counted on
  // every scroll, written only while the footer can be seen.
  let px = 0, last = scrollY, seen = false;
  const write = () => {
    const m = px * 0.0254 / 96;
    const far = m < 1 ? `${Math.round(m * 100)} cm` : `${m.toFixed(1)} m`;
    const birds = Math.round(m / 0.33); // a pigeon is about 33 cm, beak to tail
    odo.innerHTML = `You scrolled <b>${far}</b> to get here${birds > 1 ? `, about ${birds} pigeons end to end` : ''}.`;
  };
  addEventListener('scroll', () => {
    px += Math.abs(scrollY - last);
    last = scrollY;
    if (seen) write();
  }, { passive: true });
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) write(); else show(false); }).observe(box);
  write();
  return box;
}
