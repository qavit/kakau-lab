import assert from "node:assert/strict";
import test from "node:test";
import { phaseConditionLevels } from "../lib/science/interference.ts";
import { geometryForCondition } from "../models/interference-geometry.ts";

test("renderer condition geometry preserves central, hyperbola and degenerate ray cases", () => {
  const params = { wavelength: 1, separation: 3, phase1: 0, phase2: 0 };
  const bounds = { xMin: -4, xMax: 4, yMin: -4, yMax: 4 };
  const levels = phaseConditionLevels(params, "constructive");
  const central = levels.find((level) => level.central);
  const edge = levels.find((level) => level.degenerate);
  const offAxis = levels.find((level) => !level.central && !level.degenerate);
  assert.equal(geometryForCondition(central, 3, bounds).type, "central");
  assert.equal(geometryForCondition(edge, 3, bounds).type, "ray");
  const curve = geometryForCondition(offAxis, 3, bounds);
  assert.equal(curve.type, "hyperbola");
  assert.ok(curve.points.length > 2);
  assert.ok(curve.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
});
