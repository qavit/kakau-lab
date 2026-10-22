# Lewis Studio — CO₂ vertical slice (exploratory POC)

> **Status note (2026-10-23, docs-only):** This document is a dated development log. It was written while the work lived on an independent branch; PR #23 has since been **merged into `main`**, so phrases below such as "independent branch", "Draft PR #23", "Do not merge/deploy" and "the branch is behind `main`" describe the state at the time they were written. Current state: Lewis Studio is on `main` but **not deployed** (the route is `noindex`, has no catalog entry, and the page footer reads "awaiting teacher review"). Whether it is published is the Owner's decision after science and UX review; see [`ci-cd-v1-closeout.md`](ci-cd-v1-closeout.md).

This lives under **Kakau Lab** on an independent branch. It is **not** a new Chemistry platform, a published Lab, or a proven learning intervention. The product source of truth remains [the Notion Product & Scientific Spec v0.1](https://app.notion.com/p/3ff494eeb1178140b751fcffec5668bf).

## Purpose

Test whether a learner can change C–O bond orders and place lone pairs, explicitly submit a CO₂ Lewis construction, receive a specific chemically valid diagnostic, revise, then finish and retry without hints. No answer is automatically given before submission.

## Run

After installing the repo's normal dependencies: start the usual Kakau Lab development server, then open /chemistry/lewis. The page uses the existing Lab app and style tokens. The route is **noindex**, and no catalog registry record is added. Run focused regression with: node --test tests/lewis.test.mjs. Do not merge/deploy before Owner science + UX review.

## Deliberate constraints

- Fixed O–C–O connectivity. In v0.2 the bond and lone-pair tools operate directly on the SVG hit targets, with keyboard Enter/Space and Undo/Redo. The layout is still fixed; free atom placement is not implemented.
- Only the dominant zero-formal-charge CO₂ structure is a PASS. Minor formal-charge resonance contributors are diagnosed, not generalized.
- No odd-electron species, generalized element rules, VSEPR, hybridization, aromaticity, 3D, aqueous colors, full spaced-repetition engine, learner accounts, or tracking.
- A chemical graph determines correctness; SVG coordinates are only a rendering. A formal-charge policy is not a quantum chemical energy calculation.
- Retrieval is a local immediate reset into a blank CO₂ representation. True long-term spaced retention must be assessed later with students.

## Verification Gate

1. Run focused tests and the full existing test/build pipeline.
2. Manual mouse/keyboard and narrow-screen review: first attempt → diagnose → revise → PASS → free retry; no pass/revise dead end.
3. Owner checks hints, bilingual language switching, student-facing explanation, and science of examples.
4. Only then decide whether a new module deserves catalog metadata, other molecules, or connection to Ion Memory.

## Next narrow improvement if this passes

Introduce one genuinely blank canvas starting with a species formula + atom palette, still CO₂ only. Add graph-isomorphism and undo/redo tests before any broader molecule coverage. Broader molecular representations are downstream models, not hidden fields in the Lewis graph.

## v0.2 experimental update

- Choose Bond, Lone pair, or Erase. Click a bond region to cycle 0 → 1 → 2 → 3 → 0; click an atom to add a lone pair. Erase subtracts one bond order or lone pair.
- Undo/Redo stores learner diagrams in page-local memory only; any new edit clears redo. A passing submission locks editing until starting another blank attempt.
- Added `models/chemistry/lewis-editor.ts` and `tests/lewis-editor.test.mjs` for focused interaction semantics. Run both test files with `node --test tests/lewis*.test.mjs`, then build and manually inspect.
- **Not yet verified**: full build, end-to-end mouse/touch/keyboard, accessibility, responsive, and student learning evidence.
- FBD and Lab catalog remain unchanged; this remains Draft PR #23.

## v0.3 Electron Placement Model (unverified implementation)

- Drawing-side `PairPlacement` tracks top/bottom/outward electron-pair positions independently from the scientifically evaluated `LewisDiagram` pair count. No electron placement is a real molecular orbital coordinate.
- Oxygen only offers top/bottom/outward placement positions because the inward side is occupied by bonding. Carbon currently offers top/bottom. This is a constrained CO₂ grammar, not a universal valence-shell editor.
- Pair tool adds a pair at one explicit unoccupied location; Erase removes an occupied pair. SVG locations accept click and keyboard Enter/Space. Undo/Redo snapshots include both the graph and placement state.
- Added `tests/lewis-placement.test.mjs` to check reversible placement, exclusion of inward oxygen positions, chemically equivalent graphical positions, and accepted O=C=O construction.
- **Still required**: run all three suites (lewis, lewis-editor, lewis-placement), build, and Owner hands-on viewport/keyboard testing before calling v0.3 PASS. Keep Draft PR #23 and no catalog entry.
- **Known boundary**: v0.3 places electron *pairs*, not individually unpaired valence electrons; free skeleton and bond drawing by selecting two atoms remain future work.

## v0.3a–c scope completed in source (Owner QA pending)

- Atom click increases an atom's lone-pair count and automatically positions electron-pair marks. CO₂ oxygen layout uses a 120°-inspired top/bottom/outward convention; the left/right outer pair is vertically oriented (colon). This is a drawing heuristic, not a physical electron-position model.
- Bond-line and electron-dot representations are independently selectable without changing the chemical graph; one line = two bonding electrons, double = four, triple = six.
- Octet Inspect uses a per-atom selection and computes incident bond electron counts plus the selected atom's nonbonding electron count. Shared bonding electrons count around both respective atoms, but once in the molecule's overall valence budget.
- Existing CO₂ submission and deterministic chemistry evaluator remain unchanged. Inspector is formative representation feedback, not solution autofill.
- Added tests for atom-click auto layout and octet arithmetic. Owner must run `node --test tests/lewis*.test.mjs`, `npm run build` and browser QA; these checks have **not** been executed by this agent. No merge or release.
- Known limits: fixed O–C–O, pair placement only (not single-electron radicals), three oxygen placement sites, simplified layout not generalized VSEPR, no complete account or spaced practice system.

## Practice Mode usability revision (2026-10-21)

- After teacher screenshot review, CO2 oxygen lone pairs are drawn as **two diagonal pairs toward the outer side** (top-outward and bottom-outward) rather than adding extra dots on either side. This changes drawing layout only; correct CO2 still has precisely four nonbonding electrons per oxygen.
- Practice uses **primary click on atom = add lone pair; primary click on bond = increase bond order; secondary click = remove one**. Erase mode and Delete/Backspace are alternatives for touch/keyboard users. Electron-dot and bond-line views remain read-only projections of the same chemical graph.
- The octet inspector remains a separate non-editing mode, and Undo/Redo snapshots retain both graph and display placement.
- Teacher must verify visual pair orientation against the reference image, correct CO2 electron counts (16), click/secondary-click, keyboard and touch, Undo/Redo, switching representations, octet inspection, failed submit and PASS. This update is NOT yet build/browser certified.

## Geometry regression: CO₂ dot notation (2026-10-21)
- Shared electron pairs on a horizontal bond are **vertical colons**: single `:`; double two side-by-side colons, not horizontal `··`.
- Oxygen lone pairs use tangential placement around upper/lower outward-facing directions; each pair consists of exactly two dots. Pure geometry lives in `models/chemistry/lewis-layout.ts`, with `tests/lewis-layout.test.mjs` locking orientation and count.
- This is a drawing convention, not measured molecular electron geometry. Chemistry validator and other Labs unchanged.
- Source changed; run `node --test tests/lewis*.test.mjs`, `npm run build`, and visual compare with teacher reference before closing the gate. No merge or release until verified.

---

# Practice Mode multi-molecule MVP (2026-10-21)

Continues Draft PR #23 on the same branch. Gate separation: the **CO₂ POC gate (Owner-approved, limited UX gate)** is unchanged and its 23 tests still pass untouched; everything below is the **multi-molecule gate, pending Owner review**.

## What changed

| Area | File | Change |
|---|---|---|
| `SpeciesDefinition` + `TaskDefinition` data | `models/chemistry/lewis-species.ts` | Elements (H/C/N/O), valence electrons, duet/octet targets, reviewed skeletons for H₂O, CH₄, NH₃, H₂, HCN, CO₂, teaching order. |
| `LearnerGraph` + `ValidationProfile` | `models/chemistry/lewis.ts` | `evaluateLewis` replaces the CO₂-only checks (`evaluateCo2` kept as alias). Order: structure → missing bond → electron count (excess/deficit) → duet/octet → zero formal charge. The skeleton is matched by graph isomorphism (element + connectivity), so atom order, ids of identical H, and bond direction never decide correctness. New codes `duet`, plus `problemAtoms`/`targets` for diagnosis. |
| `LewisLayoutPolicy` | `models/chemistry/lewis-layout.ts` | Per-species 2D placement; `bondPairDots` puts each shared pair across the bond (horizontal → colon, vertical → `··`, diagonal → tilted); `lonePairAngles` centres lone pairs in the widest free arc, keeping clear of bonds. CO₂ oxygen output is identical to the accepted ±60° layout. Count-driven: it cannot add or drop an electron. |
| Diagnostics | `models/chemistry/lewis-feedback.ts` | Bilingual messages naming failing atoms and electron arithmetic; per-species hints. |
| Undo/Redo | `models/chemistry/lewis-history.ts` | Pure snapshot history (replaces ad-hoc arrays in the component). |
| UI | `components/chemistry/LewisStudio.tsx` | Species picker, per-species SVG, rotated bond hit areas, Next molecule / redraw after PASS, **Guided Practice** label. |
| Editor | `models/chemistry/lewis-editor.ts` | Lone pairs now cap at 4 (previously wrapped to 0); no-ops return the same object so they are not recorded in history. |

`lewis-placement.ts` (CO₂ v0.3 site grammar) is no longer used by the UI except `octetInspection` (now duet-aware); it is retained with its regression tests.

Layering respected: the chemistry modules import nothing from React/Three; `models/chemistry` imports only itself; `lib/*` untouched.

## Playable molecules

H₂O, CH₄, NH₃, H₂, HCN, CO₂ — all six end-to-end (start blank → build → commit → diagnose → revise → PASS → next / redraw). Skeleton is supplied (Guided Practice); learners do not choose the central atom or connectivity.

## Science Gate (automated, `tests/lewis-species.test.mjs`)

| Species | Valence e⁻ | Reference structure | Result |
|---|---|---|---|
| H₂O | 8 | H–O–H, O 2 LP | PASS; O=H diagnosed as `duet` naming H₁ |
| CH₄ | 8 | 4 C–H, no LP | PASS; extra LP / double C–H → `electron-excess` |
| NH₃ | 8 | 3 N–H, N 1 LP | PASS; no LP → deficit (6/8), 2 LP → excess |
| H₂ | 2 | H–H | PASS; double bond / LP → excess; none → missing bond |
| HCN | 10 | H–C≡N, N 1 LP | PASS; H–C=N with N 2 LP → `octet` (C has 6) |
| CO₂ | 16 | O=C=O, 2 LP per O | PASS (regression); 3 charged cases kept |

Also covered: shuffled atoms/bonds, swapped H ids, wrong skeleton/element/unknown species → `invalid-structure`, formal charges all zero and summing to the charge, duet-vs-octet targets in the inspector, bond-pair dot orientation for every bond and order, lone-pair count/spacing/clearance for 0–4 pairs on every atom, history undo/redo re-validation.

## Verification record

- `node --test tests/lewis*.test.mjs`: 90 pass, 0 fail (23 original CO₂ tests included).
- `npm run build`: succeeded. `npm run lint`: 0 errors (2 pre-existing warnings in `StandardAtmosphereLab.tsx`).
- Browser (Vite dev server from this worktree, in-app browser): H₂O end-to-end by real mouse clicks (empty submit → partial → PASS in dot mode); the other five solved and PASSed through DOM click events; wrong submissions checked for H₂ (excess), H₂O O=H (duet), HCN C=N (octet); Undo/Redo, erase mode, Enter/Delete/right-click on SVG targets; 375 px viewport with no horizontal scroll; line and dot modes; screenshots of NH₃, CH₄, CO₂, H₂O checked by eye.
- **Not done:** real touch device, screen-reader pass, Safari/Firefox, Playwright e2e for Lewis. (The whole unit suite, `node --test tests/*.test.mjs`, passed 351/351 after the build.)

## Open issues / honest limits

1. Lone pairs sit at a fixed 57 px radius for all atoms; around H₂O's oxygen they read slightly detached from the atom circle (same as the accepted CO₂ look).
2. Wrong states with many pairs (e.g. 3 lone pairs on H) are drawn fully inside the view and spread over the free arcs (a second pair on a linear atom goes to the opposite side), but pairs inside one crowded arc keep only a 22° minimum spacing.
3. Hints are generic arithmetic scaffolds, not misconception-specific; only the three-step ladder exists.
4. Switching molecules discards in-progress work without confirmation.
5. Octet inspector only; no per-electron (radical) model, resonance, ions or hypervalent species, as scoped out.
6. `?species=` deep links and a catalog entry are intentionally absent; the route stays `noindex`.
7. The branch is behind `main` (PR #24 landed); not synced, to avoid mixing the merge into this review.

## Suggested next Gate

Owner hands-on review of the six tasks (desktop + phone), specifically: H₂O / NH₃ lone-pair look, CH₄ vertical-bond `··`, HCN triple colons. If accepted: sync with `main`, add a Playwright smoke test for the route, then consider a blank-canvas (learner-chosen skeleton) Discovery Mode as a separate gate.
