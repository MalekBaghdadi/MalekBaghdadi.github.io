// Moves the mouse across the hero name and screenshots it: letters under the pointer should narrow.
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await p.setViewport({ width: 1440, height: 900 });
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2800));
await p.mouse.move(300, 360);
for (let x = 300; x <= 760; x += 40) { await p.mouse.move(x, 380); await new Promise((r) => setTimeout(r, 30)); }
await new Promise((r) => setTimeout(r, 700));
await p.screenshot({ path: 'tools/out/hero-pinch.png' });
const widths = await p.evaluate(() => [...document.querySelectorAll('.name .ch')].map((c) => c.style.fontStretch));
console.log(widths.join(' '));
await b.close();
