# W45 — Electrostatics C2 slice (fourth consumer)

Baseline: `origin/main` @ `a125a8d` (Projectile #35, Solar #36, shared `lab-c2.css` #37, cascade fix #38, Atmosphere #39, ThemeMenu #40 merged; only draft #34, docs, open).
Scope: `/electrostatics` (`/electrostatic-field` redirects to it). Not touched: `lib/science`, `models`, `FieldCanvas.tsx` and every canvas / SVG colour, charge semantic colours, field-line / equipotential code, the guided state machine, selection behaviour, registry, ThemeMenu, theme runtime, CI/CD, other modules.
Method: Playwright (Chromium) against production builds (`vinext build` + `vinext start`) of `origin/main` (port 3100) and this branch (3200). Scripts are not committed; screenshots are in `test-results/evidence/w45/electrostatics/{before,after}/` (git-ignored): 1440 / 390 / 360 px × Light / Dark / System × entry, free exploration, layer drawer open, guided.

## 1. What changed

| File | Change |
| --- | --- |
| `app/electrostatics/page.tsx` | imports `../lab-c2.css` |
| `components/ElectrostaticFieldLab.tsx` | `lab-c2` class next to the module's `labShell` on `<main>` (one line) |
| `components/electrostatic/ElectrostaticFieldLab.module.css` | interface rules moved onto `--lc-*` tokens, see §3 |

No new stylesheet: the module is a CSS Module (hashed class names), so a global `electrostatics-c2.css` could not address its elements without attribute hacks. Tokens and the shared layer-drawer / range rules come from `lab-c2.css`; everything module-specific stays in the module.

## 2. Measured

| Check | main | slice |
| --- | --- | --- |
| Distinct controls under 44 px, outside the 18 px layer checkboxes (32 captures) | 14 elements, 247 hits | 0 |
| Header buttons | 40 px high; 34×44 icon-only at ≤767 px | 44 px; 44×44 icon-only, actions on a second row ≤420 px |
| Transport dock buttons / speed select | 34 px | 44 px |
| Timeline range | 3 px hit area | 44 px band, 8 px track kept |
| Notice / canvas-tip close | 28×28 | 44×44 |
| Disclosure summaries | 33–40 px | ≥44 px |
| Layer-drawer rows / checkboxes | 39 px summary, 13 px checkbox | 44 px, 18 px (shared rule) |
| Focus ring | gold 3 px (#D9A735 / #E3AD36), brown, or `--strong` | one 2 px `--lc-focus` (`#216E84` Light, `#9BD7DD` Dark/System); light variant on canvas overlay buttons |
| Text under 4.5 : 1 (Light, guided direction labels, 9 px) | 9 labels at 4.04 : 1 | 0 (labels 11 px) |
| Guided "look here" instruction, Dark | dark #3D3418 on dark amber, unreadable | `--warm-ink` on the same fill |
| Minimum text size outside the canvas | 9–11 px | 11 px compass words, 12 px elsewhere |
| Horizontal overflow (32 captures) | 0 | 0 |

Contrast was measured from computed colours over the panel, drawer and dock surfaces (1440 and 390, Light and Dark, five states); the after run reports 0 failures. Canvas text and the dark canvas card are excluded by design.

## 3. CSS: shared vs module

- Shared (already in `lab-c2.css`, now picked up): flat page background, legacy-token remap (`--ink`, `--line`, `--surface`, `--field-bg`, `--tint`…), layer-drawer rows, 44 px range band, reduced-motion transition rule.
- Module: `--teal` → `--lc-accent` for every selected state; gold focus rings → `--lc-focus`; Georgia headings → inherited sans, 650 weight; panel / dock / popover / notice surfaces use `--lc-raised`, `--lc-border`, `--lc-card-shadow`, 14 px radius; 10 px control radius; share button uses `--lc-accent` / `--lc-on-accent`; fixed mobile tab bar uses `--lc-raised` (it was a hard-coded near-white in Dark).
- Specificity: `lab-c2.css` sets `input[type="range"] { height: 44px; background: transparent }` at (0,2,1), which would have erased the timeline's progress fill. The module restates it at (0,3,0) (`.labShell .timelineInput[type="range"]`) and draws the fill on the track pseudo-elements. `.labShell .appBarTitle` out-ranks `.lab-c2 h1`, which would otherwise have inflated the compact app-bar title to 24–32 px.
- Gold stays decorative (Beta chip, guided attention cue); it is not a focus or state colour. The guided cue itself is unchanged.

## 4. Regression (main vs slice, same flow)

19 snapshots: entry, free exploration, preset (dipole), layers (field lines, strength map, field arrows off), probe select + keyboard move, add source, delete, test-charge select, play / pause, step forward, reset runtime, reset setup, guided prediction commit, back to exploration. Compared: data attributes on the lab and the field viewport, readout text of probe / particle / guided / time panels, canvas pixels.

- State and readouts identical on the 17 non-playback snapshots. The two playback snapshots differ by one 1 ms tick (`0.616` vs `0.617 s`): wall-clock play over 600 ms. A deterministic replay (select test charge, six `+0.1 s` steps, one back) gives identical text and trail counts on both builds.
- Canvas pixels differ only in the frame (1 px border colour, 14 px corners) and the wrapped canvas-tip text (close hit area now 44 px). The field-drawing area is pixel-identical.
- No undo / redo exists in this model, so none was exercised.

## 5. Checks run

`npm run lint` 0 errors (2 existing warnings, other files); `npm run build`; `npm run test:unit` 450 / 450; Electrostatics E2E (`tests/e2e/electrostatic*`, desktop + mobile, incl. `@a11y`) 91 passed, 2 failed; `theme-menu*` 48 / 48.

The 2 failures (`electrostatic-gate4b.spec.ts:101`, `electrostatic-gate5.spec.ts:28`) fail identically on `main` @ `a125a8d`: the specs expect the sentences "使用同一線性比例" and "大小" inside the contribution disclosure, which the current UI does not render. Not caused by this slice; not fixed here (copy / test drift).

## 6. Not verified

Firefox / WebKit and a physical phone; screen-reader pass; the guided activities past the first prediction (B and C) by pixel; Theory modal restyling (inherits tokens, not redesigned); `/en` (no English route exists for Electrostatics); the 18 px layer checkboxes are measured inside their 44 px rows, not as separate targets.
