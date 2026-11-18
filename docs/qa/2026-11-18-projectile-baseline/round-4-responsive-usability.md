# Projectile QA — Round 4: Responsive / usability (measured)

- Base `58f244d` + this branch's fixes. Local dev server, Playwright chromium (Pixel-style touch context for ≤500px).
- Spec: `tests/e2e/projectile-qa-viewports.spec.ts` (9 tests PASS). Evidence: `round4-files/` — 24 screenshots
  (6 viewports × initial / 參數 open / 圖層 open / 探索任務 predict), `metrics.json`, `focus-*.json`,
  `operation-counts-360x800.json`, `AFTER-mathjax-focus-ring.png`. All committed; machine-local origin (not Production).

## Measured table (CSS px; "initial" state)
| Viewport | h-overflow | Canvas (top→bottom, size) | Time controls | Key readout row | Targets <44px | Result |
|---|---|---|---|---|---|---|
| 1366×768 | none | 133→579, 1270×446 | in first screen | top 711; bottom 812 (44 px below fold; t/x/y/v row visible) | 0 | PARTIAL (see D-R4-3) |
| 1280×720 | none | 133→531, 1189×398 | in first screen | 663→764 (44 px below fold) | 0 | PARTIAL |
| 390×844 | none | 158→393, 372×235 | in first screen | 635→734 in first screen | 0 | OK |
| 360×800 | none | 158→393, 342×235 | in first screen | 635→734 in first screen | 0 | OK (small canvas) |
| 320×640 | none | 158→393, 302×235 | in first screen | below 635 → partly cut (vh 640) | 0 | PARTIAL |
| 844×390 landscape | none | 133→549 — **bottom 159 px below fold** | below fold (625) | below fold | 0 | **FAIL (D-R4-1)** |

Params open (參數): desktop keeps canvas 133→471 beside/above the panel; phones scroll the page but keep the canvas in view
(top 51→286); **landscape scrolls canvas fully off-screen (top −636)**.

## Before / after versus the historical note
11/15 evidence (Notion, `b7b47ba`): 360×800 canvas started at y≈356. Now (`58f244d`): y=158 — materially better, consistent with
PR #49 (Gate A). The old "canvas buried" defect no longer reproduces at 360×800; the canvas is, however, only 235 px tall (29 % of 800).
11/15 numbers are historical, not re-measured on that SHA.

## Measured operation counts at 360×800 (clicks from fresh load, executed)
播放/暫停 1 · 到達參數滑桿 1 · 開圖層 1 · 分享 2 · 到達匯出 1 · 進入探索任務 1 · 開理論 1 · 視角復位 1 · **套用教學預設 3** (參數→教學預設→項目).
R02 asks common functions in 1–2 operations: all meet it except presets (D-R4-2).

## Keyboard focus
First 40 Tab stops at 1366×768 and 360×800: every stop now has a solid ≥2px indicator (spec enforces).
Before fix: 2 stops (legend formulas 𝑣→, 𝑔 — MathJax `mjx-container tabindex=0`) used the UA `auto` 1px blue ring on the dark chart.

## Defects
| ID | Sev | Finding | Action |
|---|---|---|---|
| D-R4-1 | P2 (R02 rotation; not in the four required viewports) | Landscape phone 844×390: header+toolbar use 133 px of 390; canvas and time controls fall below the fold; opening 參數 scrolls the canvas out of view, so parameter edits cannot be watched | **OWNER REVIEW** — layout direction is Gate item ① (mobile canvas/tool reachability). Not patched: would be a layout change beyond "bounded fix" and C2 selection |
| D-R4-2 | P2 (R02) | Presets take 3 steps on phones | **OWNER REVIEW** (IA: promote presets?). Not patched |
| D-R4-3 | P2 (R02) | At 1366×768 / 1280×720 the readout card is 44 px below the fold (page scrolls 61 px); main row visible | Note; candidate density tweak after Owner layout choice |
| D-R4-4 | P2 (R02) | 320×640: readout partly below fold | Note |
| D-R4-5 | P2 (R10) | MathJax tab stops had a low-contrast UA focus ring on the dark chart | **Fixed** `app/projectile-c2.css`, test added. Evidence `AFTER-mathjax-focus-ring.png` |

## Not covered / limits
- 200 % text and 400 % zoom: only the pre-existing `projectile-usability` 400 % test (PASS) — no new 200 % text run.
- Real touch devices/Safari iOS not used (Chromium emulation only); no real hardware performance.
- Screenshots were visually inspected for 1366 initial, 360 params and landscape params; the remaining frames were measured, not all eyeballed.
- "Operation steps" are click counts, not usability testing with people.
