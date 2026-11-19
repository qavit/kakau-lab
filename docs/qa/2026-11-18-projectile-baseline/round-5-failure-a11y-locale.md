# Projectile QA — Round 5: Failure / accessibility / locale gap

- Spec: `tests/e2e/projectile-qa-resilience.spec.ts` (10 PASS, dev server) + `projectile-qa-viewports.spec.ts` focus tests.
- Evidence: `round5-files/` (`axe-report.json`, `series-encoding.json`, `AFTER-series-encoding-clean.png`, `zoom200-equiv-640x360.png`,
  `zoom400-equiv-320x180.png`, `export-failure-message.txt`, `perf-baseline.json`). Logs `logs/r5*-*.log`.

## Results
| Area | Test | Result |
|---|---|---|
| Share failure | unsupported version / guided-mode payload / out-of-range / not JSON / oversized → notice "分享設定無法讀取", defaults (v₀=24), paused | PASS (5 cases) |
| Export failure | `URL.createObjectURL` throws → visible message; un-stub → retry downloads `kakau-projectile.svg` and shows success | PASS after D-R5-2 fix |
| Fullscreen unavailable | `requestFullscreen` rejects / missing → notice 「全螢幕不可用；視窗內放大仍可使用」, in-window enlarge works, cursor slider present, Esc returns focus to trigger | PASS (2) |
| Reduced motion | `prefers-reduced-motion: reduce` → no autoplay, 播放 works; normal preference still autoplays | PASS after D-R5-1 fix |
| Non-colour encoding | main solid / complementary long-dash / drag dotted; legend has keyed entry for each | PASS after D-R5-3 fix |
| Reflow | 640×360 (=200 % browser zoom @1280) and 320×180 (=400 % @1280): no horizontal scroll; 工具/參數/圖層/探索任務 reachable by scrolling | PASS (approximation — see limits) |
| axe-core (wcag2a/aa, 21a/aa, 22aa tags) | free, params, layers, guided-predict, theory × {1366×768, 390×844} | **0 violations in 10 states** |
| Focus visibility | first 40 Tab stops ×2 viewports all have a ≥2px solid indicator | PASS (after Round 4 fix) |

## Defects found in this round
| ID | Sev | Req | Finding | Action |
|---|---|---|---|---|
| D-R5-1 | P1 | R10 | With `prefers-reduced-motion: reduce` the trajectory still looped automatically (cursor 0.467→0.818 in 1.2 s); module default is `playing: true`. Only smooth-scroll honoured the preference | **Fixed** (`components/ProjectileLab.tsx`): media-query subscription pauses it on mount and when the preference turns on; 播放 still works. A first attempt (sync `setState` in effect) failed lint and was reworked |
| D-R5-2 | P2 | R11 | Export failure always said 「請離開探索任務…」 even in free mode, so a real file-creation failure blamed a non-existent guided task | **Fixed**: message depends on guided state; free mode now says the browser could not create the file and suggests retry/other format (bilingual) |
| D-R5-3 | P1 | R10/R08/R09 | Complementary (solid gold) and drag (dotted gold) comparisons shared one hue and ONE legend entry 「對照軌跡」; main vs complementary differed only by hue + 0.8 px width. Series could not be identified without colour or by legend | **Fixed**: complementary long dash `9 4`, drag dotted `3 4` (same convention as export SVG); legend split into 互補角對照 / 阻力對照 with identical-pattern key lines. **No colour changed — Science palette remains an Owner Gate item** |
| D-R5-4 | P2 | test | `projectile-usability` enlarged-view test clicked before hydration (flaky once under parallel load) | **Hardened** test (waits for `data-interactive`); 8/8 repeat passes |
| D-R5-5 | info | R12 | Pre-existing failures outside Projectile, identical on pristine `main@58f244d`: `electrostatic-gate4b:101`, `electrostatic-gate5:28`, `interference-c4:72` (200 % text). Plus 10 interference tests that need the dev harness and fail on a production server | **Not fixed** (other modules; out of scope). Reported for Owner |

## Performance baseline (R11) — `perf-baseline.json`
Production build (`vinext start`), headless Chromium on the dev laptop, loopback network, 7 runs, CDP CPU throttle.
| Profile | Hydrated/interactive (ms from nav start, median) | Cursor update → 2 rAF (ms) | 參數 panel open (ms) |
|---|---|---|---|
| desktop 1366, 1× | 54 | 33 | 44 |
| desktop 1366, 4× | 194 | 33 | 60 |
| phone 360, 4× | 198 | 33 | 58 |
| phone 360, 6× | 303 | 33 | 71 |
33 ms ≈ two frames at 60 Hz, i.e. frame-bound, not compute-bound. **Not** representative devices/networks; no threshold proposed (R11: measure first, Owner sets numbers).

## R06 locale gap (listed, not implemented — Owner Gate)
- `/en/projectile` → **404**, correct under `docs/i18n-foundation.md` ("never create an English URL that renders Chinese content").
- ~3 700 CJK characters hard-coded across `ProjectileLab.tsx` (1 049), `GuidedActivities.tsx` (730), `TheoryNotes.tsx` (1 730), `projectile-learning.ts` (170); no Projectile entry in `lib/i18n.ts`; no ruby handling in code.
- Export JSON/SVG is bilingual (zh/en inline) — verified; the **page** is not.
- Needs: reviewed English translation, catalog/registry copy, hreflang/sitemap pairing, long-English + ruby specimen. **OWNER REVIEW** (translation review capacity and scope); no specimen added because there is no locale infrastructure in the module to test against.

## Not covered / limits
- No real assistive technology (VoiceOver/NVDA/TalkBack): axe finds only a subset of issues. **No WCAG 2.2 AA claim.**
- 200 %/400 % checked as viewport equivalents of browser zoom, not text-only enlargement; 11/15 `projectile-usability` 400 % test also passes.
- Targets: all visible controls ≥44 px except range inputs (native sliders measured separately—not audited for 24 px AA minimum beyond axe).
- Drag-alternative for canvas manipulation (R10) and screen-reader structured readout: not verified.
- Failure paths for numerical blow-up (NaN) are covered at model level only; no UI injection.
