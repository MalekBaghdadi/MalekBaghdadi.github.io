// Scrolls the way a person does (mouse wheel), to check smooth scrolling drives the animations, and that the
// "Watch the demos" link glides to the first demo.
import puppeteer from 'puppeteer-core';
const url = process.argv[2] ?? 'http://localhost:5199/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(url, { waitUntil: 'networkidle0' });
await wait(2200);
const read = () => p.evaluate(() => ({
  y: Math.round(scrollY),
  lenis: document.documentElement.classList.contains('lenis'),
  signal: getComputedStyle(document.querySelector('.n2')).opacity,
  nameOpacity: getComputedStyle(document.querySelector('.name')).opacity,
}));
console.log('at rest      ', JSON.stringify(await read()));
await p.mouse.move(700, 500);
for (let i = 0; i < 12; i++) { await p.mouse.wheel({ deltaY: 120 }); await wait(16); }
await wait(250);
const mid = await read();
await wait(1500);
console.log('wheel 1440px ', 'mid-glide y', mid.y, '->', JSON.stringify(await read()));
await p.evaluate(() => scrollTo(0, 0));
await wait(1200);
await p.click('.pitch-actions .btn');
await wait(2600);
const target = await p.evaluate(() => Math.round(document.getElementById('neatink').getBoundingClientRect().top + scrollY));
console.log('demos link    y', (await read()).y, 'NeatInk starts at', target);
console.log(errors.length ? 'errors: ' + errors.join(' | ') : 'no page errors');
await b.close();
