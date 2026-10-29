import assert from "node:assert/strict";
import test from "node:test";

import { centralConditionKind, checkLineCountAnswer, constructiveOrderShape } from "../models/interference-activities.ts";

const params = (overrides = {}) => ({ wavelength: 1, separation: 3, phase1: 0, phase2: 0, ...overrides });

test("line-count prediction includes central and degenerate boundary lines", () => {
  assert.deepEqual(checkLineCountAnswer({ antinodes: 7, nodes: 6 }, 3, 1, 1), {
    correct: true, antinodesCorrect: true, nodesCorrect: true, hint: "none", expected: { antinodes: 7, nodes: 6 },
  });
});

test("line-count hints escalate without changing the expected science", () => {
  assert.equal(checkLineCountAnswer({ antinodes: 6, nodes: 6 }, 3, 1, 1).hint, "central");
  assert.equal(checkLineCountAnswer({ antinodes: 7, nodes: 5 }, 3, 1, 1).hint, "nodes-no-central");
  assert.equal(checkLineCountAnswer({ antinodes: 6, nodes: 5 }, 3, 1, 2).hint, "outer-rays");
  assert.equal(checkLineCountAnswer({ antinodes: 6, nodes: 5 }, 3, 1, 3).hint, "reveal");
});

test("central phase condition swaps from constructive to destructive at π", () => {
  assert.equal(centralConditionKind(params()), "constructive");
  assert.equal(centralConditionKind(params({ phase2: Math.PI })), "destructive");
});

test("the third constructive order vanishes, degenerates, then becomes a hyperbola", () => {
  assert.equal(constructiveOrderShape(params({ separation: 2.9 }), 3), "absent");
  assert.equal(constructiveOrderShape(params(), 3), "degenerate");
  assert.equal(constructiveOrderShape(params({ separation: 3.1 }), 3), "hyperbola");
});
