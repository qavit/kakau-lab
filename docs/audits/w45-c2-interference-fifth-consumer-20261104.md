# W45 — Interference C2 slice (fifth consumer)

Baseline: `origin/main` @ `12919a3` (Projectile #35, Solar #36, shared `lab-c2.css` #37, cascade fix #38, Atmosphere #39, ThemeMenu #40, Electrostatics #41 merged; only draft #34, docs, open). The local `main` in the primary checkout was at `d51077c`; it was not used.
Scope: `/interference`. Not touched: `lib/science`, `models`, `mountInterference.ts` (canvas field, SVG overlay, P handling, animation), `interferenceStyles.ts`, `InterferenceFormulas/Dialogs/Summary`, registry, maturity, ThemeMenu, theme runtime, CI/CD, other modules.
Method: Playwright (Chromium) against production builds (`vinext build` + `vinext start`) of `origin/main` (port 3100) and this branch (port 3200); dev (`vinext dev`) for the lifecycle route. Scripts are not committed; evidence lives outside the repo (`kakau-lab-interference-c2-evidence/{before,after}`: 1440 / 390 / 360 px × Light / Dark / System × default, P placed, advanced + more views, sidebar toggled, projection, ThemeMenu open, keyboard focus).

## 1. E2E baseline (before any change)

`tests/e2e/interference-*.spec.ts`, desktop + mobile projects, same specs against main:

| Server | Result |
| --- | --- |
| production build (`vinext start`) | 12 failed / 36 passed |
| dev (`vinext dev`) | 2 failed / 46 passed |

The brief expected 8 known failures; 12 reproduce in production and 2 in dev. They do not share one root cause:

**A. `/interference-lifecycle` is dev-only (10 specs).** `app/(internal)/interference-lifecycle/page.tsx` calls `notFound()` when `NODE_ENV === "production"` (its own comment says so). In production the route answers 404, so every spec that opens it fails at its first `[data-interference-runtime]` / `interference-host` assertion. All 10 pass on dev. They are environment-dependent, not product defects, and cannot be run against a production build.

| Spec | Test |
| --- | --- |
| `interference-b3.spec.ts:6` | guided activities, measurement, keyboard, dialog, advanced edge |
| `interference-b3.spec.ts:119` | named controls / axe (`@a11y`) |
| `interference-b3.spec.ts:104` | activity controls fit a narrow viewport (`@mobile`) |
| `interference-c2-browser.spec.ts:3` | cross browser simulation (`@cross-browser`) |
| `interference-c2.spec.ts:86` | repeated mount, play, dispose, remount |
| `interference-gate-c.spec.ts:5`, `:36` | dialog + stored prefs; mobile sidebar |
| `interference-lifecycle.spec.ts:3` | StrictMode replay / unmount / remount |
| `interference-renderer.spec.ts:6`, `:80` | renderer, controls, measurement; touch viewport |

Minimal fix proposal (not in this PR): run these in a dev-server job, or tag them `@dev-only` and exclude from production runs.

**B. Fail on main in production and in dev (2 specs).**

| Spec | Assertion | Evidence | Class |
| --- | --- | --- | --- |
| `interference-c3-visual.spec.ts:29` (1280×800) | `plot.width >= 480` | received 475.9 on main | Layout geometry vs a fixed threshold; the 480 px floor is stale against main's own toolbar. Not a physics or rendering defect. On this branch the plot is 487 px, so the spec now passes as a side effect of the toolbar re-layout; the threshold itself is not fixed and still fails on main. |
| `interference-c4.spec.ts:72` (390 px, root font 200 %) | `scrollWidth <= innerWidth` | document 435 px at a 390 px viewport, identical on main and this branch | Real accessibility overflow at 200 % text size, present before this slice; not caused or fixed by it. |

CI (`.github/workflows/ci.yml`) runs lint + `npm test` (build + unit) only; none of these E2E specs gate a merge.

Acceptance basis used for this slice: unit tests, lint, build, the 36 production-passing specs, the 46 dev-passing specs, and the new `interference-w45-c2.spec.ts`.

## 2. What changed

| File | Change |
| --- | --- |
| `app/interference/page.tsx` | imports `../lab-c2.css` |
| `app/(internal)/interference-lifecycle/harness.tsx` | same import, so the dev harness renders the same tokens |
| `components/interference/InterferenceSimulation.tsx` | `lab-c2` class next to `interference-lab`; renders `interferenceC2Styles` after `interferenceStyles` (3 lines) |
| `components/interference/interferenceC2Styles.ts` | new, scoped to `.interference-lab.lab-c2` |
| `tests/e2e/interference-w45-c2.spec.ts` | new, 11 targeted checks |

CSS boundary: every rule in the new sheet is prefixed `.interference-lab.lab-c2` (one extra class beats the base sheet's equal-or-lower selectors without `!important`). It does not select `.interference-plot` content, `canvas`, `[data-interference-overlay]`, `.interference-svg-label`, `.if-view-key i`, the waveform figure or any `--if-constructive` / `--if-destructive` / `--if-term-*` token. The plot frame border and the stage behind it follow C2 tokens; the plot's own light background (`#dae2e7`) is kept.

## 3. Measured (45 captures each: 3 widths × Light / Dark / System × 5 states)

| Check | main | slice |
| --- | --- | --- |
| Undersized targets (<44 px), summed over captures | 1029 hits, 66 distinct elements | 0 |
| Header buttons | 80×36 | 44 high |
| Segmented view buttons / "更多" / "進階" | 30 px high | 44 |
| Range inputs | 3 px hit area | 44 px band (shared rule), track unchanged |
| Layer checkboxes (hit = label) | 18 px high | 44 |
| Hint close, tabs, nav, play / reset | 27, 38, 36, 36 px | 44 |
| Collapsed activity toggle (desktop) | 41.6 px wide | 44 |
| Text under 12 px (outside canvas / SVG / math) | 10 – 11.8 px | 0 (min 12 px) |
| Text under AA, Dark ("done" step badge, white on `#6CCF94`) | 1.91 : 1 | 0 failures (`--if-on-good`) |
| Focus ring | 3 px `--teal`-ish, theme-dependent | one 2 px `--lc-focus` (`#216E84` Light, `#9BD7DD` Dark / System); light-surface ring on the hint close button |
| Horizontal overflow | 0 | 0 |
| Reduced-motion transitions | 0 s | 0 s |

Mobile projection: after placing P, the focused plot scrolled the fixed shell and the exit button sat under the plot (hit test returned the SVG). The header is now sticky in projection; a spec asserts the button is hittable.

Layout: at 1440×900 the plot stays 623 px and the waveform stays inside the rail (toolbar 70 / time bar 53 px, same as main). At 1280×800 the plot is 487 px (main 476; the first iteration of this slice measured 461 px). From 1100 to 1439 px the toolbar's field / line labels and slider labels sit beside their 44 px controls instead of above them, so the two wrapped rows are 44 px each (toolbar 106 px, main 119 px). Targets, 12 px text, contrast and focus are unchanged. Trade-offs: in that band the λ / d range tracks are 115–134 px at 1280 (main 168 px) and 116 px at 1100–1279; between 1024 and 1099 px labels stay stacked and the plot is 461 px at 1099×800 (main about 476) and equal to main at 1024×768 (407 px, width-limited).

## 4. Regression (main vs slice, same flow)

54 snapshots each at 390 px (identical plot size) and 1440 px: default; 4 field views; wavefronts; antinode / node lines off; λ 0.8 / 1.3; d 3 / 1.2 / 3.1; reset; A₁ / A₂; φ₁ / φ₂; v; f; attenuation; reset; P add / drag / arrows / double-click remove / Enter / Delete (pointer and keyboard); each view with P; t/T 0.25 / 0.37 / 0.81; play → pause → reset; projection and exit.

- Numbers, geometry, UI state: for every deterministic snapshot (everything except pointer-placed P) readouts, rail text, classification, path difference, SVG overlay markup (conditions, wavefronts, measurement, sources), waveform path / marker and runtime data attributes are identical at both widths.
- Canvas: `canvas.toDataURL()` identical on all 21 distinct 390 px states.
- Pointer-placed P: P coordinates match to the printed precision; the measurement layer differs in the last float digit and one boundary readout (Δφ `0.0°` vs `360.0°`) because the plot sits at a different sub-pixel y offset. At 1440 px the plot is 605 px wide against 623 px, so identical fractional clicks fall at different snap distances. Keyboard-placed P (data-space steps) is identical.
- Pixels: with the plot snapped to the same integer origin and the HTML overlays (hint, status, phase note) hidden, default / intensity / amplitude / phase are 0 differing pixels; wavefront and d = 3 states max channel delta 2; keyboard P state 4 pixels (max 41) next to the P marker. The overlays differ only in the intended text size.

## 5. Checks run

`npm run lint` 0 errors (2 existing warnings in `StandardAtmosphereLab.tsx`); `npm run build`; `npm run test:unit` 450 / 450.
Interference + ThemeMenu E2E: production, main 84 passed / 12 failed (10 lifecycle 404 + the 2 in B). This branch after the 1280 iteration: 100 passed / 11 failed (the 10 lifecycle + the 200 % text overflow; the 1280 spec now passes), ThemeMenu 48 / 48. Dev on the branch: 62 passed / 1 failed (200 % overflow). New `interference-w45-c2.spec.ts` (now 15 specs incl. 1280×800 and 1440×900 plot-size checks): 15 / 15 on the branch; 11 / 11 before the 1280 additions and 1 / 11 on main (negative control). Targeted 1280×800 equivalence (54 keyboard / data-space snapshots, main vs branch): readouts, SVG overlay, waveform and runtime attributes identical; pointer-placed P differs only at float level. Dev: the 2 B specs fail on both; `theme-menu.spec.ts` list-visibility checks fail intermittently on every module's page in dev (hydration timing, not Interference-specific) and pass 48 / 48 in production.

## 6. Not verified

Firefox / WebKit, a physical phone, screen-reader pass, Safari `100svh` behaviour, the 200 % text overflow (pre-existing real accessibility defect, still failing, left for follow-up accessibility work), `/en` (no English Interference route), pixel parity of the HTML overlay text (changed on purpose), the lifecycle specs against a production build (route is dev-only by design).
