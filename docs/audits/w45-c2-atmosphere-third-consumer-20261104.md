# W45 — Atmosphere profile C2 slice (third consumer)

Baseline: `main` @ `d4d3764` (Projectile #35, Solar #36, shared `lab-c2.css` #37, cascade fix #38 merged; only draft #34, docs, open).
Scope: `/atmosphere-profile` and `/en/atmosphere-profile` (one component). Not touched: `lib/science/standardAtmosphere.ts`, `models/standardAtmosphere.ts`, the chart SVG (`AtmosphereChart`, `AxisGroup`), `.atmos-*` rules, `QUANTITY_META` colours, registry, theme runtime, CI/CD, other modules. The P2 research on the dark science canvas is not addressed here.
Method: Playwright (Chromium) against production builds (`vinext build` + `vinext start`) of `main` (port 3100) and this branch (3101). Scripts are not committed; screenshots are in `test-results/evidence/w45/atmosphere/{before,after}/` (git-ignored): 1440 / 390 / 360 px × Light / Dark / System, closed and with the layer drawer open.

## 1. What changed

| File | Change |
| --- | --- |
| `app/atmosphere-c2.css` (new, 77 lines) | Atmosphere-only rules under `.atmosphere-c2` |
| `app/atmosphere-profile/page.tsx`, `app/en/atmosphere-profile/page.tsx` | import `lab-c2.css` then `atmosphere-c2.css` |
| `components/StandardAtmosphereLab.tsx` | `atmosphere-c2 lab-c2` classes on `<main>`; `aria-pressed` on 對調座標軸, altitude presets and the three unit groups; `aria-expanded` on 圖層 |

## 2. Audit — before (main), measured

| Check | main | slice |
| --- | --- | --- |
| Visible controls under 44 px (all 9 viewport × mode combos, drawer open) | 53 | 11 |
| Language links | 62×28, 54×28 | 44 px high, segmented frame |
| Appearance buttons | 30×28 | 44×44 |
| Altitude presets / unit buttons | 28 px high | 44 px high |
| Quantity selects | 40 px | 44 px |
| Layer-drawer rows / radios | 37 px, 13 px inputs | 44 px, 18 px inputs |
| Fullscreen toggle | 31×31 | 44×44 |
| Range inputs | 3 px hit area | 44 px band (shared rule) |
| Focus ring (settled) | mixed: UA `auto` 1 px blue on selects/ranges/links, 3 px on buttons, 2 px on language links | one 2 px ring: `#216E84` Light, `#9BD7DD` Dark/System, light variant on the dark chart card |
| Selected state | colour class only, no ARIA on 5 toggle groups | tint + ring + weight, `aria-pressed` / `aria-expanded` |
| Muted label contrast (Light) | 3.58 : 1 | 9.96 : 1 |
| Source note / eyebrow contrast (Light) | 3.58 / 4.85 : 1 | 6.27 : 1 |
| Horizontal overflow, page errors | none | none |
| Button transition under reduced motion | 0 s | 0 s |
| Closed drawer | its shadow bled onto the page's right edge | `box-shadow: none` while closed |

The 11 remaining under-44 items are 10 inputs (4 checkboxes, 6 radios, 18 px) inside 44 px labels and one inline citation link in the source note (inline text link; not made a block target).

Existing defects fixed: the 44 px targets, focus consistency, missing toggle ARIA, 3.58 : 1 muted text, the 28 px language links, header labels hidden at ≤660 px (the global rule sets `font-size:0`; labels are shown again at 14 px, as in Solar), drawer shadow leak.

## 3. Reuse of `lab-c2.css` versus module rules

Reused unchanged: the `--lc-*` tokens and legacy-token remap, flat page background, header type, theme-switcher frame, chart-card frame, 44 px range band, layer-drawer rows, checkbox sizing, reduced-motion rule.

Atmosphere-specific: language switcher frame (Solar has none beside the theme control), the preset/unit button rows, `.unit-toggle` wrapping, the control-panel frame, the quantity-scale rows in the drawer (the quantity-colour left border is data colour and is kept), the fullscreen toggle on the dark card, the source note.

Duplicated from `solar-c2.css` nearly verbatim (about 20 lines: header-button recipe with hover/selected, appearance buttons, focus ring, select). This is now three consumers with the same block; a second extraction (`lab-c2` button/focus/select rules) is a reasonable follow-up, kept out of this PR by scope.

## 4. Verification

* `npm run lint`: 0 errors, the same 2 existing warnings in `StandardAtmosphereLab.tsx` as `main`.
* `npm test` (build + unit): build passes, 449/449 unit tests pass.
* E2E `tests/e2e/i18n-atmosphere-profile.spec.ts`: 2/2 pass (desktop + mobile) against the slice build. It is the only e2e spec that opens this page. The full E2E suite was not run; no other module is touched.
* Physics / chart regression, `main` vs slice, production builds, 1440 and 390, `/atmosphere-profile` and `/en/atmosphere-profile`: 112 states each (default, 5 altitude presets, cursor slider, K/°C/°F, Pa/atm/mmHg/hPa, density A/B, g/cm³, swap quantities, swap axes, log/linear per quantity, each layer toggle, tooltip toggle, reset). For every state the SVG was compared on every path `d` and stroke, every axis/tick/boundary line coordinate, every text node with position and fill, every circle/rect, the viewBox, the rendered SVG size and the numeric readouts. **0 differences**; reset returns to the default snapshot; 0 page errors. A pixel hash was not used as a gate.
* Interaction: ARIA state flips on click for swap, layers, presets and units; theme toggle sets and clears `data-mode`; keyboard focus rings measured in Light / Dark / System.
* Not verified: Safari / Firefox, real touch devices, axe / screen reader, contrast of the canvas data colours (P2), the full E2E suite, the PNG export visually, browser fullscreen mode visually.

## 5. Known issues left (not caused by this slice)

* At 390 / 360 px the SVG scales with the card width, so tick and axis labels render at about 6–7 px. Fixing it means changing label sizes or layout inside the chart; deferred.
* The two `react-hooks/exhaustive-deps` warnings on `plot` pre-exist.

## 6. Final accessibility gate — layer drawer keyboard behaviour

Measured on production builds with a real keyboard (Tab / Shift+Tab / Enter / Space / Escape), 1440 px.

| Check | Atmosphere at `b5a9713` | Atmosphere after fix | Solar (main) | Projectile (main) |
| --- | --- | --- | --- | --- |
| Drawer closed: `inert` / `role` | no / none | `inert` / `dialog` | `inert` / `dialog` | `inert` / `dialog` |
| Drawer closed: Tab and Shift+Tab stops inside the drawer | **11 / 11** (hidden, off-canvas) | 0 / 0 | 0 / 0 | 0 / 0 |
| Open: focus after Enter on 圖層 | stays on the trigger | moves to the close button | close button | close button |
| Open: Space toggles a checkbox | yes | yes | yes | yes |
| Escape | does nothing | closes | closes | closes |
| Focus after Escape / close button | stays in the (now hidden) drawer | back on 圖層 / Layers | 圖層 | 圖層 |

Root cause: Atmosphere renders its own `AtmosphereLayerDrawer` (it needs the per-quantity scale rows), which had only `aria-hidden`; the shared `LabLayerDrawer` used by Solar and Projectile already has `inert`, `role="dialog"`, focus-in, Escape and focus return. So the defect was **Atmosphere-specific and not shared**. Fix, inside this PR: the same contract added locally to `AtmosphereLayerDrawer` (`inert`, `role="dialog"`, `aria-label`, close-button focus on open, Escape, `returnFocusRef` to the 圖層 button, `aria-controls` on the trigger). The shared drawer was not used because its close label is hard-coded Chinese and the English page needs `copy.drawer.close`. Verified on `/atmosphere-profile` and `/en/atmosphere-profile`.

Same as the shared drawer, the open drawer is non-modal: Tab leaves it for the page after the last control (no focus trap).
