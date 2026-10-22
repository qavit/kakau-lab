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
