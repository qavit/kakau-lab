# Projectile trajectory result export

The free exploration toolbar exports a standalone bilingual SVG teaching figure
or JSON result. Both are computed from one setup/cursor snapshot using the same
model as the UI. Export is unavailable throughout Guided mode, and the model
export function independently rejects any guided session. Learner responses and
identity are never serialized.

`projectile-result-1` and model identity `projectile-vacuum-rk4-1` are independent
of the unchanged launch-setup share JSON v1. The result includes SI units,
physical assumptions, effective launch height, cursor and clock time, vacuum
samples, and enabled complementary/drag comparisons. SVG embeds the same data
in XML-escaped metadata. It uses equal coordinate scales and distinguishable
line patterns. Layers and share setup are retained as provenance; trajectories
are complete regardless of display visibility. Envelope fans and viewport zoom
are explicitly excluded. The export is a bilingual result, not a claim that the
entire Projectile UI has an English route.

The vacuum path remains primary even with drag enabled. Staircase coordinates
start at the top step, with positive y upward; the normal height parameter is
ignored. Drag uses the existing RK4 integrator at 0.002 s and its 120 s limit;
results ending above the ground are marked `time-cap`, not a landing.

Reproduction: parse `setup` with the existing `decodeProjectileShare`, then use
`deriveProjectileModel` and `deriveCursor` with `cursorFraction`. Share v1 opens
paused at its launch setup; it does not restore the result's cursor by itself.
Keep the model version with the result: it is not a promise of reproduction
across future science-model changes.

Validation:

- `npm run lint` and `npm test` (build + unit tests).
- `BASE_URL=http://localhost:3107 npx playwright test tests/e2e/projectile-export.spec.ts --project desktop-chromium`
  against a local `npm run dev -- --port 3107` server.
- Four viewport cases: 1366×768, 1280×720, 390×844, 360×800. Tests download and
  read both files, enter/leave Guided, and check horizontal overflow.
- Open the actual SVG in a browser to inspect labels, legend and clipping;
  inspect the JSON units/setup, not just download success.

This is a draft capability. Product palette selection, full English UI,
reference-result pinning, and the complete cross-module release contract remain
separate acceptance work.
