# Portfolio

Malek Baghdadi's portfolio. Three pinned, scroll-driven demos (NeatInk, Pigeon, Logbook) followed by the rest of the CV.
Scrolling plays a scene; stopping stops it; scrolling back up rewinds it.

Design brief, the design critique and the storyboards: [`docs/superpowers/specs/2026-11-05-portfolio-design.md`](docs/superpowers/specs/2026-11-05-portfolio-design.md).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/
npm run preview    # serve the production build
```

Vite, plain JavaScript modules, GSAP (ScrollTrigger). No framework. All CV text is real HTML in `index.html`.

## Motion

Everything that moves is tied to the scroll position (GSAP ScrollTrigger, smoothed by Lenis on wheel and trackpad;
touch keeps native scrolling), so stopping stops it and scrolling up plays it backwards. Motion is on unless a
visitor presses the page's own **Reduce motion** button (remembered in `localStorage`); the OS
`prefers-reduced-motion` flag is deliberately not used, because Windows often reports it with "Animation effects"
switched off by accident, and that silently turned every demo into a still on Malek's PC.

- `src/hero.js`: the opening. A highlighter runs under the thesis, the signal bars drop to "No connection", the name
  squeezes and lifts away, the three apps rise out of the page and light up ("All three work without a connection.").
- `src/scene.js`: shared by the three demos. The device stands up out of the page as a scene arrives, the title opens to
  full width, caption words light up as you read, and each chapter slides over the previous one like a card while the
  old one is pushed back and dimmed (sections overlap by one screen: `margin-top: -100svh`).
- `src/sections.js`: the CV sections. Headings open to full width, entries rise into place, the work timeline draws
  itself, the skills marquee slides with the scroll, the contact card grows to full width.
- `src/autoscroll.js`: the floating **Auto-scroll** button scrolls the whole site at a slow, steady 0.18 screens a
  second (about three and a half minutes end to end). The visitor's own wheel, touch, scroll keys, scrollbar or a link
  hands control straight back; at the end it offers **Watch again**.

## How the scenes work

Each scene (`src/scenes/*.js`) builds its own markup and one GSAP timeline whose progress is the scroll position
(`src/scene.js` pins the stage and wires the timeline to scroll). Phones get a camera that zooms and pans.

| Scene | What it is | How it is made |
|---|---|---|
| NeatInk | Tablet walkthrough (write, Convert, autocorrect, undo, lasso restyle, PDF) | Rebuilt in code from the app's Material 3 theme. Handwriting is generated from Hershey centre-lines and drawn with `perfect-freehand` (`tools/make-ink.mjs`) |
| Pigeon | Report an incident, spread across a mesh, set-union merge, duty cycle | Rebuilt in code from the app's `MeshTheme` and sync logic |
| Logbook | The real app | Frames captured from a local build against the Firebase emulators, with invented data (`tools/lb/capture.mjs`), drawn to a canvas |

NeatInk and Pigeon are labelled on the page as walkthroughs, not screen recordings.

## Regenerating assets

```bash
node tools/make-ink.mjs        # NeatInk handwriting -> src/scenes/neatink-ink.json
node tools/lb/capture.mjs      # Logbook frames -> public/logbook/ + src/scenes/logbook-manifest.json
node tools/hero-shots.mjs      # the hero's three screens -> public/hero/ (dev server on :5199)
node tools/make-preview.mjs    # the whole site as one inline html file -> artifact/site.html
```

`capture.mjs` needs Java and `firebase-tools` (via `npx`), and expects the Logbook repo at `C:/Users/Malek Baghdadi/personal-tracker`
(see `tools/lb/env.mjs`). It only reads that repo, writes nothing to it, and never touches a real Firebase project.
All data in the capture is invented.

## Checking changes

With `npm run dev -- --port 5199` running:

```bash
node tools/shoot.mjs <label> <w> <h> <neatink|pigeon|logbook> 0,0.3,0.6,1   # screenshots + proves reverse playback matches
node tools/at.mjs <label> <w> <h> top@1 neatink@0@-0.55 experience@0       # the seams between sections
node tools/perf.mjs 390 844 neatink --cpu=4                                 # frame times while scrolling a scene
node tools/wheel.mjs                                                        # real wheel scrolling + the demos link
node tools/autoplay-test.mjs                                                # auto-scroll: pace, take-over, keyboard, end
node tools/end-state.mjs                                                    # nothing left half-animated at the page end
```

`shoot.mjs` and `at.mjs` take `--motion=off` to check the still version. They use the system Chrome.

## Deploy

Intended host: GitHub Pages at `malekbaghdadi.github.io` (repo `MalekBaghdadi.github.io`, branch `gh-pages`).
`npm run deploy` builds and pushes `dist/` to `gh-pages`. GitHub Actions isn't used (the token has no `workflow` scope).
