// Splits an element's text into spans so its type or opacity can be animated piece by piece.

/** One span per character. The element keeps its text for screen readers as a label; the pieces are hidden from them. */
export function splitChars(el) {
  if (!el) return [];
  if (el.dataset.split) return [...el.querySelectorAll('.ch')];
  const text = el.textContent;
  el.setAttribute('aria-label', text.trim());
  el.textContent = '';
  for (const c of text) {
    const s = document.createElement('span');
    s.className = 'ch';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = c;
    el.append(s);
  }
  el.dataset.split = '1';
  return [...el.querySelectorAll('.ch')];
}

/** One span per word, separated by real spaces, so the text still reads and wraps normally. */
export function splitWords(el) {
  if (!el) return [];
  if (el.dataset.split) return [...el.querySelectorAll('.w')];
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((w, i) => {
    const s = document.createElement('span');
    s.className = 'w';
    s.textContent = w;
    el.append(s);
    if (i < words.length - 1) el.append(' ');
  });
  el.dataset.split = '1';
  return [...el.querySelectorAll('.w')];
}
