# W45 — C2 module workspace, phase 2: five-module audit and Projectile slice

Baseline: `main` @ `3ac47c7` (re-confirmed latest on 2026-11-03; no other open Lab PR touches module UI — only draft #34, docs).
Method: Playwright (Chromium) against `main` dev server on 1440 / 390 / 360 px × Light / Dark / System. Scripts are not committed; raw output is in `test-results/evidence/w45/` (git-ignored).
Labels: **SHARED** fits a common UI · **SPECIALIZED** keep module-specific · **DEFER** not this phase · **DEFECT** measured on a running page. Items not measured are called *potential*.

## 1. What was measured

| Check (main) | solar | atmosphere-profile | projectile | interference | electrostatics |
| --- | --- | --- | --- | --- | --- |
| Horizontal overflow, 9 viewport×mode combos | none | none | none | none | none |
| Visible controls under 44 px (1440) | 76 / 77 | 41 / 45 | 40 / 41 | 31 / 31 | 10 / 20 |
| Appearance control | segmented 30×28 | segmented 30×28 | segmented 30×28 | **none** | segmented 30×28 |
| Focus ring (settled) | UA `auto` 1px, 5.3:1 (light) | 2px navy, ≥10:1 | **3px gold, 1.85–2.02:1 (light)** | 3px teal | 3px yellow on dark canvas, 12.7:1 |
| `.active` buttons without `aria-pressed/expanded` | 3 | 2 | 2 (+ gravity/drag/speed/chart-mode presets) | 0 | 0 |
| Unlabelled `<select>` | **5** | 0 | 0 | 0 | 0 |
| Button transition under reduced motion | 0s | 0s | 0s | ~0s | 0s |
| Page JS errors | 0 | 0 | 0 | 0 | 0 |
| Shell vocabulary | global `.topbar/.header-actions/.layer-drawer` | same | same | own `interferenceStyles.ts` | CSS module + own app bar |

Muted text (`--muted #6d8190` on `#edf2f4`): **3.58:1** on the Solar footer, 3.87:1 on Solar metric labels (light). Dark is 6.4–9.2:1.
A probe reading of 1.73:1 for `.card-label small` is a **measurement artifact** (text sits on a gradient the probe cannot see); it is not reported as a defect.

## 2. Difference matrix

Source anchors: legacy tokens `app/globals.css:4`; base `button` `:39-41`; segmented theme control `:549-554`; layer drawer `:95-107`; Projectile focus `:582`.

| Area | solar | atmosphere-profile | projectile | interference | electrostatics |
| --- | --- | --- | --- | --- | --- |
| Shell / header / brand | SHARED (`.topbar`, global classes) | SHARED | SHARED | SPECIALIZED (own app bar, title + mode tabs) | SPECIALIZED (CSS module, BETA badge, 262×52 brand) |
| ThemeToggle | DEFECT 30×28 | DEFECT 30×28 | DEFECT 30×28 → fixed in slice | DEFECT-gap: no appearance control (tokens do follow `data-mode`) | DEFECT 30×28 |
| Toolbar / playback | SPECIALIZED (3D view tools, export) | SPECIALIZED (unit/axis) | SPECIALIZED (transport, speeds) | SPECIALIZED (wave-field tabs, sliders) | SPECIALIZED (tools, particle time) |
| Panels / drawers | SHARED `LabLayerDrawer`; DEFER control deck | SHARED drawer; control grid SHARED-candidate | SHARED drawer; side panel SPECIALIZED | SPECIALIZED (activity rail) | SHARED drawer; panels SPECIALIZED |
| Hover / pressed / selected | DEFECT: selected by colour class only | DEFECT: same | DEFECT: same → fixed in slice | OK (checkbox/segmented) | OK |
| Focus-visible | SHARED rule needed (UA ring, off-system) | OK | **DEFECT gold 1.85:1 light** → fixed | OK | OK (canvas-surface colour) |
| Touch 44 px | DEFECT (76 small) | DEFECT (41) | DEFECT (40) → 11 left, see §4 | DEFECT (31) | partial (map controls already 44) |
| Typography / spacing | SHARED serif titles + 11–12 px labels | SHARED (already larger) | SHARED | SPECIALIZED | SPECIALIZED |
| Canvas / SVG colour isolation | SPECIALIZED (3D, keep) | SPECIALIZED (chart, keep) | SPECIALIZED (keep) | SPECIALIZED (diverging field palette) | SPECIALIZED (field strength map) |
| Muted-text contrast | DEFECT 3.58:1 | same token | same token | own palette, not measured | footer 5.53:1 OK |
| Learning activities / data state | DEFER | DEFER | SPECIALIZED, untouched | DEFER | DEFER |
| Labels for form controls | DEFECT 5 unlabelled selects | OK | OK | OK | OK |

Potential, **not verified**: Projectile autoplays on load (a pause control exists); axe/screen-reader results; Safari/Firefox; real devices; the `projectile-side-grip` (13 px wide, desktop-only, role=separator) as a touch target — DEFER.

## 3. Projectile slice (this PR)

Scope: `app/projectile-c2.css` (new, every rule scoped to `.projectile-c2`), `app/projectile/page.tsx` (import), `components/ProjectileLab.tsx` (class on `<main>`, `aria-pressed` on class-only toggles, theme control moved last in DOM order). Not touched: `lib/science/projectile.ts`, `models/projectile*`, registry, CI/CD, chart SVG colours, other modules.

Approach: re-point the legacy tokens inside `.projectile-c2` to the catalog's `--lc-*` C2 values so existing rules adopt Interface colours; the dark chart surface and every scientific data colour are left alone in both themes. Gold stays decorative (live dot, readout bullets); focus/selected use Blue–Teal (`#216E84` light, `#9BD7DD` dark; `#9BD7DD` on the always-dark chart).

Measured before → after (main vs worktree, same machine):

| Metric | Before | After |
| --- | --- | --- |
| Controls under 44 px, 1440 default / panel | 40/41, 44/47 | 11/41, 12/47 |
| Focus ring contrast, light / dark | 1.85–2.02 / 7.1–8.6 | 5.31 / 11.83 |
| Selected state | colour class only, no ARIA | tint + ring + weight, `aria-pressed` |
| Overflow X (1440/390/360, all states) | none | none |
| Chart height with panel open (1440×900) | 352 px | 547 px (taller panel stretches the row) |

The 11–12 remaining items are 18 px checkboxes inside 44 px labels (the label is the target) and the desktop-only resize grip.

## 4. Second consumer (read-only)

Selector overlap with the slice, counted on the running pages: Solar and atmosphere-profile share `.topbar`, `.header-actions button`, `.lab-brand`, `.layer-drawer`, `.viewport-card`; Electrostatics shares only the theme switcher and drawer; Interference shares nothing.

* **Pick Solar** as the second consumer: same global vocabulary, so the token remap, header/button/drawer/focus rules apply nearly verbatim; its 3D canvas keeps science colours isolated; it brings the worst target count (76) and the unlabelled selects. Electrostatics is the better *stress test* (CSS-module classes, own panel model) and should go third.
* **Reusable now**: token block, 44 px button + selected/hover/focus rules, segmented theme control at 44 px, drawer label rows, readout typography.
* **Module-specific**: transport/readout dock, side panel, guided rail, zoom overlay; Solar's control deck; Electrostatics' tools and legends; everything inside the canvases.
* **Extract a primitive?** Not yet. After Solar adopts it, move only the token block and button/focus/theme rules into one `.lab-c2` stylesheet (rename `.projectile-c2` → `.lab-c2`); keep panel rules per module. Do not build a component library or Activity Engine.

Suggested order and rough Agent cost (Owner review ≈ 1 h each): Solar ~0.5–1 day (risk: dense control deck, 3D labels); atmosphere-profile ~0.5 day (low risk, EN/ZH switcher); Electrostatics ~1 day (CSS module, canvas toolbars, existing 44 px map controls); Interference ~1–1.5 days (own style system, no appearance control, many dense toolbars — highest risk, add the theme control only with Owner OK).

## 5. Verification record

* `npm run lint`: 0 errors, 2 existing warnings (`StandardAtmosphereLab.tsx`).
* `npm test` (build + unit): build passes, 449/449 unit tests pass.
* E2E `tests/e2e/projectile-uplift.spec.ts`: 4/4 pass on the worktree and 4/4 on `main` (desktop + mobile projects). An earlier run **failed** (mobile test clicks the segmented appearance buttons directly) when the control was a single-icon menu; that was a regression of this slice, fixed by keeping the segmented control. The full E2E suite was **not run**; other modules are not touched.
* Physics/interaction regression, `main` vs slice at 1440 and 390: readouts, clock and legend identical at four states (t=0.5, t=1, changed launch parameters, changed gravity), identical share payload, reset values, focus return from the layer drawer, guided entry/exit, 11 layer checkboxes, no page errors. Trajectory pixel paths differ only when the panel is open because the chart box is taller.
* Not verified: Safari/Firefox, real devices, axe, screen reader, contrast of canvas data colours, full E2E.
