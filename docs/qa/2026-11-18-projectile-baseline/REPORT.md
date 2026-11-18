# Projectile Baseline QA — Integration Report (engineering candidate)

Date 2026-11-18 · Repo `qavit/kakau-lab` · Branch `qa/projectile-baseline-20261118` · Base `main@58f244d` · **Head `77a30c6` + docs commit**
Status: **Draft candidate for Owner review. No merge, no deploy, no Product Gate / Release claim.**

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
`32a76fa` fix focus ring + viewport tests · `b714247` fix reduced-motion/series/export message · `77a30c6` fix staircase export · docs commit.
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
1. **Mobile/landscape layout** (Gate item ①): landscape canvas below fold & params scroll it away; phones keep canvas 235 px. *Recommend* a landscape short-height layout study using `round4-files` frames.
2. **Preset reachability** (3 steps on phones). *Recommend* promote presets to a one-tap entry.
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
`git revert 77a30c6 b714247 32a76fa fbe87e6` (each is independent; none touches physics, share codec, registry).
Dev note: `BASE_URL=http://localhost:3000` is needed on Node 26 (dev server binds IPv6).
