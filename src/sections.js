import { gsap } from 'gsap';
import { splitChars } from './split.js';

// The CV sections after the demos move with the scroll too, in the demos' language: headings that open to full
// width, entries that rise into place, a work timeline that draws itself, a skills marquee that slides with you,
// and a contact card that grows to the full width. All of it is scrubbed: it follows the scroll both ways.
export function initSections({ reduced }) {
  if (reduced) return;
  const scrub = 0.5;
  const st = (trigger, start, end) => ({ trigger, start, end, scrub });

  for (const h of document.querySelectorAll('.ledger > h2, .contact h2')) {
    gsap.fromTo(splitChars(h), { fontStretch: '55%' }, { fontStretch: '125%', ease: 'none', stagger: 0.06, scrollTrigger: st(h, 'top 95%', 'top 55%') });
  }
  for (const el of document.querySelectorAll('.entry, .skills dt, .skills dd, .contact dt, .contact dd')) {
    gsap.fromTo(el, { y: 64, opacity: 0.12 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: st(el, 'top 98%', 'top 68%') });
  }

  const list = document.querySelector('#experience .entries');
  if (list) {
    const rail = document.createElement('i');
    rail.className = 'rail';
    rail.innerHTML = '<b></b>';
    list.prepend(rail);
    gsap.fromTo(rail.firstChild, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: st(list, 'top 75%', 'bottom 60%') });
  }

  document.querySelectorAll('.mq-row').forEach((row, i) => {
    gsap.fromTo(row, { xPercent: i % 2 ? -28 : 0 }, { xPercent: i % 2 ? 0 : -28, ease: 'none', scrollTrigger: st(row.parentElement, 'top bottom', 'bottom top') });
  });

  const contact = document.querySelector('.contact');
  if (contact) {
    gsap.fromTo(contact, { clipPath: 'inset(0% 5% 0% 5% round 48px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: st(contact, 'top bottom', 'top 25%') });
  }
}
