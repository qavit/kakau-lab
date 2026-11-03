# W45 — Solar C2 slice and second-consumer evidence

Baseline: `main` @ `fdabc36` (Projectile C2 merged, PR #35). Scope of this PR: `/solar` only. Same approach as Projectile: one scoped stylesheet (`app/solar-c2.css`, every rule under `.solar-c2`), no change to the 3D scenes, `lib/science/solar.ts`, `models/solar.ts`, the registry, the theme runtime, CI or any other module. No shared primitive is extracted here.

## 1. What changed

| File | Change |
| --- | --- |
| `app/solar-c2.css` (new, 195 lines) | Tokens, header, 44px controls, selected/focus states, segmented theme control, control deck, layer drawer, export dialog, narrow-screen rules |
| `app/solar/page.tsx` | imports the stylesheet |
| `components/SolarLab.tsx` | `solar-c2` class on `<main>`; `aria-pressed` on 直接操控; `aria-expanded` on 控制台 |
| `components/solar/ControlDeck.tsx` | `aria-pressed` on latitude/date presets and 一天/一年; `aria-label` on the 24 節氣 and trace-interval selects |
| `components/solar/LayerDrawer.tsx` | `aria-label` on the three appearance selects (地球外觀, 地心模型觀察者外觀, 觀察者模型中心外觀) |

The five previously unlabelled selects are the 24 節氣 select, the trace-interval select, and the three drawer selects (地球外觀, two observer styles). The compass-count select already had a label.

## 2. Before / after (main vs this branch, same machine)

Measured by Playwright over 1440 / 390 / 360 px × Light / Dark / System × five states (default, deck collapsed, layer drawer, export dialog, keyboard focus), 45 captures per side.

| Metric | main | C2 |
| --- | --- | --- |
| Interactive controls under 44px (checkbox counted by its label), summed over all 45 captures | 1713 | **0** |
| Appearance control | 30×28 | 44×44 |
| Selects without an accessible name (drawer open) | 5 of 6 | **0** of 6 |
| `.active` / `.selected` buttons without `aria-pressed` / `aria-expanded` | 3 | 0 |
| Text under 4.5:1 on a solid surface (drawer open, light) | 3 (`.field-label`, 3.89:1) + 1 export note (3.89:1) | 0 |
| Muted text on light page (footer, labels) | 3.58:1 | 6.27:1 (on page), 6.83:1 (on cards) |
| Focus ring | 2px navy `#173d57` (light), pale grey `#dce9ef` (dark) | 2px `#216e84` 5.31:1 (light), `#9bd7dd` 11.83:1 (dark) |
| axe (serious/critical), 12 state × viewport × mode runs | 6 runs fail: `select-name` (critical) ×3, `color-contrast` (serious) ×2 in the drawer, ×1 in the export dialog | **none** (one `aria-allowed-role` *minor* in the shared drawer remains, present on main too) |
| Horizontal overflow | none | none |
| Page errors | 0 | 0 |
| Page height (default state) 1440 / 390 | 1137 / 1792 px | 1253 / 2169 px |

The text-only 模型目錄 link was invisible at ≤660px on main: the global narrow rule sets `font-size: 0` on every header control and that link has no icon. It is now visible.

## 3. Regression (main vs C2, deterministic script, desktop 1440 and mobile 390)

Compared: metrics strip (declination, noon altitude, current altitude/azimuth, shadow length, direction), control-deck labels, preset selected state, latitude/date/time sliders, 24 節氣 select, reset, layer drawer (35 checkboxes, toggles, earth transparency, Escape and focus return), 直接操控 with drags on both canvases, 一天 / 一年 playback and pause, 正午, shadow trace checkbox and interval, export dialog with five target/mode combinations and the saved filename, and the Tab order of the first 30 stops.

* **Identical:** every readout and label string, layer count and toggle deltas, focus return after Escape, shadow-trace values, download filename, Tab order (apart from the renamed select label), no page errors.
* **Export previews (5 mode combinations):** identical byte-for-byte on mobile. On desktop the *global* line-art export is identical; the other four *local-observer* exports differ slightly because the local card is 1px shorter (695 vs 696px; the metrics strip grows by 1px). This is an aspect-ratio effect, not a scene change.
* **Canvas screenshot hashes differ** between main and C2 even with identical readouts: the cards now sit at a fractional vertical offset (header is taller), which changes anti-aliasing. A side-by-side diff of the geocentric card shows identical geometry, labels and legend. Screenshot hashes therefore are *not* used as a pass/fail signal here; export bytes and readouts are. Two canvas hashes (after a drag) also differ main vs main, so drag inertia is not deterministic.
* **Intended differences:** `aria-pressed` / `aria-expanded` now present on the toggles.

E2E (`tests/e2e/solar-layers.spec.ts` + `projectile-uplift.spec.ts`, production build of each side, run twice):
* **C2: 14 / 14 pass.**
* **main: 12 / 14 pass.** The Solar axe test fails on main (`color-contrast`, `select-name`) and passes on C2: an *existing failure fixed by this PR*, not a regression.
* Against the dev server both sides flake on the drawer-open assertions (a click can land before hydration); that is an environment issue and is why the production builds were used for the comparison.

## 4. Reuse of the Projectile C2 slice

| Piece | Verdict |
| --- | --- |
| `--lc-*` token block (light, system-dark, explicit dark), legacy-token re-pointing, `body:has(...)` background | **Reused verbatim** (rename of the scope class only) |
| 44px button, hover, selected (`tint + ring + weight`) | Reused; selector list adapted (Solar's classes are `.header-actions`, `.control-panel`, `.export-modal`) |
| Segmented theme control at 44px | Reused verbatim; needed a higher-specificity selector because Solar's generic button rule outranks it (same trap as Projectile's `.projectile-group-flush`) |
| Focus ring | Reused; the Projectile variant for focusable controls on a dark chart is unnecessary here (no focusable control lives on a canvas) |
| Layer drawer rows, summary, checkbox sizes | Reused near-verbatim; Solar adds coordinate rows and selects |
| Range 44px hit band, select 44px, checkbox 18px | Reused |
| Readout typography (sans, tabular numerals) | Adapted to `.metrics` |
| Primary action (`匯出`) | New: accent fill with `--lc-on-accent` (5.79:1 light, 11.15:1 dark); Projectile has no primary header action |
| Gold `.year-play` accent | New: neutralised, so gold stays decorative |
| Narrow-screen header | New: labels forced visible (the global rule hides them); Projectile already did this |
| Projectile transport grid, side panel, guided rail, zoom overlay | Not applicable |

Roughly 60% of the stylesheet is the Projectile block or a renamed copy of it (tokens, theme control, focus, drawer, button/selected, range/select); the remainder is Solar's control deck, metrics, export dialog and header actions.

## 5. Is a small shared stylesheet justified now?

**Yes, now with two consumers.** The duplicated block is the token set, the 44px button / selected / focus / segmented theme rules and the layer-drawer rules. Suggested follow-up (a separate PR, not done here): move those into one `app/lab-c2.css` scoped to `.lab-c2`, keep panel and deck rules per module, and have the shell classes of the two modules add `lab-c2`. Cost: about 0.5 day including re-running both modules' regressions; risk: the selector-specificity differences noted above must be preserved, which is the main regression source seen twice already. atmosphere-profile (global shell, shared drawer) is expected to adopt it with less work than either did.

## 6. Verified shared vs specialized UI

* **Shared (works unchanged in both):** tokens, 44px control, selected state, focus ring, segmented appearance control, drawer rows, range/select/checkbox sizing, header rule and eyebrow/h1 type.
* **Specialized (stays per module):** Solar's control deck, metric strip, export dialog and header action set; Projectile's transport, side panel, guided rail and zoom controls; everything drawn on the canvases and every scientific colour.

## 7. Risks and not verified

* Mobile page is 377px longer (1792 → 2169px) from 44px targets: header 3 rows, taller deck. Canvas card sizes are unchanged.
* The local-observer export differs sub-pixel on desktop (1px card height); readouts and the global export are identical.
* Not run: full E2E suite, Safari / Firefox, real devices, screen reader, contrast of canvas-drawn labels and legends (unchanged, on dark surfaces), `prefers-reduced-motion` runtime check (rule present, not exercised).
* Existing, left alone: nested `<label>` around the whole time control in `ControlDeck`; `aria-allowed-role` (minor) in the shared drawer.
