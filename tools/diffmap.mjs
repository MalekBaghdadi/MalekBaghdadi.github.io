// node tools/diffmap.mjs a.png b.png : grid of differing-pixel counts (rows x cols over the image)
import sharp from 'sharp';
const [a, b, cols = 12, rows = 8] = process.argv.slice(2);
const A = await sharp(a).raw().toBuffer({ resolveWithObject: true }), B = await sharp(b).raw().toBuffer();
const { width: w, height: h, channels: c } = A.info;
const g = Array.from({ length: +rows }, () => Array(+cols).fill(0));
for (let p = 0; p < w * h; p++) { const i = p * c; if (Math.max(Math.abs(A.data[i] - B[i]), Math.abs(A.data[i + 1] - B[i + 1]), Math.abs(A.data[i + 2] - B[i + 2])) > 3) g[Math.floor((p / w | 0) / h * rows)][Math.floor((p % w) / w * cols)]++; }
console.log(g.map((r) => r.map((n) => String(n).padStart(5)).join('')).join('\n'));
