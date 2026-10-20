# Lewis Studio — CO₂ vertical slice (exploratory POC)

This lives under **Kakau Lab** on an independent branch. It is **not** a new Chemistry platform, a published Lab, or a proven learning intervention. The product source of truth remains [the Notion Product & Scientific Spec v0.1](https://app.notion.com/p/3ff494eeb1178140b751fcffec5668bf).

## Purpose

Test whether a learner can change C–O bond orders and place lone pairs, explicitly submit a CO₂ Lewis construction, receive a specific chemically valid diagnostic, revise, then finish and retry without hints. No answer is automatically given before submission.

## Run

After installing the repo's normal dependencies: start the usual Kakau Lab development server, then open /chemistry/lewis. The page uses the existing Lab app and style tokens. The route is **noindex**, and no catalog registry record is added. Run focused regression with: node --test tests/lewis.test.mjs. Do not merge/deploy before Owner science + UX review.

## Deliberate constraints

- Fixed O–C–O connectivity; bond order (0–3) and lone pairs (0–4) are learner-controlled, not freely draggable atoms yet.
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
