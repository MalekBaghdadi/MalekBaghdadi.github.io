// The hidden extras (spoilers; src/eggs.js, hunt.js, birds.js, hero-play.js, stickers.js and friends): each one is found
// the way a visitor would find it, and works, on a desktop and on a phone, without errors. Pictures of the visible ones
// go to tools/out/eggs/ for a look.
//   node tools/eggs-test.mjs [url]        (CHROME=... for another browser)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5199/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); };
mkdirSync('tools/out/eggs', { recursive: true });

// every hidden thing, and the ones a phone can't reach (no keyboard, no mouse, or the pigeons sit behind the phone)
const ALL = ['ping', 'clock', 'letters', 'rubber', 'visitor', 'ink', 'convert', 'poke', 'moon', 'lights', 'streak', 'stickers', 'arcade', 'fling', 'coo', 'offline', 'konami', 'console', 'tab'];
const DESK = ['rubber', 'ink', 'convert', 'poke', 'streak', 'coo', 'offline', 'konami', 'console'];

// The desktop page is told it has a mouse (a headless browser on a machine without one says it has none); the phone
// page's touch emulation overrides that.
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4'],
});
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const phone = w < 700, tag = phone ? 'phone: ' : '', pic = (n) => `tools/out/eggs/${phone ? 'phone' : 'desktop'}-${n}.png`;
  const mine = ALL.filter((id) => !phone || !DESK.includes(id));
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
  const errors = [], logs = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => logs.push(m.text()));
  await p.goto(url, { waitUntil: 'networkidle0' });
  await p.evaluate(() => { localStorage.removeItem('bugrun-gold'); localStorage.removeItem('eggs-found'); });
  await p.reload({ waitUntil: 'networkidle0' });
  await wait(1500);

  // Scroll so a pinned scene is `f` of the way through its story.
  const into = (id, f) => p.evaluate((id, f) => {
    const s = document.getElementById(id), sp = s.parentElement.classList.contains('pin-spacer') ? s.parentElement : s;
    scrollTo(0, sp.getBoundingClientRect().top + scrollY + (sp.offsetHeight - innerHeight) * f);
  }, id, f);
  const toast = () => p.evaluate(() => { const t = document.querySelector('.egg-toast.on'); return t ? t.innerText : ''; });
  const press = (x, y) => (phone ? p.touchscreen.tap(x, y) : p.mouse.click(x, y));
  const pressEl = async (sel) => { const el = typeof sel === 'string' ? await p.$(sel) : sel; if (phone) await el.tap(); else await el.click(); };
  const found = () => p.evaluate(() => JSON.parse(localStorage.getItem('eggs-found') || '[]'));
  const until = async (fn, ms) => { for (const t0 = Date.now(); Date.now() - t0 < ms;) { if (await fn()) return true; await wait(150); } return false; };

  // the console says hello
  check(`${tag}a hello in the console, with a hint`, logs.some((l) => /opened the console/.test(l)) && logs.some((l) => /cheat code/.test(l)));
  // the footer's small print knows how many there are to find here
  const tally0 = await p.$eval('.hunt-btn', (b) => b.textContent);
  check(`${tag}the small print counts what this device can find`, tally0 === `0 of ${mine.length} hidden things found`, tally0);

  // the signal bars: a ping, and the name feels it pass
  await pressEl('.net');
  let narrow = 150;
  for (let k = 0; k < 12; k++) { narrow = Math.min(narrow, await p.$$eval('.name .ch', (l) => Math.min(...l.map((c) => parseFloat(c.style.fontStretch))))); await wait(70); }
  check(`${tag}pressing the signal bars sends a ping, and the letters squeeze as it passes`, narrow < 130 && /Signal sent/.test(await toast()) && (await p.$eval('.net', (n) => n.classList.contains('pinged'))), `narrowest ${narrow}%`);
  check(`${tag}the note counts it: 1 of ${mine.length}`, new RegExp(`1 of ${mine.length} found`).test(await toast()), (await toast()).replace(/\n/g, ' / '));
  await p.screenshot({ path: pic('ping') });
  await wait(1800);
  check(`${tag}and the name is back to full width after`, (await p.$$eval('.name .ch', (l) => Math.min(...l.map((c) => parseFloat(c.style.fontStretch))))) > 149);

  // the clock: the visitor's own time
  await pressEl('.clock');
  await wait(200);
  const clock = await p.$eval('.clock', (c) => c.innerText.replace(/\s+/g, ' '));
  check(`${tag}pressing the clock shows your own time against Beirut's`, /^You \d\d:\d\d .*Beirut$/.test(clock) && /Your time/.test(await toast()), clock);
  await pressEl('.clock');
  await wait(200);
  check(`${tag}and again puts Beirut's back`, /^Beirut \d\d:\d\d$/.test(await p.$eval('.clock', (c) => c.innerText.replace(/\s+/g, ' ').trim())));

  // the name's letters hop, and all thirteen make a wave
  const letters = await p.$$('.name .ch');
  check(`${tag}the name is thirteen letters`, letters.length === 13, `${letters.length}`);
  for (const [i, el] of letters.entries()) {
    await pressEl(el);
    if (i === 0) check(`${tag}a clicked letter hops`, await el.evaluate((e) => e.classList.contains('hop') && e.getAnimations().length > 0));
    await wait(40);
  }
  await wait(500);
  check(`${tag}all thirteen letters: the name waves and says so`, /thirteen/.test(await toast()) && (await p.$$eval('.name .ch.lit', (l) => l.length)) > 0);
  await p.screenshot({ path: pic('letters') });
  await wait(1200);

  if (!phone) {
    // ...and stretch like rubber when pulled
    const g = await letters[7].boundingBox(), gx = g.x + g.width / 2, gy = g.y + g.height / 2;
    await p.mouse.move(gx, gy);
    await p.mouse.down();
    await p.mouse.move(gx + 90, gy + 140, { steps: 8 });
    await wait(60);
    const pulled = await letters[7].evaluate((e) => e.style.translate);
    await p.screenshot({ path: pic('rubber') });
    await p.mouse.up();
    await wait(1700);
    check('a pulled letter stretches away and snaps back', /px/.test(pulled) && (await p.$$eval('.name .ch', (l) => l.every((c) => !c.style.translate))) && /Rubber/.test(await toast()), pulled);
    check('a pull is not a hop', !(await letters[7].evaluate((e) => e.getAnimations().length)));
    await p.mouse.move(1300, 760);
  }

  // the visitor: left alone at the top, a pigeon lands on the "l"
  const landed = await until(() => p.evaluate(() => document.querySelector('.birds .fl .pc-bird')?.dataset.f === 's'), 16000);
  const perch = landed ? await p.evaluate(() => {
    const b = document.querySelector('.birds .fl').getBoundingClientRect(), l = document.querySelectorAll('.name .ch')[2].getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, on: b.left < l.right && b.right > l.left && b.bottom > l.top - 4 && b.bottom < l.top + l.height * 0.5 };
  }) : null;
  check(`${tag}left alone at the top, a pigeon lands on the name`, landed && perch.on, JSON.stringify(perch));
  await p.screenshot({ path: pic('visitor') });
  if (landed) {
    if (phone) await p.touchscreen.tap(perch.x, perch.y); else await p.mouse.move(perch.x + 30, perch.y + 20, { steps: 4 });
    await wait(300);
    check(`${tag}and is off the moment it is bothered`, /Gone/.test(await toast()) && (await until(() => p.evaluate(() => !document.querySelector('.birds .fl')), 2500)));
  }

  // a pigeon on the mosque, poked (a little off the bird: they are small). On a phone the mosque is behind the phone.
  await into('pigeon', 0.15);
  await wait(1200);
  const [bird, hid] = await p.evaluate(() => {
    const dev = document.querySelector('#pigeon .pg-phone').getBoundingClientRect();
    const at = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2 + 7, y: r.top + r.height / 2 - 5, w: r.width }; };
    const sat = [...document.querySelectorAll('#pigeon .pc-bird[data-f="s"]')].map(at).filter((b) => b.w);
    const behind = (b) => b.x - 7 > dev.left && b.x - 7 < dev.right && b.y + 5 > dev.top && b.y + 5 < dev.bottom;
    return [sat.find((b) => !behind(b)), sat.find(behind)];
  });
  check(`${tag}pigeons are sitting on the mosque at the start`, !!(bird || hid));
  if (hid && !bird) {
    await press(hid.x, hid.y);
    await wait(250);
    check(`${tag}a pigeon hidden behind the phone can't be poked`, !(await p.$('.pc-say')) && !(await p.$('.pc-bird.poked')));
  }
  if (bird) {
    await press(bird.x, bird.y);
    await wait(250);
    const poke = await p.evaluate(() => ({ poked: document.querySelectorAll('.pc-bird.poked').length, say: document.querySelector('.pc-say')?.textContent ?? '' }));
    check(`${tag}a poked pigeon hops and says something`, poke.poked === 1 && /coo/.test(poke.say), poke.say);
    await p.screenshot({ path: pic('pigeon'), captureBeyondViewport: false });
    await wait(1600);
    const after = await p.evaluate(() => ({ poked: document.querySelectorAll('.pc-bird.poked').length, say: document.querySelectorAll('.pc-say').length, f: [...document.querySelectorAll('#pigeon .pc-bird')].filter((b) => b.getBoundingClientRect().width).map((b) => b.dataset.f).join('') }));
    check(`${tag}and settles back down`, after.poked === 0 && after.say === 0 && /^s+$/.test(after.f), JSON.stringify(after));
  }
  const links = await p.evaluate(() => { const a = document.querySelector('#pigeon .copy a'); const r = a.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === a; });
  check(`${tag}the scene's links are still clickable`, links);

  // the moon throws a shooting star and moves on a phase; the city's windows switch on and off
  await into('pigeon', 0.5);
  await wait(1200);
  const moon = await p.evaluate(() => { const r = document.querySelector('#pigeon .pc-moon').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, cut: document.querySelector('#pigeon .pc-moon mask circle').getAttribute('cx') }; });
  await press(moon.x, moon.y);
  await wait(250);
  const wish = await p.evaluate(() => ({ star: !!document.querySelector('#pigeon .pc-shoot'), cut: document.querySelector('#pigeon .pc-moon mask circle').getAttribute('cx') }));
  check(`${tag}a click on the moon: a shooting star, and the next phase`, wish.star && wish.cut !== moon.cut && /wish/.test(await toast()), JSON.stringify(wish));
  await p.screenshot({ path: pic('moon') });
  await wait(1100);
  check(`${tag}the star burns out`, !(await p.$('#pigeon .pc-shoot')));
  const panes = await p.evaluate(() => {
    const dev = document.querySelector('#pigeon .pg-phone').getBoundingClientRect(), frame = document.querySelector('#pigeon .pc-city').getBoundingClientRect(), out = [];
    for (const r of [...document.querySelectorAll('#pigeon .pc-sky-line rect[width="7"]')].map((e) => e.getBoundingClientRect())) {
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < frame.left + 8 || x > frame.right - 8 || y > frame.bottom - 4 || (x > dev.left && x < dev.right && y > dev.top && y < dev.bottom)) continue;
      if (document.elementFromPoint(x, y)?.closest('a, button, .copy > *')) continue;
      if (out.every(([ox, oy]) => Math.hypot(ox - x, oy - y) > 44)) out.push([x, y]);
    }
    return out.slice(0, 5);
  });
  for (const [x, y] of panes) { await press(x, y); await wait(90); }
  await wait(300);
  check(`${tag}five windows clicked, five lights on, and somebody's home`, panes.length === 5 && (await p.$$eval('.pc-mine rect', (l) => l.length)) === 5 && /home/.test(await toast()), `${panes.length} windows`);
  await p.screenshot({ path: pic('lights') });
  await press(...panes[0]);
  await wait(150);
  check(`${tag}and a second click switches one off`, (await p.$$eval('.pc-mine rect', (l) => l.length)) === 4);

  // NeatInk: ink on the page, with a mouse (a finger scrolls instead); enough of it is "converted"
  await into('neatink', 0.3);
  await wait(1200);
  if (phone) {
    await p.touchscreen.tap(60, 200);
    await wait(300);
    check(`${tag}a finger on NeatInk's page doesn't draw`, !(await p.$('.ni-scribble')));
  } else {
    await p.mouse.move(200, 120);
    await wait(400); // the ink library arrives while the pointer is over the paper
    await p.mouse.down();
    for (let k = 0; k <= 40; k++) await p.mouse.move(200 + k * 25, 120 + Math.sin(k / 3) * 60 + k * 9, { steps: 1 });
    const ink = await p.evaluate(() => {
      const c = document.querySelector('.ni-scribble');
      if (!c) return { n: 0 };
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 16) if (d[i] > 40) n++;
      return { n, over: getComputedStyle(c).zIndex };
    });
    await p.screenshot({ path: pic('ink') });
    await p.mouse.up();
    check('writing on NeatInk\'s page leaves ink, over the tablet too', ink.n > 400, `${ink.n} inked pixels`);
    await wait(1500);
    const read = await p.evaluate(() => document.querySelector('.ni-read')?.innerText ?? '');
    await p.screenshot({ path: pic('convert') });
    check('left to rest, the writing is "converted" to type', /Hire Malek/.test(read) && /Converted/.test(await toast()), read.replace(/\n/g, ' / '));
    await wait(1500);
    check('and the ink is gone, taking its canvas with it', !(await p.$('.ni-scribble')));
    await wait(2600);
    check('then the type goes too', !(await p.$('.ni-read')));
    // a scribble too short to read just fades
    await p.mouse.move(300, 140);
    await p.mouse.down();
    await p.mouse.move(360, 170, { steps: 4 });
    await p.mouse.up();
    await wait(1400);
    check('a short scribble is left alone', !(await p.$('.ni-read')));
    await wait(1500);

    // Logbook's floor: days logged by hand
    await into('logbook', 0.4);
    await wait(1500);
    const before = +(await p.$eval('.lb-count b', (b) => b.textContent));
    for (let k = 0; k < 7; k++) { await p.mouse.click(80 + k * 62, h - 100 + (k % 3) * 28); await wait(60); }
    await wait(200);
    const days = await p.evaluate(() => ({ mine: document.querySelectorAll('.lb-mine').length, n: +document.querySelector('.lb-count b').textContent, hover: !document.querySelector('.lb-hover').hidden }));
    await p.screenshot({ path: pic('floor') });
    check('seven days logged on Logbook\'s floor, and counted', days.mine === 7 && days.n === before + 7 && days.hover && /Seven days/.test(await toast()), JSON.stringify(days));
    await p.mouse.click(80, h - 100);
    await wait(150);
    check('a second click takes a day back', (await p.$$eval('.lb-mine', (l) => l.length)) === 6 && +(await p.$eval('.lb-count b', (b) => b.textContent)) === before + 6);
  }

  // the CV's stickers: seven, grey until pressed
  const stickers = await p.$$('.sticker');
  check(`${tag}every entry on the CV has a sticker`, stickers.length === 7, `${stickers.length}`);
  for (const el of stickers) {
    await el.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await wait(900);
    await pressEl(el);
    await wait(120);
  }
  await p.screenshot({ path: pic('stickers') });
  check(`${tag}all seven pressed: they keep their colours, and it counts`, (await p.$$eval('.sticker.got', (l) => l.length)) === 7 && /seven stickers/.test(await toast()));

  // the scroll's runner hops when tapped, and a block bumps
  await p.$eval('.runner-me', (e) => e.scrollIntoView({ block: 'center' }));
  await wait(900);
  const me = await p.$('.runner-me'), meBox = await me.boundingBox();
  if (meBox && meBox.x > 4 && meBox.x < w - 30) {
    await pressEl(me);
    check(`${tag}the runner hops when tapped`, await me.evaluate((e) => e.classList.contains('hop') && e.dataset.frame === 'j'));
    await wait(600);
  }

  // the marquee can be thrown, and wraps
  await p.$eval('.marquee', (e) => e.scrollIntoView({ block: 'center' }));
  await wait(1000);
  const row = await (await p.$('.mq-row')).boundingBox(), ry = row.y + row.height / 2;
  if (phone) {
    await p.touchscreen.touchStart(300, ry);
    for (let k = 1; k <= 8; k++) { await p.touchscreen.touchMove(300 - k * 30, ry); await wait(8); }
    await p.touchscreen.touchEnd();
  } else {
    await p.mouse.move(900, ry);
    await p.mouse.down();
    for (let k = 1; k <= 8; k++) { await p.mouse.move(900 - k * 70, ry); await wait(8); }
    await p.mouse.up();
  }
  await wait(120);
  const t1 = await p.$eval('.mq-row', (r) => parseFloat(r.style.translate));
  await wait(400);
  const t2 = await p.$eval('.mq-row', (r) => parseFloat(r.style.translate));
  await p.screenshot({ path: pic('marquee') });
  check(`${tag}a thrown marquee row keeps going after it is let go`, t1 < 0 && t2 !== t1 && /Wheee/.test(await toast()), `${t1} → ${t2}`);
  const covered = await p.$eval('.mq-row', (r) => { const b = r.getBoundingClientRect(); return b.left <= 0 && b.right >= innerWidth; });
  check(`${tag}and never shows an end`, covered);
  check(`${tag}skills used on this page link to where`, (await p.$$eval('.skills .tok a', (l) => l.map((a) => `${a.textContent}>${a.getAttribute('href')}`).join(' '))).includes('Kotlin>#pigeon'));

  // leaving the tab: the title loses the connection, and finds it again
  const titles = await p.evaluate(async () => {
    const title = document.title, out = [title];
    const set = (h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); document.dispatchEvent(new Event('visibilitychange')); out.push(document.title); };
    set(true); set(false);
    await new Promise((r) => setTimeout(r, 2000));
    out.push(document.title);
    return out;
  });
  check(`${tag}leaving the tab: the title goes offline and comes back`, /Connection lost/.test(titles[1]) && /Back online/.test(titles[2]) && titles[3] === titles[0], titles.slice(1).join(' → '));

  // the footer: its bars ping too, the log lists what was found, and a pigeon carries you back to the top
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await wait(1800);
  await pressEl('.reconnect');
  check(`${tag}the footer's bars ping, and the links light up as the ring passes`, await until(() => p.evaluate(() => document.querySelectorAll('.contact dd a.pinged').length === 4), 2500));
  check(`${tag}the small print says how far you scrolled`, /You scrolled [\d.]+ m to get here, about \d+ pigeons/.test(await p.$eval('.hunt-odo', (o) => o.textContent)), await p.$eval('.hunt-odo', (o) => o.textContent));
  const sofar = (await found()).length;
  await pressEl('.hunt-btn');
  await wait(200);
  const log = await p.evaluate(() => ({ open: !document.querySelector('.hunt-log').hidden, got: document.querySelectorAll('.hunt-log li.got').length, all: document.querySelectorAll('.hunt-log li:not(.more)').length, btn: document.querySelector('.hunt-btn').textContent }));
  await p.screenshot({ path: pic('log') });
  check(`${tag}the log lists what has been found, and hints at the rest`, log.open && log.got === sofar && log.all === mine.length && log.btn.startsWith(`${sofar} of ${mine.length}`), JSON.stringify(log));
  await p.keyboard.press('Escape');
  check(`${tag}Esc closes it`, await p.$eval('.hunt-log', (l) => l.hidden));
  await pressEl('.hunt-up');
  await wait(1300);
  await p.screenshot({ path: pic('carrier') });
  check(`${tag}"by pigeon": a pigeon takes off with the mail`, await p.evaluate(() => !!document.querySelector('.birds .fl .fl-mail')));
  const home = await until(() => p.evaluate(() => scrollY === 0 && document.querySelector('.birds .fl .pc-bird')?.dataset.f === 's'), 9000);
  check(`${tag}and lands on the name once the page is back at the top`, home, `scrollY ${await p.evaluate(() => scrollY)}`);

  if (!phone) {
    await p.mouse.move(1300, 760);
    // typing "coo": a flock crosses with the mail
    await p.keyboard.type('coo', { delay: 30 });
    await wait(500);
    await p.screenshot({ path: pic('coo') });
    check('typing "coo" sends a flock across', (await p.$$eval('.birds .fl', (l) => l.length)) >= 9 && /Coo/.test(await toast()));
    await wait(4000);
    check('and they fly off the other side', (await p.$$eval('.birds .fl', (l) => l.length)) <= 1);

    // typing "offline"
    await p.keyboard.type('offline', { delay: 30 });
    await wait(150);
    const dropped = await p.evaluate(() => document.documentElement.classList.contains('egg-offline'));
    await p.screenshot({ path: pic('offline') });
    await wait(1600);
    check('typing "offline" drops the signal for a moment, then explains', dropped && !(await p.evaluate(() => document.documentElement.classList.contains('egg-offline'))) && /No connection/.test(await toast()));

    // the console's own door
    const said = await p.evaluate(() => window.eggs());
    check('eggs() in the console lists them', /hint/.test(said) && /developer/.test(await toast()) && logs.some((l) => /eggs\(\)/.test(l)));

    // the cheat code
    for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) { await p.keyboard.press(k); await wait(30); }
    await wait(500);
    const rain = await p.evaluate(() => !!document.querySelector('.egg-rain'));
    await p.screenshot({ path: pic('cheat') });
    check('the cheat code: a toast, a rain of coins, and a gold runner saved', rain && /Cheat code/.test(await toast()) && (await p.evaluate(() => localStorage.getItem('bugrun-gold'))) === '1');
    await wait(5200);
    check('the coins are gone after a few seconds', !(await p.evaluate(() => document.querySelector('.egg-rain'))));
    await p.evaluate(() => { const s = document.getElementById('games'); scrollTo(0, s.getBoundingClientRect().top + scrollY - innerHeight * 0.3); });
    await wait(1200);
    await p.click('.play');
    await wait(1200);
    const gold = await p.evaluate(() => {
      const c = document.querySelector('.bugrun canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] === 0xff && d[i + 1] === 0xc5 && d[i + 2] === 0x3d) n++;
      return n;
    });
    check('Bug Run\'s runner is gold now', gold > 10, `${gold} gold pixels`);
    // a run, lost on purpose: it goes on the board
    await p.keyboard.press('Space');
    check('a finished run of Bug Run counts', await until(async () => /On the board/.test(await toast()), 20000));
    await p.keyboard.press('Escape');
    await p.evaluate(() => localStorage.removeItem('bugrun-gold'));
  }

  // everything this device can find, bar the game on a phone (the desktop pass plays it): the tally agrees
  const got = await found(), want = mine.filter((id) => !phone || id !== 'arcade');
  check(`${tag}the tally has all of them`, want.every((id) => got.includes(id)), `missing: ${want.filter((id) => !got.includes(id)).join(', ') || 'none'}`);

  // the last one found: the page says so, and throws its party
  await p.evaluate((ids) => localStorage.setItem('eggs-found', JSON.stringify(ids.filter((id) => id !== 'clock'))), ALL);
  await p.evaluate(() => scrollTo(0, 0));
  await p.reload({ waitUntil: 'networkidle0' });
  await p.evaluate(() => scrollTo(0, 0));
  await wait(1500);
  await pressEl('.clock');
  const party = await until(async () => /That’s all/.test(await toast()), 7000);
  await wait(500);
  await p.screenshot({ path: pic('finale') });
  check(`${tag}the last one found: "That's all ${mine.length}", birds and coins`, party && (await toast()).includes(`all ${mine.length}`) && (await p.$$eval('.birds .fl', (l) => l.length)) >= 10 && !!(await p.$('.egg-rain')));
  await p.evaluate(() => localStorage.removeItem('eggs-found'));

  check(`${tag}no errors`, errors.length === 0, errors.join(' | '));
  await p.close();
}

// With motion off, the tally only counts what can still be found, and nothing flies.
{
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.evaluateOnNewDocument(() => { localStorage.setItem('motion', 'off'); localStorage.removeItem('eggs-found'); });
  await p.goto(url, { waitUntil: 'networkidle0' });
  await wait(800);
  const still = await p.evaluate(() => ({ btn: document.querySelector('.hunt-btn').textContent, up: document.querySelector('.hunt-up').tagName, stickers: document.querySelectorAll('.sticker').length }));
  await p.click('.net');
  await wait(300);
  const note = await p.evaluate(() => document.querySelector('.egg-toast.on')?.innerText ?? '');
  check('motion off: fifteen left to find, a plain link to the top, and the bars still answer', still.btn === '0 of 15 hidden things found' && still.up === 'A' && still.stickers === 0 && /Signal sent/.test(note) && errors.length === 0, JSON.stringify(still) + errors.join(' | '));
  await p.close();
}
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exitCode = failed ? 1 : 0;
