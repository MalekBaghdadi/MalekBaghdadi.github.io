// One-off look at the real Logbook UI with demo data: screenshots + the controls on each tab.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { APP, startEnv, stopEnv, writeDocs, signUpUser, resetAccounts, demoDocs } from './env.mjs';
const OUT = 'tools/out/lb-explore/';
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
try {
  console.log('starting emulators + app...');
  await startEnv();
  await resetAccounts();
  browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
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
  const got = await page.$('::-p-text(Got it)');
  if (got) { await got.click(); await wait(500); }
  await page.screenshot({ path: OUT + '01-today.png' });
  const labels = await page.evaluate(() => [...document.querySelectorAll('button, a')].map((b) => (b.getAttribute('aria-label') || b.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean));
  console.log('today controls:', JSON.stringify(labels));
  const tabs = [['history', '#/history', '02'], ['stats', '#/stats', '03'], ['profile', '#/profile', '04']];
  for (const [name, hash, num] of tabs) {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await wait(1500);
    await page.screenshot({ path: `${OUT}${num}-${name}.png` });
  }
  console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
} catch (e) {
  console.error('FAILED', e.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  stopEnv();
}
