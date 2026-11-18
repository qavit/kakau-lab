# Round 8 — Mobile workspace implementation (Owner-approved A + phone-only B)

2026-11-18 · Draft PR #52 · base `9f92792` (before) → head = PR head (see PR). Engineering candidate, **not** Product Gate PASS / Release; no merge, no deploy.
Owner ruling (Notion Gate card, 2026-11-18): A (844×390 two-column) + B phone-only preset shortcut; C not adopted; portrait 235px canvas unchanged; 844×390 a required R02 viewport this round.

## What changed (product code)
| Part | Files | Notes |
|---|---|---|
| A | `app/projectile-c2.css` (block "Landscape phones") | Scoped `orientation:landscape` + `max-height:520px` + `min-width:661px`. Not a copy of the prototype: the prototype broke the expanded view (see below), so the block also gives the expanded view a two-column layout and compacts share/export notices. |
| B | `components/ProjectileLab.tsx`, `app/projectile-c2.css` | New `預設` tool-bar button + `PresetSheet` (10 presets, scrollable, modal: background inert, Tab wraps, Escape/outside/choose closes, focus returns). Preset logic is one shared `applyPreset` used by both the sheet and the existing panel menu. Phone-only by CSS (≤660px, or short landscape); absent on desktop and in Guided. In-panel 教學預設 menu: `scrollIntoView` + `scroll-margin-bottom` so the last item clears the bottom bar. Tool-bar labels 12px/nowrap for four tools at 320px. |
Not touched: physics, share v1 codec, export, Guided policy, registry, Science colours, other modules, portrait canvas size.

## Defects found by implementing (not visible in the Owner pack)
1. **Prototype A broke the expanded view at 844×390** (canvas 0px high): its stage rules also matched `data-expanded="true"`. Fixed; expanded is now two-column (canvas 488×372, was 818×131 before the change).
2. **Preset menu axe `target-size`**: a non-modal sheet obscured the transport speed buttons. Sheet is now modal (stage `inert`).
3. **Sheet position**: first version used a fixed offset; the bottom bar is only sticky when the page is taller than the viewport, so at 390×844 the sheet overlapped it. Now anchored to the bar.
4. **Focus reset**: focus-in ran on every re-render (playback re-renders each frame) and stole focus; now once per opening.
5. Share notice in landscape pushed the canvas to 54% visible; compact row → 78%.

## Before / After (Chromium touch emulation; `round8-files/before-after.mjs`, data `round8-files/data/before-after.json`, screenshots `round8-files/shots/{before,after}-*`)
| Viewport | Canvas initial: before → after | Canvas params open | Preset operations (to 月球重力) | Last preset item reachable | Expanded canvas |
|---|---|---|---|---|---|
| 844×390 | 791×416 **62% visible** → 453×261 **100%** | **0%** → **100%** (453×172) | 3 → **2** | yes → yes | 818×131 → 488×372 |
| 360×800 | 342×235 → same | same | 3 → **2** | yes | unchanged |
| 390×844 | 372×235 → same | same | 3 → **2** | yes | unchanged |
| 320×640 | 302×235 → same | same | 3 → **2** | yes | unchanged |
| 1366×768 / 1280×720 | identical | identical | 3 → 3 (shortcut absent, by design) | — | identical |
Caveat: the before/after "last item reachable" probe scrolls the item into view first; the claim that the old in-panel menu's last item was hidden by the bar is the Owner's/earlier observation and was not separately re-measured here. The new test asserts the after-state without relying on that.
Share notice at 844×390 after: canvas 78% visible, rest by scroll (notice is not dismissible).

## Tests (new: `tests/e2e/projectile-mobile-workspace.spec.ts`, 18 tests, real pages)
A: initial/params/layers/share/expanded(±panel)/guided at 844×390 (overlaps, viewport reach, slider/cursor/play-pause operated, rotation round-trip keeps v₀, cursor and panel state); axe at 844×390 initial / params / sheet. B at 360×800, 390×844, 320×640, 844×390: toolbar labels not clipped and ≥44px; 2 operations apply the last preset; sheet clear of the bar and last item hit-tested; keyboard (Enter opens, Tab through 10, wrap, Escape, focus return); axe with sheet open. Phone-only: absent at 1366×768 and 1280×720 and in Guided. Axe (wcag2a/aa/22aa): 0 serious/critical in all 6 states; non-blocking findings are listed in `round8-files/after/metrics.json`.

## Regression (production build, same machine/command as round 7)
| Check | Result |
|---|---|
| lint | 0 errors, 2 existing atmosphere warnings |
| unit | 470 / 470 |
| Full E2E (`--workers=3`) | 282 passed / 13 failed. Failure set **identical** to round 7 PR head (`logs/r7-prhead…` vs `logs/r8-prhead-e2e-full-prod.log`): 10 need the dev-only harness, 3 fail on clean main too. +18 passed = the new spec. |
| Guided anti-leak, share v1, export, immersion, physics | existing projectile-qa-* / projectile-export / state specs in the full run: no new failure |
| Desktop 1366×768 / 1280×720 | canvas/readout geometry identical before vs after |

## Not verified
Real devices, Safari/iOS (`100dvh`, URL bar), real assistive technology (no WCAG AA claim), 200% text / 400% zoom with the new layouts, long English / ruby, student or Owner hands-on use. Two simultaneous notices in landscape. Estimated hours are not actuals.
## Rollback
Revert the round-8 commits (A: `ff395e1`; B + fixes: see PR). CSS/TSX only; no data or schema change.
## OWNER REVIEW (open)
Landscape share notice stays in flow (canvas 78%); a dismiss button would change behaviour on all widths. Whether to keep `預設` in short-landscape (currently yes) or phones in portrait only.
