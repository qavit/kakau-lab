# Projectile Baseline QA — Integration Report (engineering candidate)

Date 2026-11-18 · Repo `qavit/kakau-lab` · Branch `qa/projectile-baseline-20261118` · Base `main@58f244d` · **Verified product-code head `e101bf6`** (docs-only commits may follow; see PR for the final head and its CI)
Status: **Draft candidate for Owner review. No merge, no deploy, no Product Gate / Release claim.**

---
# FINAL ENGINEERING REVIEW PACKAGE (closeout) — classification: see §F10
Engineering candidate. **Not** a Product Gate PASS, Owner UX approval, Student validation, merge approval or Release approval. Nothing merged, nothing deployed.

## F1. SHAs, PR, CI
Base `main@58f244d90b9b` (= merge-base) · verified product-code head `e101bf6af697` · [Draft PR #52](https://github.com/qavit/kakau-lab/pull/52) (open, draft, mergeable) · 340 files, +50.6k/−15, of which 330 are `docs/qa/…` (≈229 PNG, 38 JSON, 30 logs) and 10 are code/tests.
CI: GitHub Actions `check` run [44247514833](https://github.com/qavit/kakau-lab/actions/runs/44247514833) on exactly `e101bf6` = **success** (1m40s). Any later docs-only commit gets its own run; the PR page is authoritative for the final head — earlier green runs (268344c, 9f92792) are not evidence for later SHAs.
Hygiene: all 13 commits authored/committed as `qavit`; no secrets pattern hits; no local absolute paths in this PR's files (the only repo hit, `docs/audits/interference-gate-c-20261029/lint-final.log`, pre-exists on main); no unrelated source changes (non-doc files: `ProjectileLab.tsx`, `projectile-c2.css`, `projectile-export.ts`, 7 test files). Tracked `docs/qa` ≈ 22 MB (mostly screenshots) — accepted as evidence, can be trimmed on request. Two untracked local zips in the working tree are **not** committed.

## F2. Scope
Done: baseline QA rounds 1–6 (science/share/export/Guided/responsive/failure), 7 bounded fixes, Owner decision pack, round 8 = Owner-approved A (844×390 two-column) + phone-only B (`預設` shortcut), 18 new mobile E2E.
Excluded (unchanged): physics, integrator, share v1 codec, registry/maturity, Science palette, other modules, portrait canvas size (235 px), C (not adopted), reference pin, full English/`/en/projectile`, ruby, share-notice dismiss, Hydrogen, Solar development, 11/30 milestone conditions.

## F3. Integration (rounds 1–6 + round 8)
Fixes: SVG legend keys (P1) · reduced-motion autoplay (P1) · complementary/drag series pattern-coded with two legend entries (P1) · export-failure message (P2) · share notice no longer claims cursor restore (P2) · staircase drawn in export (P2) · MathJax focus ring. Round 8: landscape two-column; expanded view 818×131 → 488×372; preset 3 → 2 operations; modal preset sheet; compact landscape notices. Before/after: `round-8-mobile-workspace.md`, `round8-files/`.

## F4. Test data (final head `e101bf6`, production build, this session)
| Check | Result |
|---|---|
| lint | 0 errors; 2 pre-existing atmosphere warnings |
| unit | 470 / 470 |
| build | complete |
| Full E2E, same machine/command/config (`playwright test --workers=3`, production build) | **clean main@58f244d: 13 failed / 230 passed · head e101bf6: 13 failed / 282 passed** — failed-test sets **identical** (diffed from the two fresh logs: `logs/r9-main-58f244d-e2e-full-prod.log`, `logs/r9-head-e101bf6-e2e-full-prod.log`); +52 passed are tests added by this PR (34 QA + 18 mobile) |
| Included in the full run | all `projectile-*` specs, Guided anti-leak, share round trip (clean browser, legacy golden link), SVG/JSON export, expanded view, `projectile-mobile-workspace` (18) incl. keyboard + axe at 844×390 / 320×640 / 360×800 / 390×844 and desktop 1366×768 / 1280×720 |
Remaining 13 failures: 10 need the dev-only interference harness (absent in production build; passed on the dev server in round 7), 3 fail on clean main too (`electrostatic-gate4b:101`, `electrostatic-gate5:28`, `interference-c4:72`; other modules, untouched). **No new regression found.**

## F5. R01–R12 → `evidence-matrix.md`
0 PASS · 11 PARTIAL · 1 FAIL (R06: no `/en/projectile`). R02 annotated with round 8 (still PARTIAL: no real device, no 200%/400% zoom on new layouts, no Owner hands-on). Rows other than R02 were last individually verified at `77a30c6`; their code is unchanged since, and their tests ran again in the final full suite.

## F6. Defects fixed / accepted limitations / not verified
Fixed: see F3 and round-8 defects list. Accepted by Owner: landscape share notice not dismissible (canvas 78% visible); `預設` kept in short landscape; portrait canvas 235 px.
Not verified: real devices & Safari/iOS (`100dvh`), real assistive tech (no WCAG AA claim), 200%/400% zoom on new layouts, long English / ruby, representative-device performance, Production deploy/smoke/rollback, students, Owner hands-on, two simultaneous notices in landscape.

## F7. Merge and rollback (for the Owner; not performed)
Merge: Owner decides; PR is Draft — mark ready, require green CI on the final head, squash or merge as preferred. No deploy step is part of this PR; Production smoke afterwards is a separate task. Rollback before merge: close PR / delete branch. After merge: `git revert e101bf6 ff395e1` removes the mobile work; add `77a30c6 b714247 32a76fa fbe87e6` to remove the earlier fixes (independent commits; CSS/TSX/tests only, no data or schema change).

## F8. Owner decisions still open
Merge timing and Release; R06 full English + ruby; R08 reference pin; share payload model-version statement (R04); series line patterns vs Science palette; 11/30 REPLAN and Solar second consumer; Owner hands-on mobile acceptance; whether to trim docs screenshots.

## F9. Reusable assets
`projectile-qa-*` tests (oracle science, golden share v1, reachable-text leak scan honouring `inert`/`aria-hidden`, viewport metrics/focus audit, fault injection + axe, round trip); `projectile-mobile-workspace.spec.ts`; `round8-files/before-after.mjs` (two-build measurement); `mobile-pack/` prototypes + `try.mjs`; keyed legend + line-pattern convention; modal preset sheet pattern (inert background, Tab wrap, focus return).

## F10. Solar second-consumer candidates (no Solar development started)
Candidates with an existing Projectile implementation that a second consumer could prove: keyed legend / line-pattern convention (canvas ⇄ SVG export); reduced-motion handling for autoplay; focus-ring rule for MathJax on dark canvases; fail-closed share decode + "starts paused" copy; export JSON⇄SVG single-snapshot test pattern; preset-sheet + tool-bar pattern for phones; landscape two-column workspace CSS. Extract only what Solar actually reuses; no universal engine.

**Final classification: READY FOR OWNER MERGE REVIEW** — conditional on the final PR head's CI (see F1). This is not merge or deploy approval.

---
# Historical report (rounds 1–6; round 8 in `round-8-mobile-workspace.md`)
## 1. Executive summary
Projectile at `58f244d` is in better shape than the 11/18 source audit implied: lint/build/457 unit/18 E2E all passed unchanged, science and share
v1 matched independent closed forms, Guided protection held at UI and model layers, and axe found nothing in 10 states. Real-browser QA still found
**five defects that tests never saw** (3 × P1, 2 × P2) and fixed them without touching physics, the integrator, share v1 or any maturity flag.
Open items are mostly **Owner decisions** (mobile/landscape layout, preset reachability, full English route, reference pin, share-version statement).
No R-item is PASS; R06 is FAIL (no `/en/projectile`).

## 2. Work done per round
| Round | Done | Evidence |
|---|---|---|
| 1 Baseline | SHA/PR/worktree state; npm ci, lint, build, unit, E2E; found `127.0.0.1` vs IPv6 dev-server tooling issue; corrected audit on fullscreen fallback | `round-1-baseline.md`, `logs/` |
| 2 Science/share/export | 11 oracle-based tests; golden share v1; real UI files + clean-browser reopen; visual SVG inspection → legend & share-copy defects | `round-2-…md`, `round2-files/` |
| 3 Guided | 13 E2E: anti-leak scan (user-reachable text only), gating, retry, mode switch, answer isolation, policy table | `round-3-…md` |
| 4 Responsive | 6 viewports × 4 states measured + 24 screenshots, operation counts, focus audit → MathJax focus ring; landscape defect | `round-4-…md`, `round4-files/` |
| 5 Failure/a11y/locale | share/export/fullscreen fault injection, reduced motion, non-colour encoding, axe, reflow, perf baseline, R06 gap sizing | `round-5-…md`, `round5-files/` |
| 6 Integration | final prod-build regression, clean-environment files, staircase export defect, matrix, PR | `evidence-matrix.md`, `round6-files/` |

## 3. Before / after
| Item | Before | After |
|---|---|---|
| SVG legend | text only; solid vs dashed unmappable | keyed line per series, same stroke/dash |
| Canvas series | complementary solid gold = drag dotted gold, one legend entry | main solid / complementary long-dash / drag dotted; two legend entries (**no colour changed**) |
| Reduced motion | autoplay looped | no autoplay; 播放 available; reacts to preference change |
| Export failure (free mode) | "leave the guided activity…" | states file-creation failure + retry advice |
| Share notice | "從起點暫停" (receiver actually sees default cursor 0.45) | "還原起始設定並暫停，不含目前時間游標" (both messages) |
| Staircase export | trajectory only, stairs absent from figure and text | steps drawn (clipped) + stair parameters; schema unchanged |
| Legend formula focus | UA 1 px blue ring on dark chart | C2 2 px ring |
| Enlarge test | clicked before hydration (flaky) | waits for `data-interactive` |

## 4. Commits, branch, PR, CI
`git log main..HEAD`: `073250a` docs R1 · `037d16b` tests R2 · `fbe87e6` fix legend/share copy · `1e546ac` docs R2 · `600369c` tests R3 ·
`32a76fa` fix focus ring + viewport tests · `b714247` fix reduced-motion/series/export message · `77a30c6` fix staircase export · docs commits · `ff395e1` feat landscape two-column (A) · `e101bf6` feat phone preset shortcut (B) + landscape expanded/notice fixes.
PR / CI: see the Draft PR (linked from the Notion task card). Existing PRs: #48, #49 MERGED 11/16; #46/#47/#50/#51 closed unmerged (untouched).

## 5. Evidence Matrix → `evidence-matrix.md` (R01–R12; 11 PARTIAL, 1 FAIL, 0 PASS)

## 6. Science / product / accessibility results
- Science: 11 oracle tests PASS (vacuum closed forms ×4 g, apex v_y=0 & v_x≠0, complementary equal range/different time, raised launch breaks it, drag b→0 linear convergence, 120 s cap). No inconsistency found; physics untouched.
- Share/export: golden v1 byte-stable; clean-browser round trip; JSON⇄SVG one snapshot over 7 presets × 3 cursors; Guided export blocked UI+model for all phases.
- Product: workspace metrics, operation counts, failure recovery. Accessibility: axe 0 violations / 10 states; **no AT, no WCAG claim**.
- Full suite on final prod build: 264 pass, 13 fail — 10 need the dev-only interference harness; `electrostatic-gate4b:101`, `electrostatic-gate5:28`, `interference-c4:72` **fail identically on pristine `main@58f244d`** (pre-existing, other modules, not touched).

## 7. Not verified / blocked
Real AT; real phones/Safari; text-only 200 %; Production deploy/smoke/rollback; CI on this branch (until PR runs); representative-device performance; students;
theory-page content audit; long-English/ruby specimens (no locale infra); load-failure and numeric-failure UI injection; print/B&W export; other renderers for SVG.

## 8. OWNER REVIEW items (evidence + recommendation, nothing decided)
1. ~~Mobile/landscape layout~~ **DECIDED by Owner 11/18 (A + phone-only B), implemented in round 8** — see `round-8-mobile-workspace.md`. Portrait canvas stays 235 px by decision.
2. ~~Preset reachability~~ **DECIDED + implemented (phone `預設` button, 2 operations; kept in short landscape).**
3. **Series line patterns** (long dash/dotted) were added for R10 without choosing a Science palette; confirm or replace in the palette decision.
4. **Full English route + ruby** (R06 FAIL): needs reviewed translation; repo policy bars placeholders.
5. **Reference pin** (R08): new UX.
6. **Share payload has no model version** (R04): decide a guarantee statement vs a v2 payload (v1 must not change).
7. **11/30 scope reset / Solar second consumer**: no action taken, per authorisation.
8. Pre-existing failing tests in Electrostatics/Interference tracks.

## 9. Reusable assets
`tests/projectile-qa-regression.test.mjs` (oracle + golden), `projectile-qa-guided.spec.ts` (reachable-text leak scan honouring `inert`/`aria-hidden`),
`projectile-qa-viewports.spec.ts` (metrics, focus audit, op counts), `projectile-qa-resilience.spec.ts` (fault injection, axe), `projectile-qa-roundtrip.spec.ts`;
line-pattern + keyed-legend convention (canvas ⇄ export SVG); evidence layout under `docs/qa/<date>-<module>-baseline/`.

## 10. Next phase & rollback
Next: (a) Owner 11/20 decisions above; (b) Solar as second consumer **only** if it extracts shared pieces proven by two consumers (this branch's legend/focus/reduced-motion fixes are candidates);
(c) real-device + AT pass; (d) fix the 3 pre-existing failing tests in their own tracks.
Rollback: nothing merged or deployed. To drop everything: close the Draft PR and delete the branch. To keep tests but revert behaviour:
`git revert e101bf6 ff395e1 77a30c6 b714247 32a76fa fbe87e6` (each independent; none touches physics, share codec, registry).
Dev note: `BASE_URL=http://localhost:3000` is needed on Node 26 (dev server binds IPv6).
