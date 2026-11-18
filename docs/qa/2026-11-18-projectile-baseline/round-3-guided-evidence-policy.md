# Projectile QA — Round 3: Guided / evidence policy

- Base `58f244d`; no product code changed this round (no defect found). Tests only.
- Specs: `tests/e2e/projectile-qa-guided.spec.ts` (13 E2E PASS, desktop-chromium, local dev server),
  plus 2 model-level tests appended to `tests/projectile-qa-regression.test.mjs` (12 PASS). Log: `logs/r3-e2e-guided.log`.

| Scenario | Evidence | Result |
|---|---|---|
| Predict phase, 3 activities × {1366×768, 390×844}: **user-reachable** text has no result/readout tokens (vₓ, vᵧ, 最遠射程, θ*, 向下加速度, 30°/60° 射程, decimal metres, comparison label) | guided spec leak scan; scan excludes `inert`/`aria-hidden`/non-rendered nodes | PASS (6) |
| Same scan after gate DOES find tokens (detector sanity) | apex flow test | PASS |
| Time slider disabled, readout says 「將在送出預測後顯示」, 圖層 button absent, 分享/匯出 absent, 模型資訊 + 理論與計算 disabled | guided spec | PASS |
| Activity 1 gated: no v_x/v_y comparison until cursor near apex; then reveals; explain → complete | guided spec | PASS |
| Activity 2: no table before prediction; playback then table; explain → complete | guided spec | PASS |
| Activity 3: result withheld until h≈25 m; then reveals; explain → complete | guided spec | PASS |
| Restart clears prediction and re-locks slider; leave mid-task → alertdialog, focus on 繼續任務, Escape keeps progress, 離開任務 restores free mode | guided spec | PASS |
| Keyboard: choose prediction via focus+Enter | guided spec | PASS (only prediction step) |
| After a completed task, share URL and exported JSON contain no prediction/explanation/choice ids/"student" | guided spec | PASS |
| Task state not persisted (local/sessionStorage empty of answers; reload → free mode) | guided spec | PASS |
| Export blocked by UI **and** model for every phase (`projectileResult` throws) | existing `projectile-export.test.mjs` + policy table test | PASS |
| `projectileEvidencePolicy` truth table over 3 activities × 5 phases; session has no identity fields; activities hold no answer key | regression tests | PASS |

## Observations (not defects)
- Predict-phase facts exist in the DOM under `display:none` (`.projectile-side`) and in an off-canvas drawer that is
  `inert` + `aria-hidden`. They are unreachable by users, keyboard and AT, but **are present in the client bundle / DevTools**.
  Anti-leak here is UX-level, not a cryptographic guarantee. Not a contract violation (R07 speaks of reveal rules).
- The earlier scan false-positives (question text "20 m/s", choice labels) confirm the scan must stay token-based.

## Gaps (carry to Matrix)
- Full-keyboard completion of every phase (slider adjust, explanation choice) not tested; R10 stays NOT VERIFIED.
- "Wrong answer" has no corrective branch by design (prediction vs model comparison); retry = 重新開始此任務. Student-facing
  learning effectiveness: NOT CHECKED (no students) — Owner/Student gate, not engineering.
- Mobile project (Pixel 5) guided flow beyond the leak scan at 390×844 not run.
