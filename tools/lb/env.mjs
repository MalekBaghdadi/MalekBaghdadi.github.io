// Runs Logbook locally against the Firebase emulators, with invented demo data, so the real app can be captured.
// Nothing here touches a real Firebase project, and the Logbook repo is only read (git status stays clean).
import { spawn, execSync } from 'node:child_process';

export const LB = 'C:/Users/Malek Baghdadi/personal-tracker';
export const APP = 'http://localhost:5180/';
const procs = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function up(url, label, seconds = 120) {
  for (let i = 0; i < seconds; i++) { try { await fetch(url); return; } catch { await wait(1000); } }
  throw new Error(`${label} did not start at ${url}`);
}
function start(cmd) {
  const p = spawn(cmd, { cwd: LB, shell: true, stdio: 'ignore' });
  procs.push(p);
}
export async function startEnv() {
  start('npx firebase emulators:start --project demo-logbook --only auth,firestore');
  await up('http://127.0.0.1:9099', 'Auth emulator');
  await up('http://127.0.0.1:8080', 'Firestore emulator');
  start('npx vite --mode emulators --port 5180 --strictPort');
  await up(APP, 'Logbook dev server');
}
export function stopEnv() {
  for (const p of procs) { try { execSync(`taskkill /pid ${p.pid} /T /F`, { stdio: 'ignore' }); } catch { /* already gone */ } }
  procs.length = 0;
}
process.on('SIGINT', () => { stopEnv(); process.exit(130); });

// ---- Firestore REST (the emulator accepts "Bearer owner" as admin, bypassing rules) ----
const enc = (v) =>
  v === null ? { nullValue: null }
  : typeof v === 'string' ? { stringValue: v }
  : typeof v === 'boolean' ? { booleanValue: v }
  : Number.isInteger(v) ? { integerValue: String(v) }
  : typeof v === 'number' ? { doubleValue: v }
  : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } }
  : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };

export async function writeDocs(docs) {
  const base = 'projects/demo-logbook/databases/(default)/documents/';
  for (let i = 0; i < docs.length; i += 400) {
    const writes = docs.slice(i, i + 400).map(([path, data]) => ({ update: { name: base + path, fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, enc(v)])) } }));
    const r = await fetch(`http://127.0.0.1:8080/v1/${base.slice(0, -1)}:commit`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ writes }) });
    if (!r.ok) throw new Error('seed failed: ' + (await r.text()).slice(0, 300));
  }
}

/** Creates the demo account through the Auth emulator and returns its uid. */
export async function signUpUser(email, password) {
  const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const j = await r.json();
  if (!j.localId) throw new Error('sign-up failed: ' + JSON.stringify(j).slice(0, 200));
  return j.localId;
}
export const resetAccounts = () => fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-logbook/accounts', { method: 'DELETE' });

// ---- invented demo data: four habits, 60 days of history ----
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** The tracking day (the app rolls over at 5am) as YYYY-MM-DD in the machine timezone. */
export function trackingDay(offset = 0, now = new Date()) {
  const d = new Date(now.getTime() - 5 * 3600e3 + offset * 86400e3);
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function demoDocs(uid, now = new Date()) {
  const iso = now.toISOString();
  const metric = (id, name, type, unit, target, quickAdd, color, icon, order, theme) => ({
    id, name, type, unit, target, targetDirection: 'at_least', schedule: { kind: 'daily' }, timerEnabled: type === 'duration',
    quickAdd, color, icon, theme, order, archivedAt: null, createdAt: iso, updatedAt: iso,
  });
  const metrics = [
    metric('m-study', 'Studying', 'duration', '', 90 * 60, [1800, 3600], '#6690E6', 'GraduationCap', 0, 'study'),
    metric('m-read', 'Reading', 'count', 'pages', 20, [5, 10, 20], '#BD8638', 'BookOpen', 1, 'reading'),
    metric('m-gym', 'Gym', 'check', '', 1, [1], '#28A592', 'Dumbbell', 2, 'fitness'),
    metric('m-water', 'Water', 'count', 'glasses', 8, [1, 2], '#A07EE3', 'Droplet', 3, 'health'),
  ];
  const r = rng(7);
  const docs = [[`users/${uid}/state/settings`, { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, weekStartsOn: 1, theme: 'dark', onboardedAt: iso, displayName: 'Demo', updatedAt: iso }]];
  for (const m of metrics) docs.push([`users/${uid}/metrics/${m.id}`, m]);
  let n = 0;
  const entry = (metricId, day, value, source, hour) => {
    const at = new Date(`${day}T${String(hour).padStart(2, '0')}:00:00Z`).toISOString();
    docs.push([`users/${uid}/entries/e${++n}`, { id: `e${n}`, metricId, localDate: day, value, source, note: null, occurredAt: at, createdAt: at, updatedAt: at, deletedAt: null }]);
  };
  for (let back = 60; back >= 1; back--) {
    const day = trackingDay(-back, now);
    const dow = new Date(day + 'T12:00:00Z').getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const streak = back <= 19; // the last 19 days never miss the study target, so the streak is long
    const study = streak ? 95 + Math.floor(r() * 50) : r() < (weekend ? 0.45 : 0.78) ? 85 + Math.floor(r() * 60) : Math.floor(r() * 50);
    if (study > 0) { entry('m-study', day, Math.round(study * 0.6) * 60, 'timer', 9); entry('m-study', day, Math.round(study * 0.4) * 60, 'manual', 17); }
    if (r() < 0.85) entry('m-read', day, 12 + Math.floor(r() * 30), 'quick_add', 21);
    if (r() < (weekend ? 0.5 : 0.8)) entry('m-gym', day, 1, 'quick_add', 18);
    entry('m-water', day, 4 + Math.floor(r() * 6), 'quick_add', 14);
  }
  // Today so far: Studying 45m, Reading 10 pages, Water 4 glasses; the Gym box is still open.
  const today = trackingDay(0, now);
  const earlier = new Date(now.getTime() - 3600e3).toISOString();
  const add = (metricId, value, source) => docs.push([`users/${uid}/entries/e${++n}`, { id: `e${n}`, metricId, localDate: today, value, source, note: null, occurredAt: earlier, createdAt: earlier, updatedAt: earlier, deletedAt: null }]);
  add('m-study', 45 * 60, 'manual'); add('m-read', 10, 'quick_add'); add('m-water', 4, 'quick_add');
  return docs;
}

// ---- a simulated Compete partner ("Sam"): the pair, an accepted link on Studying, and Sam's published numbers ----
export function competeDocs(uid, now = new Date()) {
  const iso = now.toISOString();
  const PARTNER = 'e2e-partner';
  const day = (back) => trackingDay(-back, now);
  const dow = new Date(trackingDay(0, now) + 'T12:00:00Z').getUTCDay();
  const sinceMonday = (dow + 6) % 7;
  const rng2 = rng(21);
  const days = {};
  for (let back = 15; back >= 1; back--) {
    const hours = back % 7 === 0 ? 0.6 : 1.1 + rng2() * 1.6; // Sam studies a bit less than the demo account, most days
    const t = Math.round(hours * 3600);
    days[day(back)] = { t, s: t >= 5400 ? 'h' : 'd' };
  }
  days[day(0)] = { t: 40 * 60, s: 'd' };
  return [
    ['pairs/E2EPAR', { id: 'E2EPAR', members: [PARTNER, uid], names: { [PARTNER]: 'Sam', [uid]: 'Demo' }, weekStartsOn: 1, createdAt: iso, endedAt: null }],
    ['pairs/E2EPAR/links/L1', { id: 'L1', metrics: { [uid]: 'm-study', [PARTNER]: 'their-study' }, type: 'duration', proposedBy: uid, createdAt: iso, acceptedAt: iso, startDate: day(sinceMonday + 14), endedAt: null }],
    [`pairs/E2EPAR/scores/${PARTNER}`, { uid: PARTNER, asOf: day(0), updatedAt: iso, metrics: { 'their-study': { name: 'Studying', type: 'duration', unit: '', target: 5400, color: '#BD8638', icon: 'GraduationCap', days } } }],
  ];
}
