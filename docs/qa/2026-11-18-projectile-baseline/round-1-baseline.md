# Projectile QA — Round 1: Baseline / reproducibility

- Date: 2026-11-18 · Branch: `qa/projectile-baseline-20261118` (worktree `lab-projectile-qa`, local only)
- Base: `main` @ `58f244d90b9b57870772b67bd0ef8bd0611bc22f` (== `origin/main` at fetch time)
- Environment: macOS Darwin 25.6, Node v26.11.1, Playwright chromium; local dev server (not Production)
- Evidence location: this directory (`logs/` = raw command output; committed to repo)

## Repo / PR actual state
| Item | State |
|---|---|
| main HEAD | `58f244d` feat(projectile): Gate A layered scientific workspace |
| PR #48 export | MERGED 2026-11-16T01:03:23Z |
| PR #49 layered workspace | MERGED 2026-11-16T01:04:15Z |
| PR #46/#47/#50/#51 (Hydrogen) | CLOSED, unmerged (Hydrogen STOP respected; not touched) |
| Other worktrees (untouched) | `lab-integration` @ efb633f, `lab-projectile-export` @ b7b47ba |
| main checkout | clean, in sync with origin |

## Commands run this round (all at `58f244d`)
| Command | Result | Log |
|---|---|---|
| `npm ci` | exit 0 | logs/npm-ci.log |
| `npm run lint` | 0 errors, 2 pre-existing warnings (StandardAtmosphereLab `plot` useMemo) | logs/lint.log |
| `npm run build` | exit 0 | logs/build.log |
| `npm run test:unit` | 457 tests, 457 pass, 0 fail | logs/unit.log |
| `playwright test tests/e2e/projectile-` | 18 passed (desktop-chromium + mobile-chromium) | logs/e2e-projectile.log |

Historical evidence (NOT re-run, do not conflate): 11/15 "455 tests", four-viewport run on `b7b47ba`.
This round's 457 / 18 are fresh runs at `58f244d`.

## Environment finding (tooling, not product)
`playwright.config.ts` defaults `baseURL` to `http://127.0.0.1:3000`, but `vinext dev` under Node 26 listens on
`localhost` (IPv6 `::1`) only; `127.0.0.1` refuses. The built-in `webServer` therefore times out after 120 s.
Workaround used and reproducible: start `npm run dev`, then
`BASE_URL=http://localhost:3000 npx playwright test tests/e2e/projectile-`.
Config not changed (out of scope; recorded as P2 tooling defect).

## Corrections to the 11/18 Notion source-audit
- R03: `components/ProjectileLab.tsx:1637` already calls `requestFullscreen()` with an in-window fallback + notice
  (and `:1345` exits fullscreen). The audit said no evidence of the fallback; code exists. Behaviour still NOT end-to-end
  verified for the failure path (Round 5), so R03 stays PARTIAL/NOT VERIFIED, not FAIL.
- R06: confirmed `app/en/projectile` absent (only `app/en/{atmosphere-profile,notes}`); FAIL for the full contract stands.

## Initial R01–R12 table (Round 1; refined every round)
Status vocabulary: PASS only = whole current acceptance met. SHA = `58f244d` unless stated.
| ID | Status | Basis this round | Gap / next |
|---|---|---|---|
| R01 | PARTIAL | 18 E2E incl. layered workspace/disclosure at 4 viewports | no cross-module syntax QA; Round 4 |
| R02 | PARTIAL | E2E no overflow at 4 viewports; 11/15 found 360px canvas starts y≈356 | usability defect to measure R4 |
| R03 | NOT VERIFIED | fullscreen + fallback in code; focus/Escape E2E exists (projectile-usability) | failure path, separate resets: R5 |
| R04 | PARTIAL | state tests + bad/repeated share E2E | clean-browser round trip: R2 |
| R05 | PARTIAL | export tests + 4-viewport download E2E | real SVG inspection by eye: R2 |
| R06 | FAIL | no `/en/projectile` | OWNER REVIEW (full English route) |
| R07 | PARTIAL | learning tests + guided E2E | R3 |
| R08 | PARTIAL | comparison layers exist; no reference-pin | OWNER REVIEW (new UX) |
| R09 | PARTIAL | export carries assumptions; page-level sources unverified | R2/R5 |
| R10 | NOT VERIFIED | partial keyboard E2E; no AT, no 200% text | R5; no WCAG claim |
| R11 | NOT VERIFIED | no perf baseline | R5 |
| R12 | PARTIAL | layering/tests/CI traceable; Production smoke not run | R6 |
