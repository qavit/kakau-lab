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

