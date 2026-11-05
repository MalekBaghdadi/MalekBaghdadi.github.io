// Packages the site as ONE self-contained html file (inline CSS and JS, fonts and Logbook frames as data URIs),
// for hosts that only allow inline code, such as a private claude.ai page. The normal build (npm run build) is unchanged.
//   node tools/make-preview.mjs   ->   artifact/site.html
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';

rmSync('artifact', { recursive: true, force: true });
mkdirSync('artifact', { recursive: true });
execSync('npx vite build --base=./ --outDir artifact/build --emptyOutDir --assetsInlineLimit=300000', { stdio: 'ignore' });

const html = readFileSync('artifact/build/index.html', 'utf8');
const css = readFileSync('artifact/build/' + /href="\.\/(assets\/[^"]+\.css)"/.exec(html)[1], 'utf8');
const js = readFileSync('artifact/build/' + /src="\.\/(assets\/[^"]+\.js)"/.exec(html)[1], 'utf8').replaceAll('</script', '<\\/script');
const body = /<body>([\s\S]*)<\/body>/.exec(html)[1];

const frames = {};
for (const f of readdirSync('public/logbook')) if (f.endsWith('.webp')) frames[f] = 'data:image/webp;base64,' + readFileSync('public/logbook/' + f).toString('base64');

const page = `<title>Malek Baghdadi Portfolio</title>
<style>${css}</style>
<script>document.documentElement.classList.add('js')</script>
${body}
<script>window.__FRAMES=${JSON.stringify(frames)}</script>
<script type="module">${js}</script>
`;
writeFileSync('artifact/site.html', page);
console.log(`artifact/site.html  ${(page.length / 1048576).toFixed(2)} MB  (css ${(css.length / 1024) | 0} KB incl. fonts, js ${(js.length / 1024) | 0} KB, ${Object.keys(frames).length} frames)`);
