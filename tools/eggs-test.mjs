// The hidden extras (spoilers; src/eggs.js, birds.js, hero-play.js, stickers.js and friends): each one is found the way
// a visitor would find it, and works, on a desktop and on a phone, without errors, and without the page ever announcing
// that something was found. The quiet details added around the CV and behind the demos are checked here too. Pictures
// of the visible ones go to tools/out/eggs/ for a look.
//   node tools/eggs-test.mjs [url]        (CHROME=... for another browser)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5199/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); };
mkdirSync('tools/out/eggs', { recursive: true });

// The desktop page is told it has a mouse (a headless browser on a machine without one says it has none); the phone
// page's touch emulation overrides that.
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4'],
});
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const phone = w < 700, tag = phone ? 'phone: ' : '', pic = (n) => `tools/out/eggs/${phone ? 'phone' : 'desktop'}-${n}.png`;
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
  const errors = [], logs = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => logs.push(m.text()));
  await p.goto(url, { waitUntil: 'networkidle0' });
  await p.evaluate(() => localStorage.removeItem('bugrun-gold'));
  await wait(1500);

  // Scroll so a pinned scene is `f` of the way through its story.
  const into = (id, f) => p.evaluate((id, f) => {
    const s = document.getElementById(id), sp = s.parentElement.classList.contains('pin-spacer') ? s.parentElement : s;
    scrollTo(0, sp.getBoundingClientRect().top + scrollY + (sp.offsetHeight - innerHeight) * f);
  }, id, f);
  const press = (x, y) => (phone ? p.touchscreen.tap(x, y) : p.mouse.click(x, y));
  const pressEl = async (sel) => { const el = typeof sel === 'string' ? await p.$(sel) : sel; if (phone) await el.tap(); else await el.click(); };
  const until = async (fn, ms) => { for (const t0 = Date.now(); Date.now() - t0 < ms;) { if (await fn()) return true; await wait(150); } return false; };

  // the console says hello
  check(`${tag}a hello in the console, with a hint`, logs.some((l) => /opened the console/.test(l)) && logs.some((l) => /cheat code/.test(l)));
  // the signal bars: a ping, and the name feels it pass
  await pressEl('.net');
  let narrow = 150;
  for (let k = 0; k < 12; k++) { narrow = Math.min(narrow, await p.$$eval('.name .ch', (l) => Math.min(...l.map((c) => parseFloat(c.style.fontStretch))))); await wait(70); }
  check(`${tag}pressing the signal bars sends a ping, and the letters squeeze as it passes`, narrow < 130 && (await p.$eval('.net', (n) => n.classList.contains('pinged'))), `narrowest ${narrow}%`);
  await p.screenshot({ path: pic('ping') });
  await wait(1800);
  check(`${tag}and the name is back to full width after`, (await p.$$eval('.name .ch', (l) => Math.min(...l.map((c) => parseFloat(c.style.fontStretch))))) > 149);

  // the clock: the visitor's own time
  await pressEl('.clock');
  await wait(200);
  const clock = await p.$eval('.clock', (c) => c.innerText.replace(/\s+/g, ' '));
  check(`${tag}pressing the clock shows your own time against Beirut's`, /^You \d\d:\d\d .*Beirut$/.test(clock), clock);
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
  check(`${tag}all thirteen letters: the name waves and says so`, (await p.$$eval('.name .ch.lit', (l) => l.length)) > 0);
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
    check('a pulled letter stretches away and snaps back', /px/.test(pulled) && (await p.$$eval('.name .ch', (l) => l.every((c) => !c.style.translate))), pulled);
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
    check(`${tag}and is off the moment it is bothered`, (await until(() => p.evaluate(() => !document.querySelector('.birds .fl')), 2500)));
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
  check(`${tag}a click on the moon: a shooting star, and the next phase`, wish.star && wish.cut !== moon.cut, JSON.stringify(wish));
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
  check(`${tag}five windows clicked, five lights on`, panes.length === 5 && (await p.$$eval('.pc-mine rect', (l) => l.length)) === 5, `${panes.length} windows`);
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
    check('left to rest, the writing is "converted" to type', /Hire Malek/.test(read), read.replace(/\n/g, ' / '));
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
    check('seven days logged on Logbook\'s floor, and counted', days.mine === 7 && days.n === before + 7 && days.hover, JSON.stringify(days));
    await p.mouse.click(80, h - 100);
    await wait(150);
    check('a second click takes a day back', (await p.$$eval('.lb-mine', (l) => l.length)) === 6 && +(await p.$eval('.lb-count b', (b) => b.textContent)) === before + 6);
  }

  // behind the demos: NeatInk's promises are marked by hand once written, clouds drift over Pigeon's city, and
  // Logbook's floor has its months along the far edge
  await into('neatink', 0.2);
  await wait(1100);
  const mark0 = await p.$eval('.ni-word.w1 .ni-mark', (m) => parseFloat(getComputedStyle(m).strokeDashoffset));
  await into('neatink', 0.34);
  await wait(1100);
  const mark1 = await p.$eval('.ni-word.w1 .ni-mark', (m) => parseFloat(getComputedStyle(m).strokeDashoffset));
  check(`${tag}"offline" is underlined once it has been written, not before`, mark0 === 100 && mark1 === 0, `${mark0} → ${mark1}`);
  const cloudAt = () => p.$eval('.pc-cloud', (c) => c.getBoundingClientRect().left);
  await into('pigeon', 0.1);
  await wait(1100);
  const c0 = await cloudAt();
  await into('pigeon', 0.5);
  await wait(1100);
  const c1 = await cloudAt(), lit = await p.$eval('.pc-cloud b', (b) => +getComputedStyle(b).opacity);
  check(`${tag}Pigeon's clouds drift with the scroll, lit from below while the market burns`, c1 > c0 + 10 && lit > 0.9, `${Math.round(c0)} → ${Math.round(c1)}, underside ${lit}`);
  if (!phone) {
    await into('logbook', 0.25);
    await wait(1300);
    const months = await p.$$eval('.lb-months li', (l) => ({ n: l.length, on: l.filter((m) => m.className === 'on').map((m) => m.textContent).join(), done: l.filter((m) => m.className === 'done').length }));
    check('Logbook\'s floor names its months, the one being filled lit', months.n === 12 && !!months.on && months.done === ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(months.on), JSON.stringify(months));
  }

  // the CV: a year behind every entry, opening as it arrives; timelines with a stop per entry; education counted in
  // squares; a count beside each group of skills
  await p.$eval('#experience', (e) => scrollTo(0, e.getBoundingClientRect().top + scrollY));
  await wait(1400);
  const cv = await p.evaluate(() => ({
    ghosts: [...document.querySelectorAll('.after .ghost')].map((g) => g.getAttribute('aria-label')).join(' '),
    open: parseFloat(document.querySelector('#experience .ghost .ch').style.fontStretch),
    shut: parseFloat(document.querySelector('#education .ghost .ch').style.fontStretch),
    stops: document.querySelectorAll('#experience .rail u').length, on: document.querySelectorAll('#experience .rail u.on').length,
    rails: document.querySelectorAll('.after .rail').length,
  }));
  check(`${tag}every entry has its year behind it, opening as it arrives`, cv.ghosts === '2026 2025 Now 2026 Now 2026 2023' && cv.open > 120 && cv.shut < 60, JSON.stringify(cv));
  if (!phone) check('the lists of more than one entry are timelines, with a stop per entry that lights as the dot reaches it', cv.rails === 3 && cv.stops === 2 && cv.on >= 1, JSON.stringify(cv));
  await p.$eval('#education', (e) => e.scrollIntoView({ block: 'end' }));
  await wait(400);
  const half = await p.$$eval('.terms i.on', (l) => l.length);
  await p.$$eval('.terms', (l) => scrollTo(0, l[l.length - 1].getBoundingClientRect().top + scrollY - innerHeight * 0.3));
  await wait(1400);
  const terms = await p.$$eval('.terms', (l) => l.map((t) => `${t.querySelectorAll('i.on').length}/${t.querySelectorAll('i').length} ${t.querySelector('span').textContent}`).join(', '));
  check(`${tag}education is counted in squares: six semesters, fifteen years`, terms === '6/6 6 semesters, 15/15 15 years' && half < 21, `${terms} (from ${half})`);
  await p.$eval('#skills', (e) => scrollTo(0, e.getBoundingClientRect().top + scrollY - 80));
  await wait(1400);
  check(`${tag}each group of skills has its count`, (await p.$$eval('.skills dt sup', (l) => l.map((x) => x.textContent).join())) === '11,13');
  await p.screenshot({ path: pic('cv') });

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
  check(`${tag}all seven pressed: they keep their colours`, (await p.$$eval('.sticker.got', (l) => l.length)) === 7);

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
  check(`${tag}a thrown marquee row keeps going after it is let go`, t1 < 0 && t2 !== t1, `${t1} → ${t2}`);
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
  await pressEl('.to-top button');
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
    check('typing "coo" sends a flock across', (await p.$$eval('.birds .fl', (l) => l.length)) >= 9);
    await wait(4000);
    check('and they fly off the other side', (await p.$$eval('.birds .fl', (l) => l.length)) <= 1);

    // typing "offline"
    await p.keyboard.type('offline', { delay: 30 });
    await wait(150);
    const dropped = await p.evaluate(() => document.documentElement.classList.contains('egg-offline'));
    await p.screenshot({ path: pic('offline') });
    await wait(1600);
    check('typing "offline" drops the signal for a moment, and it comes back', dropped && !(await p.evaluate(() => document.documentElement.classList.contains('egg-offline'))));

    // the cheat code
    for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) { await p.keyboard.press(k); await wait(30); }
    await wait(500);
    const rain = await p.evaluate(() => !!document.querySelector('.egg-rain'));
    await p.screenshot({ path: pic('cheat') });
    check('the cheat code: a rain of coins, and a gold runner saved', rain && (await p.evaluate(() => localStorage.getItem('bugrun-gold'))) === '1');
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
    await p.keyboard.press('Escape');
    await p.evaluate(() => localStorage.removeItem('bugrun-gold'));
  }

  // nothing ever announces a find: no note at the top of the screen, no tally, nothing kept
  check(`${tag}nothing was announced: no notes, no tally, nothing remembered about finds`, await p.evaluate(() => !document.querySelector('.egg-toast, .hunt, .hunt-log') && localStorage.getItem('eggs-found') === null));

  check(`${tag}no errors`, errors.length === 0, errors.join(' | '));
  await p.close();
}

// With motion off nothing flies or pops in, the way back to the top is a plain link, and the bars still answer.
{
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.evaluateOnNewDocument(() => localStorage.setItem('motion', 'off'));
  await p.goto(url, { waitUntil: 'networkidle0' });
  await wait(800);
  const still = await p.evaluate(() => ({ up: document.querySelector('.to-top a')?.getAttribute('href'), stickers: document.querySelectorAll('.sticker, .ghost, .terms').length }));
  await p.click('.net');
  await wait(300);
  check('motion off: a plain link to the top, no stickers or ghosts, no errors', still.up === '#top' && still.stickers === 0 && errors.length === 0, JSON.stringify(still) + errors.join(' | '));
  await p.close();
}
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exitCode = failed ? 1 : 0;
