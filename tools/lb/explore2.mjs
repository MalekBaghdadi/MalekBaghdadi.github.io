// Second look: previous month in History, the Collect reveal, and a Compete scoreboard with a simulated partner.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { APP, startEnv, stopEnv, writeDocs, signUpUser, resetAccounts, demoDocs, trackingDay } from './env.mjs';
const OUT = 'tools/out/lb-explore2/';
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
try {
  await startEnv();
  await resetAccounts();
  browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  const uid = await signUpUser('demo@logbook.test', 'emulator-only-pass');
  await writeDocs(demoDocs(uid));
  await page.goto(APP, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.setItem('logbook:e2e-ach', '1'));
  await page.type('#email', 'demo@logbook.test');
  await page.type('#password', 'emulator-only-pass');
  await page.locator('button[type=submit]').click();
  await wait(3500);
  const shot = (n) => page.screenshot({ path: `${OUT}${n}.png` });
  const press = async (label) => {
    const ok = await page.evaluate((l) => {
      const b = [...document.querySelectorAll('button, a')].find((x) => x.innerText.trim() === l || x.getAttribute('aria-label') === l);
      b?.scrollIntoView({ block: 'center' });
      b?.click();
      return !!b;
    }, label);
    if (!ok) console.log('NO BUTTON:', label);
    await wait(700);
  };

  await press('Dismiss');
  await shot('01-today-clean');
  // History, previous month
  await page.evaluate(() => { location.hash = '#/history'; });
  await wait(1200);
  const prev = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.getAttribute('aria-label')).filter((l) => l && /month|previous|next/i.test(l)));
  console.log('month buttons:', prev);
  await press(prev[0] ?? 'Previous month');
  await wait(600);
  await shot('02-history-oct');

  // Profile: Collect all
  await page.evaluate(() => { location.hash = '#/profile'; });
  await wait(1200);
  await press('Collect all');
  for (const [i, ms] of [[1, 400], [2, 700], [3, 900], [4, 1200], [5, 1500]]) { await wait(ms); await shot(`03-collect-${i}`); }
  const dialogText = await page.evaluate(() => document.querySelector('dialog[open]')?.innerText?.slice(0, 160) ?? 'no dialog');
  console.log('dialog:', dialogText.replace(/\s+/g, ' '));

  // Compete with a simulated partner
  await page.keyboard.press('Escape');
  await wait(600);
  await page.evaluate(() => { location.hash = '#/compete'; });
  await wait(1200);
  await shot('04-compete-empty');
  await page.evaluate(() => window.__e2eCompete.pair('Sam'));
  await wait(1500);
  await shot('05-compete-paired');
  const links = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean));
  console.log('compete buttons:', JSON.stringify(links));
  console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
} catch (e) {
  console.error('FAILED', e.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  stopEnv();
}
