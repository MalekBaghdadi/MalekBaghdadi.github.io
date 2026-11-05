// node tools/diff.mjs a.png b.png : how many pixels differ, by how much, and where
import sharp from 'sharp';
const [a, b] = process.argv.slice(2);
const A = await sharp(a).raw().toBuffer({ resolveWithObject: true }), B = await sharp(b).raw().toBuffer();
const { width: w, channels: c } = A.info;
let n = 0, max = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
for (let i = 0; i < A.data.length; i += c) {
  const d = Math.max(Math.abs(A.data[i] - B[i]), Math.abs(A.data[i + 1] - B[i + 1]), Math.abs(A.data[i + 2] - B[i + 2]));
  if (d > 0) { n++; max = Math.max(max, d); const p = i / c, x = p % w, y = (p / w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
}
console.log(n ? `${n} px differ, max channel delta ${max}, box x ${x0}-${x1} y ${y0}-${y1}` : 'identical');
