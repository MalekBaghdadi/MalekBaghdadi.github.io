import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitChars, splitWords } from './split.js';
import { initRunner } from './runner.js';
import { initFooterWaves } from './hero-waves.js';

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
      dd.append(Object.assign(document.createElement('span'), { className: 'tok', textContent: t + (i < items.length - 1 ? ',' : '') }));
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

  const list = document.querySelector('#experience .entries');
  if (list) {
    const rail = document.createElement('i');
    rail.className = 'rail';
    rail.innerHTML = '<b></b><b></b>';
    list.prepend(rail);
    const [fill, dot] = rail.children;
    gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: st(list, 'top 75%', 'bottom 60%') });
    gsap.fromTo(dot, { y: 0 }, { y: () => rail.clientHeight, ease: 'none', scrollTrigger: { ...st(list, 'top 75%', 'bottom 60%'), invalidateOnRefresh: true } });
    // the dot sends out a ping as it rides the rail (style.css), only while the timeline is on screen
    new IntersectionObserver(([e]) => list.classList.toggle('is-live', e.isIntersecting)).observe(list);
  }

  document.querySelectorAll('.mq-row').forEach((row, i) => {
    gsap.fromTo(row, { xPercent: i % 2 ? -28 : 0 }, { xPercent: i % 2 ? 0 : -28, ease: 'none', scrollTrigger: st(row.parentElement, 'top bottom', 'bottom top') });
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
      initFooterWaves(contact, rc.querySelector('svg'), back, 0.84);
    }
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
