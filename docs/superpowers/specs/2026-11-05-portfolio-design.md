# Portfolio site: design spec

Date: 2026-11-05. Owner: Malek Kebbe Baghdadi. Source of truth for content: `Documents/CV_Soft.pdf`.

## 1. Brief (what Malek asked for, and what he confirmed)

- A portfolio that shows everything on the CV, with the three projects as the centre of it.
  The look must be high-tech and must not read as a generic AI-made site.
- Each project gets a cinematic scene: the page pins, the animation is tied to scroll position.
  Stop scrolling and it stops. Scroll up and it plays backwards.
- NeatInk and Pigeon are Android APKs. The demo matters far more than the download link.
  Logbook is a Firebase-hosted web app: live link plus a brief demo.
- Answers he gave:
  - APK demos are **rebuilt in code** from each app's real source and theme (no footage exists, no device here).
    They are labelled a walkthrough, never a screen recording.
  - The app is called **NeatInk** on the site (the tablet app and its release files say "Mariam's Notes").
  - Pigeon's download button uses the **direct APK link at the top of its README** (a Google Drive link).
- Hosting must be **free** and the address **short enough for the CV**: GitHub Pages at
  `malekbaghdadi.github.io` (user-site repo `MalekBaghdadi.github.io`, built branch `gh-pages`,
  same `gh-pages` deploy as Sho El 8ada because his token has no `workflow` scope).
  Nothing is created or published until Malek says go.
- Design skill: Anthropic's official `frontend-design` skill (no stronger alternative found), followed below.
- Malek asked to work alone and return with the finished product, so this spec is not paused for review.

## 2. Content map (CV to page)

| CV | Where it lands |
|---|---|
| Name, phone, email, LinkedIn, GitHub | Hero line and footer |
| NeatInk, Logbook, Pigeon (dates, stacks, bullets, links) | Three pinned scenes. Order: NeatInk, Pigeon, Logbook |
| Freelance Technical Consultant, RBAX (Jul-Sep 2026); iOS Developer Intern, Devision-tech (Jun-Aug 2025) | Experience, a dated timeline (the content really is a sequence) |
| Game Development: Global Game Jam 2026, Zinga Game Jam 2026, two Unity games (2D and 3D) | "Beyond the apps" |
| AWS Cloud Practitioner (Jan-May 2026), CCNA (in progress) | Certifications |
| LAU BSc Computer Science (Sep 2023-May 2026); Al-Bayader Aramoun School, Lebanese Baccalaureate SE (2008-2023); coursework | Education |
| Languages, Tools and Frameworks, Cloud | Skills: plain grouped lines. No chips, bars or logo wall |

Thread that ties the projects together, and the one-line positioning: all three keep working without a connection
(NeatInk fully offline, Pigeon an offline mesh, Logbook an offline-first PWA). Claims on the page stay inside what the CV
and the apps' READMEs say.

## 3. Design plan

### Draft 1 (what I would produce for any "high-tech dev portfolio")
Near-black page, one electric accent, glowing gradient blobs, glass cards, mono labels, numbered 01/02/03 sections,
fade-up on every section.

### Review against the brief
That is the generic default (cliche 2 and 4 plus template chrome). Changes and why:
- Light "concrete" shell, and the page **dims like a cinema** as each scene arrives, using that app's own palette.
  The dimming is the memorable thing; it is also the scroll-scrubbed behaviour he asked for.
- No glow, no glass, no gradient decoration. Devices are flat, plain bezels.
- No eyebrow labels, no middle-dot meta strings, no mono data labels, no arrows on links, no 01/02/03
  (three projects are not a sequence).
- Cards are not identical: scenes, a timeline and plain lists each use a structure that fits their content.
- Motion: the three scrubbed scenes (requested) plus one load moment in the hero. No fade-up sections, no hover transitions everywhere.

### Revised plan

**Color** (shell): Concrete `#E7E9EE` background, Panel `#F5F6F8`, Ink `#0F1633` text,
Ultramarine `#2B3BFF` the one accent (links, buttons, focus), Flare `#FF5A36` only for live or recording states.
**Scene palettes come from the real apps:** NeatInk deep indigo (Material 3 scheme generated from the app's seed `#2F3C8C`),
Pigeon charcoal `#1C1C1C`/`#2C2C2C` with `#E57373`, `#81C784`, `#FFB74D`, Logbook navy `#0E1420` with its `#151C2A`/`#1C2536` surfaces and IBM Plex Sans.

**Type** (self-hosted through Fontsource, no CDN, so the site works offline):
- Display: **Anybody**, a variable family with a width axis. The name in the hero changes width with the pointer
  (and with scroll on touch screens): the type treatment is the interaction.
- Body: **Atkinson Hyperlegible Next**, clearly distinct, very legible. Tabular figures for dates.
- Scale: 1.25 ratio from 17px body; lines under 70 characters; sentence case throughout.
- Inside each scene's device, type is the real app's (Roboto-like for Android, IBM Plex Sans for Logbook).

**Layout**: left-aligned, one strong column grid. Hero: name on two lines filling the width, positioning sentence bottom right.
Scene: text column (project, plain one-line description, the two CV bullets as captions that swap with progress, small links) beside a large device.
Below 800px the device sits on top and the captions below. Whole thing works with a 16px gutter at 360px wide.

```
HERO                         SCENE (pinned, ~4 screens of scroll)
+------------------------+   +-----------------------------------------+
| Malek                  |   | NeatInk             +---------------+   |
| Baghdadi               |   | caption 1 -> 2      |   tablet /    |   |
|                        |   | (swap on progress)  |   phone with  |   |
|      one sentence ---> |   | links, small        |   the app     |   |
+------------------------+   +-----------------------------------------+
page colour: concrete        page colour: eases to the app's palette
```

**Principle**: spend the boldness in one place, the three scenes; keep the rest quiet and disciplined.

## 4. Scenes (storyboards, progress 0 to 1 on one pinned GSAP timeline each)

**NeatInk** (Flutter, Android tablet, offline). Landscape tablet, cream lined page.
0-.38 handwriting draws stroke by stroke, rendered with `perfect-freehand` like the real app, centre-lines from a Hershey script font.
.38-.46 pen lifts, Convert is tapped. .46-.74 line by line the ink becomes typed text on the same baseline;
"isnt" becomes "isn't" with the dotted autocorrect underline; the font changes twice (the app has 18).
.74-.86 undo: the handwriting returns (nothing is lost), then redo. .86-1 a PDF page with ink on it and Export PDF.
Captions: the CV's two NeatInk bullets. Closing facts from the README: offline, no accounts, no ads, about 43 MB.

**Pigeon** (Kotlin, Android, mesh). Portrait phone, dark tactical UI, vector street map (no tiles, no network).
0-.30 the map with the user's 500 m radius and nearby peers; the event wizard slides up, a hazard type is chosen, Broadcast, the pin drops.
.30-.65 camera pulls back: the phone becomes one node in a mesh of seven; the event hops node to node (epidemic broadcast),
and two phones that meet merge their event sets by union. .65-.88 battery-aware discovery: as a battery drains the scan bursts get sparser.
.88-1 close. Captions: the CV's two Pigeon bullets. Download uses the README's APK link.

**Logbook** (React, TypeScript, Firebase, PWA, live). Real app, real pixels: a local build against the Firebase Auth emulator with
invented demo data, captured with Puppeteer as a frame sequence, drawn to a `<canvas>` and scrubbed by scroll
(a `<video>` seeks too coarsely to scrub). Flow: Today (logging fills the bars, a timer runs), History streak shading, Profile pins.
The live URL is the main link. None of Malek's real entries or any user's data is used.

## 5. Architecture

- Vite, plain JavaScript modules, GSAP with ScrollTrigger (free, bundled, no CDN). No framework: the page is static content plus scenes.
- All text content is real HTML in `index.html` (readable without JS); scripts only add behaviour.
- Files: `index.html`, `src/style.css`, `src/main.js` (init, section colour dimming, reduced-motion handling),
  `src/hero.js`, `src/scenes/{neatink,pigeon,logbook}.js` (one self-contained file each, with its own markup builder),
  `public/frames/logbook/*.webp`, `tools/capture-logbook.mjs` (capture script, not shipped).
- `prefers-reduced-motion`: no pinning, each scene shows a still end state, nothing autoplays.
- Mobile: `100svh` pinned stages, touch scrolling drives the same timelines, frame sequence loaded lazily.
- Deploy: `npm run deploy` (gh-pages branch). Base path `/`.

## 6. Verification

- Puppeteer (system Chrome) at 1440x900 and 390x844 with reduced motion **off**: scroll to fixed progress points,
  screenshot each, then scroll back to the same points and compare. Reverse playback = identical states.
- No console errors, no horizontal scroll at 360px, keyboard focus visible, `npm run build` clean.
- Check every outbound link resolves (APK links, repos, live site).

## 7. Not doing

A CV PDF download, a contact form, dark/light toggle, analytics, a blog, an offline service worker (the "works offline" line is
about the apps, so the page does not claim it). Any of these can be added later.

## 8. Revision 2 (2026-11-06): the motion actually shows, and more of it

- **Root cause of "there is no animation":** Windows "Animation effects" is off on Malek's PC, so Chrome reports
  `prefers-reduced-motion: reduce`, and the site switched to its still version. Motion no longer follows the OS flag;
  the page has its own "Reduce motion" button (localStorage) instead.
- **Smooth scroll:** Lenis on wheel/trackpad, synced to ScrollTrigger; touch stays native.
- **Hero as a pinned scene (3.4 screens):** live Beirut clock and signal bars that connect on load; on scroll a
  highlighter runs under the thesis, the bars drop to "No connection", the name squeezes and lifts away, the three
  apps (real screens from the scenes and the Logbook capture, `tools/hero-shots.mjs`) rise out of the page, tilted
  back, and light up under "All three work without a connection."
- **Chapters stack:** each section overlaps the previous one's last screen and slides over it as a rounded card while
  the old stage is pushed back and dimmed. No empty scroll between chapters.
- **Shared scene moves:** device stands up on entry, title opens on the width axis, caption words light up as read.
- **CV sections:** headings open on the width axis, entries rise, the work timeline draws, a two-row skills marquee
  slides with the scroll, the contact card grows to full width. All scrubbed and reversible.

## 9. Revision 3 (2026-11-06): every scene gets its world, and some life at rest

- **Asked for:** more animation everywhere, something to look at in every second, e.g. fire and an ambulance behind Pigeon.
- **Backdrops, scrubbed like everything else:** the hero's signal pulses until the connection drops; NeatInk's ruled page
  with "offline / no accounts / no ads" written large and faint; Pigeon's night city living through the reported fire
  (spreads, pings, responders arrive, ladder and water, sirens off); Logbook's year of streaks filling in perspective.
  CV: rules draw themselves, marquee squares turn, a pixel runner in Game development, the footer ends "Back online".
- **Ambient loops are the exception** to "stop and it stops": flames, smoke, sirens, stars and the clock keep moving at
  rest, so a stopped page is never dead. They run only while their chapter is visible and their part of the story is on,
  never with motion off; `?still` freezes them for the reverse-playback checks.
- **Budget:** measured with auto-scroll at 4x CPU throttling on a phone viewport against the previous build. Loops that
  cannot run on the compositor were dropped, nothing loops in Logbook, the Logbook floor's perspective is drawn on a flat
  canvas instead of a CSS 3D layer, and auto-scroll still moves in even whole-pixel steps everywhere.

