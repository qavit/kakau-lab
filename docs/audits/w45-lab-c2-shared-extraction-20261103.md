# W45 — Shared C2 stylesheet extraction (Projectile × Solar)

Baseline: `main` @ `60aa380` (PR #35 Projectile C2, PR #36 Solar C2). Strictly behaviour-preserving: the scientific canvases, SVG, 3D scenes and every scientific colour are untouched. The separate "canvases look too dark" design question is out of scope (own Notion task).

## 1. Gate A — what is shared

Method: both sheets were parsed into rules and compared after renaming the scope class. 20 rules were byte-identical; every other rule was read and classified.

| Class | Rules | Decision |
| --- | --- | --- |
| **EXACT SHARED** | `--lc-*` tokens (Light, System-dark, explicit Dark), legacy-token mapping, flat page background (`body:has`), `.eyebrow`, `h1`, `.header-actions` gap, `.theme-switcher` frame and icon size, `.viewport-card` frame, `input[type=range]` 44px band, the seven `.layer-drawer` row rules, reduced-motion `button` rule; plus `.lab-brand` min size (the `margin-bottom: 0` is Projectile-only and stays local) | **Extracted** to `app/lab-c2.css` |
| **SHARED WITH ADAPTATION** | 44px button / hover / selected recipe; focus ring; theme-switcher *button* rules; disabled; the narrow-screen header | **Left local** (see §4) |
| **MODULE SPECIFIC** | Projectile: header layout, menus, side panel, groups, disclosures, transport, readout, zoom, guided rail. Solar: metrics, control deck, presets, selects, checkboxes, play actions, coordinate rows, export dialog, primary action, footer | Local |
| **DEFERRED** | Anything needing a new hook class on the shared containers (button recipe); fixing the two existing cascade issues in §4 | Not now |

## 2. What changed

| File | Change |
| --- | --- |
| `app/lab-c2.css` (new) | 103 code lines: the 20 identical rules + `.lab-brand` size, scoped `.lab-c2` |
| `app/projectile-c2.css` | 231 → 129 code lines; `.lab-brand` keeps only `margin-bottom: 0` |
| `app/solar-c2.css` | 164 → 72 code lines |
| `app/projectile/page.tsx`, `app/solar/page.tsx` | `import "../lab-c2.css"` before the module sheet |
| `components/ProjectileLab.tsx`, `components/SolarLab.tsx` | `lab-c2` added to the `<main>` class list; nothing else |

No JSX structure, props, state or science code changed.

**Duplication removed:** the 103 shared code lines existed twice; they now exist once. Total CSS code 395 → 304 lines (−91); module sheets shrink by 102 (Projectile) and 92 (Solar) lines. Files total 459 → 385 lines. The win is mainly that the token set and drawer/header rules now have one source of truth; it is deliberately not larger, because the remaining candidates need special cases.

## 3. Gate C — equivalence against pre-refactor main (`60aa380`)

Both sides were production builds served side by side. For every state the harness loaded both pages, performed the same actions, waited for a stable DOM, then compared **every computed-style property of every HTML element** (SVG subtrees excluded), each element's box, its `aria-pressed`/`aria-expanded`/class, horizontal overflow, and a screenshot.

* Projectile: 3 viewports (1440/390/360) × Light / Dark / System-dark / Light+reduced-motion × 8 states (default paused, panel, panel with scenario menu, drawer, guided, scenario menu, keyboard focus, hover) = 96 states.
* Solar: the same viewports and modes × 7 states (default, deck collapsed, selected presets + direct manipulation, drawer, export dialog, keyboard focus, hover) = 84 states.
* Leak check: Catalog, atmosphere-profile, electrostatics, interference, hydrogen and /about at 1440 and 390, Light and Dark.

| Result | Value |
| --- | --- |
| Elements compared (Projectile + Solar) | 40,728 |
| Elements with any computed-style, box, attribute or class difference | **0** |
| Horizontal overflow | none, both sides, all states |
| Other pages (leak check, 8,788 elements) | 0 style differences; the only 4 differing values are the host/port inside a `background-image` URL |
| Lint | 0 errors (the same 2 existing warnings) |
| Build, unit tests | build passes; 449 / 449 |
| E2E `solar-layers` + `projectile-uplift`, ×2, production builds | main 14 / 14, refactor 14 / 14 |
| Behaviour scripts (readouts at four states, share payload, reset, guided entry/exit, drawer focus return, layers, playback, direct manipulation, export previews, filenames, Tab order) | identical, except trajectory/canvas hashes that also differ main vs main |

**Screenshots.** 11 of 96 Projectile and 6 of 84 Solar screenshots are not byte-identical. Every one was measured: the largest per-channel difference is 9/255 and the largest differing area is 408 px. The big Solar clusters lie inside the geocentric 3D canvas (x 550–650, y 450–650 at 1440); the rest are 1–33 px of 1–9/255 edge anti-aliasing on rounded borders and buttons (for example one pixel at a button corner, difference 1/255). I did not find any difference with a visible shape. The same states differ the same way **main against main** (the harness's self-check on identical code produced 3 and 4 such screenshots; a second A-vs-A run on Solar produced 2 and 3), and 28 default-state pairs from one server were identical, so the differences are WebGL/raster timing noise, not CSS. With every computed style and box equal, no CSS-driven pixel change is possible.

## 4. Specificity and maintenance risks (for the Owner)

1. **Order convention.** `lab-c2.css` must be imported before the module sheet. The built bundle keeps that order (checked in the production CSS). It is a convention only: no shared and module rule set the same property on the same element at the same specificity.
2. **Why the button recipe stayed local.** Each module applies it to a different list of containers (`.projectile-transport`, `.guided-inner`, `.control-panel`, `.export-modal` …). Sharing it would mean either listing both modules' classes in the shared file or adding a hook class to JSX; neither is a minimal step. A future `lab-c2-controls` hook class would remove roughly 25 more duplicated lines.
3. **Existing issue, preserved on purpose — Projectile theme buttons.** `.projectile-c2 .theme-switcher button` (0,2,1) loses to the generic `:is(…) button` rule (0,2,2), so Projectile's theme buttons get the generic white fill, 10px radius and border. Solar fixed this with a one-class-deeper selector. The two modules therefore render the appearance control slightly differently, and unifying them would be a visible change, so it was not done.
4. **Existing issue, preserved — reduced motion.** The `prefers-reduced-motion` rule (`.lab-c2 button`, 0,1,1) is out-ranked by the 140 ms transition on header, theme and drawer-header buttons in both modules, so those transitions still run under reduced motion (computed `transition-duration` 0.14 s with `reduce` emulated). Cosmetic, but it is an accessibility rule that does not do its job; fixing it changes behaviour and belongs in its own PR.
5. **One global CSS bundle.** vinext emits a single stylesheet for the app, so every `.lab-c2` rule is present on every page; isolation relies entirely on the `.lab-c2` scope class. The leak check found no style change on six other pages.
6. **Tokens remain duplicated against the Catalog.** `catalog-c2.css` defines the same `--lc-*` values under `.catalog-c2`; merging that is a different, riskier change and was not attempted.

## 5. Not verified

Safari / Firefox, real devices, screen readers, and the full E2E suite (only the Solar and Projectile specs were run). Canvas and SVG pixels were deliberately left out of scope and are unchanged by construction.

## 6. Recommendation

**GO**: small, reversible (revert the six-file diff restores the two module sheets), no behaviour change measurable. Next, if wanted: fix the two existing cascade issues in §4 (items 3 and 4) as a separate behaviour-changing PR, then adopt `lab-c2` in atmosphere-profile.
