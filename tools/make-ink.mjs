// Generates src/scenes/neatink-ink.json: the handwriting the NeatInk scene "writes".
// Page space is 880 px wide with ruled lines every 38 px (the first at y = 118), like the tablet's page view.
import { writeFileSync } from 'node:fs';
import { handwrite, schedule } from './ink-lib.mjs';

const F = 'scripts';
const X = 64;
const title = handwrite('Monday notes', { x: X, baseline: 156, scale: 2.1, size: 3.4, tracking: 1.5, font: F, seed: 11 });
const l2 = handwrite('finish the report, it isnt due till friday', { x: X, baseline: 232, scale: 1.45, size: 2.5, font: F, seed: 21 });
const l3 = handwrite('call the team about the demo', { x: X, baseline: 270, scale: 1.45, size: 2.5, font: F, seed: 31 });
const notes = schedule([title.strokes, l2.strokes, l3.strokes]);

// The PDF page's margin note, written in red.
const note = handwrite('ask about this', { x: 0, baseline: 0, scale: 1.3, size: 2.6, font: F, seed: 41 });
const pdfnote = schedule([note.strokes]);

const out = { notes, pdfnote, noteWidth: Math.round(note.right) };
const json = JSON.stringify(out);
writeFileSync('src/scenes/neatink-ink.json', json);
console.log('strokes', notes.strokes.length, '+', pdfnote.strokes.length, 'size', Math.round(json.length / 1024) + ' KB', 'line right edges', Math.round(title.right), Math.round(l2.right), Math.round(l3.right));
