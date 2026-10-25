import test from "node:test";
import assert from "node:assert/strict";
import {
  accelerationFromForce,
  directionFromDegrees,
  forceComponents,
  normalize,
  resolveKnownForces,
  vectorMagnitude,
} from "../lib/science/fbd.ts";

const closeTo = (actual, expected, tolerance = 1e-10) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

test("normalize returns unit vectors and rejects zero or non-finite input", () => {
  const unit = normalize({ x: 3, y: 4 });
  closeTo(unit.x, 0.6);
  closeTo(unit.y, 0.8);
  closeTo(vectorMagnitude(unit), 1);
  assert.equal(normalize({ x: 0, y: 0 }), null);
  assert.equal(normalize({ x: Number.NaN, y: 1 }), null);
  assert.equal(normalize({ x: Number.POSITIVE_INFINITY, y: 0 }), null);
});

test("directionFromDegrees is counter-clockwise from +x", () => {
  const up = directionFromDegrees(90);
  closeTo(up.x, 0);
  closeTo(up.y, 1);
  const left = directionFromDegrees(180);
  closeTo(left.x, -1);
  closeTo(left.y, 0);
});

test("forceComponents scales the normalized direction and ignores direction length", () => {
  const components = forceComponents({ magnitudeN: 10, direction: { x: 0, y: -5 } });
  closeTo(components.x, 0);
  closeTo(components.y, -10);
});

test("forceComponents rejects unknown, negative, non-finite magnitudes and zero direction", () => {
  const direction = { x: 1, y: 0 };
  assert.equal(forceComponents({ magnitudeN: null, direction }), null);
  assert.equal(forceComponents({ magnitudeN: -1, direction }), null);
  assert.equal(forceComponents({ magnitudeN: Number.NaN, direction }), null);
  assert.equal(forceComponents({ magnitudeN: Number.POSITIVE_INFINITY, direction }), null);
  assert.equal(forceComponents({ magnitudeN: 5, direction: { x: 0, y: 0 } }), null);
});

test("resolveKnownForces counts invalid magnitudes as unknown instead of poisoning the sum", () => {
  const resolution = resolveKnownForces([
    { magnitudeN: 3, direction: { x: 1, y: 0 } },
    { magnitudeN: Number.NaN, direction: { x: 0, y: 1 } },
  ]);
  assert.equal(resolution.knownCount, 1);
  assert.equal(resolution.unknownCount, 1);
  assert.equal(resolution.isComplete, false);
  assert.deepEqual(resolution.knownResultantN, { x: 3, y: 0 });
});

test("resolveKnownForces of no forces is a complete zero resultant", () => {
  const resolution = resolveKnownForces([]);
  assert.equal(resolution.isComplete, true);
  assert.deepEqual(resolution.knownResultantN, { x: 0, y: 0 });
});

test("accelerationFromForce requires a positive finite mass", () => {
  assert.deepEqual(accelerationFromForce({ x: 6, y: -3 }, 3), { x: 2, y: -1 });
  for (const mass of [null, 0, -2, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(accelerationFromForce({ x: 1, y: 1 }, mass), null);
  }
});
