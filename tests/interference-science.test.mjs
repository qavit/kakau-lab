import assert from "node:assert/strict";
import test from "node:test";

import {
  fieldAtPoint,
  instantaneousDisplacement,
  pathDifferenceAtPoint,
  phaseConditionLevels,
  phaseDifferenceAtPoint,
  sampleSelectedPoint,
  sourcePositions,
  textbookLineCounts,
} from "../lib/science/interference.ts";

const TOLERANCE = 1e-9;
const parameters = (overrides = {}) => ({
  wavelength: 1,
  separation: 3,
  amplitude1: 1,
  amplitude2: 1,
  phase1: 0,
  phase2: 0,
  attenuation: false,
  ...overrides,
});

test("equal in-phase sources add to amplitude 2 at the central point", () => {
  const field = fieldAtPoint({ x: 0, y: 0 }, parameters());
  assert.ok(Math.abs(field.amplitude - 2) <= TOLERANCE);
  assert.ok(Math.abs(field.intensity - 4) <= TOLERANCE);
});

test("source geometry is centered and the signed path difference is r2 - r1", () => {
  assert.deepEqual(sourcePositions(3), {
    source1: { x: -1.5, y: 0 },
    source2: { x: 1.5, y: 0 },
  });
  assert.equal(pathDifferenceAtPoint({ x: 0, y: 0 }, 3), 0);
  assert.ok(Math.abs(phaseDifferenceAtPoint({ x: 0, y: 0 }, parameters())) <= TOLERANCE);
});

test("opposite phase sources cancel at equal distance at the central point", () => {
  const field = fieldAtPoint({ x: 0, y: 0 }, parameters({ phase2: Math.PI }));
  assert.ok(field.amplitude <= TOLERANCE);
  const levels = phaseConditionLevels(parameters({ phase2: Math.PI }), "destructive");
  assert.equal(levels.filter((level) => level.central).length, 1);
});

test("d = 3λ has seven constructive and six destructive conditions, including degenerate boundaries", () => {
  assert.deepEqual(textbookLineCounts(3, 1), { antinodes: 7, nodes: 6 });
  const constructive = phaseConditionLevels(parameters(), "constructive");
  assert.equal(constructive.length, 7);
  assert.equal(constructive.filter((level) => level.degenerate).length, 2);
  assert.deepEqual(constructive.filter((level) => level.degenerate).map((level) => level.signedPathDifference), [-3, 3]);
  assert.equal(phaseConditionLevels(parameters(), "destructive").length, 6);
});

test("integer and half-integer separation boundaries preserve source line-count behavior", () => {
  assert.deepEqual(textbookLineCounts(2.499999, 1), { antinodes: 5, nodes: 4 });
  assert.deepEqual(textbookLineCounts(2.5, 1), { antinodes: 5, nodes: 6 });
  assert.deepEqual(textbookLineCounts(3 - 1e-6, 1), { antinodes: 5, nodes: 6 });
  assert.deepEqual(textbookLineCounts(3, 1), { antinodes: 7, nodes: 6 });
});

test("unequal anti-phase amplitudes leave their amplitude difference at the center", () => {
  const field = fieldAtPoint({ x: 0, y: 0 }, parameters({ amplitude2: 0.5, phase2: Math.PI }));
  assert.ok(Math.abs(field.amplitude - 0.5) <= TOLERANCE);
  assert.ok(Math.abs(field.intensity - 0.25) <= TOLERANCE);
});

test("distance attenuation keeps the phase condition distinct from zero resultant amplitude", () => {
  const point = { x: -0.25, y: 0 };
  const sample = sampleSelectedPoint(point, parameters({ attenuation: true }), false);
  assert.ok(Math.abs(sample.pathDifference - 0.5) <= TOLERANCE);
  assert.ok(Math.abs(sample.phaseDifference - Math.PI) <= TOLERANCE);
  assert.ok(Math.abs(sample.amplitude - 0.13849824498146146) <= TOLERANCE);
  assert.ok(sample.amplitude > 0);
});

test("instantaneous displacement changes with time phase while the spatial field stays fixed", () => {
  const field = fieldAtPoint({ x: 0, y: 0 }, parameters());
  assert.ok(Math.abs(instantaneousDisplacement(field, 0) + 2) <= TOLERANCE);
  assert.ok(Math.abs(instantaneousDisplacement(field, Math.PI / 2)) <= TOLERANCE);
  assert.ok(Math.abs(instantaneousDisplacement(field, Math.PI) - 2) <= TOLERANCE);
  assert.equal(field.amplitude, 2);
});

test("positive physical scales reject zero, negative, NaN, and infinite values", () => {
  for (const invalid of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => sourcePositions(invalid), RangeError);
    assert.throws(() => fieldAtPoint({ x: 0, y: 0 }, parameters({ wavelength: invalid })), RangeError);
    assert.throws(() => textbookLineCounts(invalid, 1), RangeError);
    assert.throws(() => textbookLineCounts(1, invalid), RangeError);
  }
});

test("non-finite amplitudes preserve the source model's NaN propagation behavior", () => {
  const field = fieldAtPoint({ x: 0, y: 0 }, parameters({ amplitude1: Number.NaN }));
  assert.ok(Number.isNaN(field.real));
  assert.ok(Number.isNaN(field.imaginary));
  assert.ok(Number.isNaN(field.amplitude));
  assert.ok(Number.isNaN(field.intensity));
  assert.ok(Number.isNaN(field.phase));
});

test("legal parameter endpoints and source singularities produce finite field values", () => {
  for (const wavelength of [0.5, 1.5]) {
    for (const separation of [0.75, 4]) {
      for (const attenuation of [false, true]) {
        const state = parameters({ wavelength, separation, attenuation });
        for (const point of [{ x: 0, y: 0 }, { x: -separation / 2, y: 0 }, { x: 4, y: 4 }]) {
          assert.ok(Object.values(fieldAtPoint(point, state)).every(Number.isFinite));
        }
      }
    }
  }
});
