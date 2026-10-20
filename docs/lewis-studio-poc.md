# Lewis Studio — CO₂ vertical slice (exploratory POC)

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
