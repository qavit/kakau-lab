# CI/CD v1 closeout

## Result
CI/CD v1 infrastructure is complete: automatic CI plus a manual-only deploy workflow.

## Evidence
- PR #25, merge commit `5593b9d`.
- CI on `main` after the merge passed (lint, `npm test` including build).
- Both workflows are registered in GitHub Actions (`CI`, `Deploy`).

## Decision
- CI runs automatically on every PR and on push to `main`.
- Production CD runs only through `workflow_dispatch`; merging never deploys. Publishing stays the Owner's decision, because passing tests is not scientific or teaching acceptance.

## Reusable assets
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- README "CI/CD（GitHub Actions）" section (operation, failure handling, rollback).

## First-deploy readiness
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` were created by the Owner as repository secrets. They have not yet been verified by a real deploy.
- No other infrastructure is needed now.
- The first production deploy requires separate Owner authorization.

## Follow-up
1. First production deploy acceptance: run Deploy from `main`, read the full log, confirm the recorded SHA, the smoke test, and the live version (`npx wrangler deployments status`).
2. Lewis Studio science and UX acceptance. The first deploy ships everything on `main`, including Lewis Studio (noindex, not in the catalog) and its "awaiting teacher review" footer.

## Known limits
The stale-commit guard only detects `main` moving during a run, and the smoke test only checks HTTP 200 for `/`, `/projectile` and `/electrostatics`. See the README.

## Repository governance closeout (2026-10-23, PRs #26 and #27)
- **Result:** The repo stays Public with All Rights Reserved and no open-source `LICENSE`. README is the public entry; deployment detail lives in `docs/deployment.md`; `COPYRIGHT.md` carries the copyright notice (`Sin-iu Ho`, confirmed by the Owner) and third-party/asset status. MathJax's license text and a notice are now served beside the bundle. Private Notion links and upload IDs were removed from current files (git history unchanged).
- **Evidence:** CI passed on both PRs; lint 0 errors, 371/371 unit tests and build passed; no Deploy run was triggered.
- **Decision:** Public source / All rights reserved; code copyright held personally by the Owner; unconfirmed asset rights stay marked as unconfirmed.
- **Reusable assets:** `COPYRIGHT.md`, `docs/deployment.md`, the MathJax license test in `tests/deploy-config.test.mjs`.
- **Follow-up (normal maintenance):** ownership of logo, OG image and preview screenshots; unreferenced starter icons in `public/`; whether `sharp`'s LGPL binaries reach the Worker bundle; contribution policy; verify `/mathjax/LICENSE` after the next real deploy; leftover `.openai/`, `app/chatgpt-auth.ts`, `examples/d1/`, `db/`.


## C2 catalog release closeout (2026-11-01, PRs #32 and #33)
- **Result:** Lab A1 C2 (PR #32) and the Blue–Teal interactive colours plus the appearance menu (PR #33) are live at https://lab.kakau.tw/. Production runs Worker version `5980a66b-81cf-415e-b348-a006a3c61bf6` at 100% traffic, uploaded by Deploy run [41352931936](https://github.com/qavit/kakau-lab/actions/runs/41352931936) for `main` at `3ac47c794161897ac12fd47de8ce79a995e90d62` (main CI 41351827560 passed).
- **Deploy step red, release live:** the run's lint, tests, freshness check and smoke test passed, but "Deploy to Cloudflare" exited 1 with the known post-upload errors (`/workers/subdomain` code 10000, `/memberships` code 9106). The Worker had already uploaded ("Uploaded kakau-lab") and `npx wrangler deployments status` shows the new version at 100%. Version metadata carries no commit, so the link to `3ac47c7` rests on the run's recorded `DEPLOY_SHA`, the upload time (21:39 UTC) and the live HTML containing the new `theme-menu__trigger`. The token still needs the account-level permissions those two endpoints require; no token or secret was changed, and the deploy was not re-run.
- **Production smoke test (read-only, Chromium):** the catalog opens the single-icon appearance menu. Enter, Space and Escape work and focus stays on the trigger. Light, Dark and System switch (`data-mode` set or removed, page background follows). The list stays inside the viewport at 1440 and 390 px, options are 44 px tall, and there is no horizontal overflow. `/solar`, `/atmosphere-profile`, `/projectile`, `/interference` and `/electrostatics` return 200 with their headings, no page errors, and no catalog styles. The catalog lists 5 cards.
- **Not checked:** screen readers, non-Chromium browsers, and the full E2E suite (167 tests, 5 fail identically on `main`: `electrostatic-gate4b`, `electrostatic-gate5`, `interference-c4`, intermittently `fbd-support-removal` and `solar-layers`).
- **Cleanup:** merged branches `feat/c2-lab-catalog-a1` and `feat/c2-lab-interactive-colors` were deleted locally and on origin after confirming their trees equal the squash commits. Two scratch worktrees were removed. Kept: `pr32` branch and `kakau-lab-pr32` worktree (not named in the cleanup scope, may belong to another agent), `kakau-lab-main`, `kakau-lab-lewis` / `codex/lewis-studio-poc-20261020`, and `feat/hydrogen-bohr-lab`.
- **Cross-site C2 release gate:** no such document exists in this repository, so none was updated here. Lab's gate result is the section above; the Front and Notes gate must be updated where it lives.
- **Follow-up:** fix the Cloudflare token permissions behind 10000/9106 so the deploy step can go green; triage the five E2E failures; model-page controls (30×28 px switcher, `--muted` 3.58:1, gold theory focus ring) remain out of C2 scope.

## Deploy step fix closeout (2026-11-04, PRs #43, #44 and #45)
- **Result:** The post-upload 403 (`/workers/subdomain` code 10000) no longer fails the Deploy workflow. Wrangler was upgraded from `4.92.0` to `4.156.2` (PR #45, main `0277a07e27d69cae1b99d30183ce6021827adfc9`), which reads the subdomain URL from Worker-scoped metadata instead of the account-level endpoint. The Worker-scoped token was not widened; no token, secret, DNS or route was changed.
- **Evidence:** the read-only probes (PRs #43 and #44) showed Worker settings and Worker-scoped metadata returning 200 (subdomain URL present) while `/workers/subdomain` returned 403/10000 and `/memberships` 400/9106. Deploy run [41765965324](https://github.com/qavit/kakau-lab/actions/runs/41765965324) for `main` at `0277a07` passed end to end (lint, `npm test`, freshness check, "Deploy to Cloudflare", smoke test); the deploy step log has no 403 or 10000. Main CI 41764774783 had passed.
- **Production versions:** active before the run `3e1bcd75-fa5e-44fc-94d3-081904db9579`; after the run `ce69c70c-98fc-4720-b1c7-36ace994272b` at 100% traffic (created 03:16 UTC, matching the deploy step). Rollback target is `3e1bcd75`, then `5980a66b`. As before, version metadata carries no commit, so the link to `0277a07` rests on the run's recorded `DEPLOY_SHA` and the upload time.
- **Smoke test:** the workflow's check and a separate read-only check returned 200 for `/`, `/projectile`, `/electrostatics` and `/interference` on https://lab.kakau.tw/.
- **Superseded:** the 2026-11-01 follow-up to fix token permissions behind 10000/9106 is closed by the Wrangler upgrade, not by a permissions change.
- **Residual risk:** `@cloudflare/vite-plugin@1.37.1` pins `wrangler@4.92.0`, so a nested old copy remains beside the top-level `4.156.2`; the new Wrangler pulls a beta miniflare. Both worked in build and deploy, but treat the next Wrangler or vinext bump as a compatibility check.
- **Cleanup:** merged branches `fix/lab-wrangler-scoped-token-compat`, `chore/cloudflare-token-readonly-probe`, `chore/probe-worker-scoped-subdomain-url` and `feat/hydrogen-bohr-lab` were deleted locally and on origin. Kept: `codex/lewis-studio-poc-20261020` (in use by the `kakau-lab-lewis` worktree) and `kakau-lab-main`.
