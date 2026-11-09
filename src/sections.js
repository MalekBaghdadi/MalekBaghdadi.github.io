import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitChars, splitWords } from './split.js';
import { initRunner } from './runner.js';
import { initFooterWaves } from './hero-waves.js';
import { initStickers } from './stickers.js';

// Where on this page each skill can be seen at work (only what the page itself shows: the three apps, the jams, itself).
const USED_IN = {
  Dart: ['#neatink', 'in NeatInk'], Flutter: ['#neatink', 'in NeatInk'],
  Kotlin: ['#pigeon', 'in Pigeon'],
  TypeScript: ['#logbook', 'in Logbook'], React: ['#logbook', 'in Logbook'], Firebase: ['#logbook', 'in Logbook'],
  'Unity 2D/3D': ['#games', 'in the game jams'],
  JavaScript: ['#top', 'in this page'], HTML: ['#top', 'in this page'], CSS: ['#top', 'in this page'],
};

// The CV sections after the demos move with the scroll too, in the demos' language: headings that open to full
// width, rules that draw themselves with a blue square riding the tip, entries that rise into place, a work timeline
// that draws itself, a skills marquee that slides with you (its squares turning), a pixel runner along Game
// development, and a contact card that grows to the full width while its signal comes back. All of it is scrubbed:
// it follows the scroll both ways.
export function initSections({ reduced }) {
  if (reduced) return;
  const scrub = 0.5;
  const st = (trigger, start, end) => ({ trigger, start, end, scrub });

  for (const h of document.querySelectorAll('.ledger > h2')) {
    gsap.fromTo(splitChars(h), { fontStretch: '55%' }, { fontStretch: '125%', ease: 'none', stagger: 0.06, scrollTrigger: st(h, 'top 95%', 'top 55%') });
  }
  for (const el of document.querySelectorAll('.entry, .skills dt, .skills dd')) {
    gsap.fromTo(el, { y: 64, opacity: 0.12 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: st(el, 'top 98%', 'top 68%') });
  }
  // Read along, as in the demos' captions: each line's words light up as it comes up the screen, and the hero's
  // highlighter runs under each title as it reaches the middle.
  for (const el of document.querySelectorAll('.entry li, .coursework')) {
    gsap.fromTo(splitWords(el), { opacity: 0.22 }, { opacity: 1, ease: 'none', stagger: 0.12, scrollTrigger: st(el, 'top 90%', 'top 55%') });
  }
  for (const h of document.querySelectorAll('.entry h3')) {
    const hl = document.createElement('span');
    hl.className = 'hl';
    hl.append(...h.childNodes);
    h.append(hl);
    gsap.fromTo(hl, { backgroundSize: '0% 36%' }, { backgroundSize: '100% 36%', ease: 'none', scrollTrigger: st(h, 'top 74%', 'top 50%') });
  }
  // Skills: each item on its own, one after another, like the marquee above them dropping them off
  for (const dd of document.querySelectorAll('.skills dd')) {
    const items = dd.textContent.split(', ');
    dd.textContent = '';
    items.forEach((t, i) => {
      if (i) dd.append(' ');
      const tok = Object.assign(document.createElement('span'), { className: 'tok' }), used = USED_IN[t];
      // a skill that one of the things on this page was built with is a link to it, and says so under a mouse
      if (used) tok.append(Object.assign(document.createElement('a'), { href: used[0], textContent: t }));
      else tok.append(t);
      if (used) tok.firstChild.dataset.in = used[1];
      if (i < items.length - 1) tok.append(',');
      dd.append(tok);
    });
    gsap.fromTo(dd.querySelectorAll('.tok'), { y: 18, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: st(dd, 'top 94%', 'top 62%') });
  }

  // Each section's top rule draws itself left to right as it comes up, the marquee's blue square riding the tip.
  for (const sec of document.querySelectorAll('.ledger, .marquee')) {
    if (getComputedStyle(sec).borderTopStyle === 'none') continue; // the first section and Skills have no rule
    const rule = document.createElement('i');
    rule.className = 'rule';
    rule.innerHTML = '<b></b><b></b>';
    sec.prepend(rule);
    sec.classList.add('ruled');
    const [line, tip] = rule.children;
    gsap.timeline({ scrollTrigger: { ...st(sec, 'top 96%', 'top 52%'), invalidateOnRefresh: true } })
      .fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 1 }, 0)
      .fromTo(tip, { x: 0 }, { x: () => rule.clientWidth - tip.offsetWidth, ease: 'none', duration: 1 }, 0)
      .fromTo(tip, { opacity: 1 }, { opacity: 0, duration: 0.12 }, 0.88);
  }

  // Every list of more than one entry is a timeline: a rail beside it that fills as you read down, a dot riding the
  // tip, and a stop at each entry that lights as the dot reaches it (like the chapter list beside Logbook's phone).
  for (const list of document.querySelectorAll('.after .entries')) {
    const entries = [...list.querySelectorAll('.entry')];
    if (entries.length < 2) continue;
    const rail = document.createElement('i');
    rail.className = 'rail';
    rail.innerHTML = '<b></b><b></b>';
    list.prepend(rail);
    const [fill, dot] = rail.children;
    const stops = entries.map((entry) => ({ entry, el: rail.appendChild(document.createElement('u')), at: 0 }));
    const place = () => stops.forEach((k) => { k.at = k.entry.offsetTop - rail.offsetTop + 11; k.el.style.top = `${k.at}px`; });
    const light = (self) => { const y = self.progress * rail.clientHeight; stops.forEach((k) => k.el.classList.toggle('on', y >= k.at - 1)); };
    gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { ...st(list, 'top 75%', 'bottom 60%'), onUpdate: light, onRefresh: (self) => { place(); light(self); } } });
    gsap.fromTo(dot, { y: 0 }, { y: () => rail.clientHeight, ease: 'none', scrollTrigger: { ...st(list, 'top 75%', 'bottom 60%'), invalidateOnRefresh: true } });
    // the dot sends out a ping as it rides the rail (style.css), only while the timeline is on screen
    new IntersectionObserver(([e]) => list.classList.toggle('is-live', e.isIntersecting)).observe(list);
  }

  // Behind each entry, its year, written large and faint in the display face (as NeatInk's promises and Logbook's
  // tally are behind their demos): it opens to full width as the entry arrives, and drifts up slower than the text in
  // front of it, so the page has depth. Something still going on says "Now".
  for (const entry of document.querySelectorAll('.after .entry')) {
    const when = entry.querySelector('.when'), times = when.querySelectorAll('time');
    const year = /present|progress/i.test(when.textContent) || !times.length ? 'Now' : times[times.length - 1].dateTime.slice(0, 4);
    const ghost = Object.assign(document.createElement('i'), { className: 'ghost', textContent: year });
    ghost.setAttribute('aria-hidden', 'true');
    entry.prepend(ghost);
    const whole = { trigger: entry, start: 'top bottom', end: 'bottom top', scrub };
    gsap.fromTo(splitChars(ghost), { fontStretch: '50%' }, { fontStretch: '125%', ease: 'none', stagger: 0.08, scrollTrigger: st(entry, 'top 96%', 'top 40%') });
    gsap.fromTo(ghost, { yPercent: 34 }, { yPercent: -34, ease: 'none', scrollTrigger: whole });
  }

  // Education, counted the way Logbook counts days: a square for every semester of the degree, and for every year of
  // school, filling in one by one.
  const school = document.querySelectorAll('#education .entry > div');
  for (const [body, n, unit] of [[school[0], 6, 'semesters'], [school[1], 15, 'years']]) {
    if (!body) continue;
    const row = document.createElement('p');
    row.className = 'terms';
    row.setAttribute('aria-hidden', 'true');
    row.innerHTML = `${'<i></i>'.repeat(n)}<span><b>0</b> ${unit}</span>`;
    body.append(row);
    const squares = [...row.querySelectorAll('i')], num = row.querySelector('b'), o = { n: 0 };
    let shown = -1;
    const draw = () => {
      const k = Math.round(o.n);
      if (k === shown) return;
      shown = k;
      squares.forEach((sq, i) => sq.classList.toggle('on', i < k));
      num.textContent = k;
    };
    gsap.fromTo(o, { n: 0 }, { n, ease: 'none', onUpdate: draw, scrollTrigger: { ...st(row, 'top 92%', 'top 58%'), onRefresh: draw } });
  }

  // Skills: each group's count runs up as its items arrive
  for (const dt of document.querySelectorAll('.skills dt')) {
    const toks = dt.nextElementSibling.querySelectorAll('.tok');
    if (toks.length < 2) continue;
    const num = dt.appendChild(Object.assign(document.createElement('sup'), { textContent: '0' })), o = { n: 0 };
    num.setAttribute('aria-hidden', 'true');
    const draw = () => { num.textContent = Math.round(o.n); };
    gsap.fromTo(o, { n: 0 }, { n: toks.length, ease: 'none', onUpdate: draw, scrollTrigger: { ...st(dt.nextElementSibling, 'top 94%', 'top 62%'), onRefresh: draw } });
  }

  document.querySelectorAll('.mq-row').forEach((row, i) => {
    // Each row holds its list twice; a third copy lets it be thrown either way without ever showing an end. The scroll
    // moves it as far as before (28% of two copies is 18.67% of three).
    const words = [...row.children];
    row.append(...words.slice(0, words.length / 2).map((w) => w.cloneNode(true)));
    const slide = (28 * 2) / 3;
    gsap.fromTo(row, { xPercent: i % 2 ? -slide : 0 }, { xPercent: i % 2 ? 0 : -slide, ease: 'none', scrollTrigger: st(row.parentElement, 'top bottom', 'bottom top') });
  });
  const marquee = document.querySelector('.marquee');
  if (marquee) {
    const spin = { deg: 0 }; // the separators turn as the rows slide (a CSS variable: they are pseudo-elements)
    const turn = () => marquee.style.setProperty('--spin', `${spin.deg.toFixed(1)}deg`);
    gsap.fromTo(spin, { deg: 0 }, { deg: 540, ease: 'none', scrollTrigger: st(marquee, 'top bottom', 'bottom top'), onUpdate: turn });
    ScrollTrigger.addEventListener('refresh', turn); // a refresh renders with events muted
    // The faster you scroll, the more the rows lean into the way they are going; they straighten up as you slow down,
    // and stand straight when you stop.
    const rows = [...marquee.querySelectorAll('.mq-row')];
    const lean = rows.map((row) => gsap.quickTo(row, 'skewX', { duration: 0.45, ease: 'power3.out' }));
    const set = (v) => lean.forEach((to, i) => to((i % 2 ? -1 : 1) * gsap.utils.clamp(-9, 9, v / 260)));
    ScrollTrigger.create({ trigger: marquee, start: 'top bottom', end: 'bottom top', onUpdate: (self) => set(self.getVelocity()), onToggle: () => set(0) });
    ScrollTrigger.addEventListener('scrollEnd', () => set(0));
    throwable(marquee, rows, lean);
  }

  initStickers(st);
  // "In progress" gets a bar that is: a barber's pole that turns while the section is on screen (style.css)
  for (const when of document.querySelectorAll('.entry .when')) {
    if (when.textContent.trim() !== 'In progress') continue;
    when.append(Object.assign(document.createElement('i'), { className: 'wip amb' }));
    const sec = when.closest('section');
    new IntersectionObserver(([e]) => sec.classList.toggle('is-live', e.isIntersecting)).observe(sec);
  }

  initRunner(document.getElementById('games'));

  // The footer ends the page, so everything in it finishes exactly when the scroll does ('bottom bottom'):
  // a position on screen like 'top 55%' may never be reached on a short phone screen, leaving things half done.
  const contact = document.querySelector('.contact');
  if (contact) {
    gsap.fromTo(contact, { clipPath: 'inset(0% 5% 0% 5% round 48px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: st(contact, 'top bottom', 'bottom bottom') });
    gsap.fromTo(splitChars(contact.querySelector('h2')), { fontStretch: '55%' }, { fontStretch: '125%', ease: 'none', stagger: 0.06, scrollTrigger: st(contact, 'top 90%', 'bottom bottom') });
    gsap.fromTo(contact.querySelectorAll('dt, dd'), { y: 48, opacity: 0.12 }, { y: 0, opacity: 1, ease: 'none', stagger: 0.08, scrollTrigger: st(contact, 'top 85%', 'bottom bottom') });
    // the hero lost the connection; the page ends with it back: the bars rise one by one, then "Back online"
    const rc = contact.querySelector('.reconnect');
    if (rc) {
      const back = gsap.timeline({ scrollTrigger: st(contact, 'top 85%', 'bottom bottom') })
        .fromTo(rc.querySelectorAll('rect'), { opacity: 0.2, scaleY: 0.4 }, { opacity: 1, scaleY: 1, transformOrigin: '50% 100%', ease: 'power1.out', stagger: 0.16, duration: 0.18 }, 0.1)
        .fromTo(rc.querySelector('.rc-off'), { opacity: 1 }, { opacity: 0, duration: 0.08 }, 0.86)
        .fromTo(rc.querySelector('.rc-on'), { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.86);
      // ...and the hero's rings come back with it: the page ends as it began, the signal pulsing out of the bars
      const waves = initFooterWaves(contact, rc.querySelector('svg'), back, 0.84);
      // ...and can be pressed, like the hero's: a ping rings out across the footer and each way to reach Malek lights
      // up as it passes
      rc.addEventListener('click', () => {
        const links = [...contact.querySelectorAll('dd a')].map((a) => { const r = a.getBoundingClientRect(); return { a, x: r.left + Math.min(r.width, 120) / 2, y: r.top + r.height / 2 }; });
        waves?.ping((r, x, y) => {
          for (const l of links) {
            if (l.hit || Math.hypot(l.x - x, l.y - y) > r) continue;
            l.hit = true;
            l.a.classList.remove('pinged');
            void l.a.offsetWidth;
            l.a.classList.add('pinged');
          }
        });
      });
    }
    // the way back to the top (birds.js) comes up last
    const up = contact.querySelector('.to-top');
    if (up) gsap.fromTo(up, { opacity: 0, y: 24 }, { opacity: 1, y: 0, ease: 'none', scrollTrigger: st(contact, 'top 40%', 'bottom bottom') });
    footerLight(contact);
  }
}

// A soft light in the dark footer that follows a mouse around (moved with a transform only: no repaint as it goes).
function footerLight(contact) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const spot = Object.assign(document.createElement('i'), { className: 'contact-light' });
  contact.prepend(spot);
  const x = gsap.quickTo(spot, 'x', { duration: 0.6, ease: 'power3.out' }), y = gsap.quickTo(spot, 'y', { duration: 0.6, ease: 'power3.out' });
  let fresh = true;
  contact.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = contact.getBoundingClientRect(), px = e.clientX - r.left - spot.offsetWidth / 2, py = e.clientY - r.top - spot.offsetHeight / 2;
    if (fresh) { gsap.set(spot, { x: px, y: py }); fresh = false; } // appear where the mouse came in, not glide over from the last spot
    x(px);
    y(py);
    spot.classList.add('on');
  });
  contact.addEventListener('pointerleave', () => { spot.classList.remove('on'); fresh = true; });
}

// The marquee can be taken hold of and thrown: a row follows the hand (or the finger; up and down is still the page's),
// keeps going when let go, and slows to a stop, leaning into its speed like it does with the scroll. It rides the
// `translate` property, wrapped by one copy's width, under whatever the scroll has set on the transform.
function throwable(marquee, rows, lean) {
  const st = rows.map((row, i) => ({ row, i, off: 0, v: 0, period: 1 }));
  const measure = () => st.forEach((s) => { s.period = (s.row.scrollWidth + parseFloat(getComputedStyle(s.row).columnGap || 0)) / 3 || 1; });
  const draw = (s) => { s.row.style.translate = `${(-((((-s.off) % s.period) + s.period) % s.period)).toFixed(1)}px 0`; };
  ScrollTrigger.addEventListener('refresh', () => { measure(); st.forEach(draw); });
  measure();

  let drag = null, coasting = false;
  function coast(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    let moving = false;
    for (const s of st) {
      if (s === drag?.s || Math.abs(s.v) < 6) { if (s !== drag?.s && s.v) { s.v = 0; lean[s.i](0); } continue; }
      s.off += s.v * dt;
      s.v *= Math.exp(-dt * 1.9);
      lean[s.i](gsap.utils.clamp(-11, 11, -s.v / 150));
      draw(s);
      moving = true;
    }
    if (!moving && !drag) { gsap.ticker.remove(coast); coasting = false; }
  }
  marquee.addEventListener('pointerdown', (e) => {
    const s = st.find((k) => k.row.contains(e.target));
    if (!s || e.button > 0) return;
    drag = { s, id: e.pointerId, x: e.clientX, t: performance.now(), moved: 0 };
    s.v = 0;
  });
  marquee.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, now = performance.now(), dt = Math.max(1, now - drag.t);
    drag.x = e.clientX;
    drag.t = now;
    if (!drag.moved && Math.abs(dx) > 0) { marquee.setPointerCapture?.(e.pointerId); marquee.classList.add('held'); }
    drag.moved += Math.abs(dx);
    drag.s.off += dx;
    drag.s.v += ((dx / dt) * 1000 - drag.s.v) * 0.35; // the hand's speed, smoothed
    lean[drag.s.i](gsap.utils.clamp(-11, 11, -drag.s.v / 150));
    draw(drag.s);
  });
  const letGo = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { s } = drag;
    if (performance.now() - drag.t > 120) s.v = 0; // it was held still before being let go: put down, not thrown
    drag = null;
    marquee.classList.remove('held');
    if (Math.abs(s.v) < 6) lean[s.i](0);
    if (!coasting) { coasting = true; gsap.ticker.add(coast); }
  };
  marquee.addEventListener('pointerup', letGo);
  marquee.addEventListener('pointercancel', letGo);
}
