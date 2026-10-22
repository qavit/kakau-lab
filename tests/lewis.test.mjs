import test from "node:test";
import assert from "node:assert/strict";
import { initialCo2, setBondOrder, setLonePairs, evaluateCo2 } from "../models/chemistry/lewis.ts";

function build(leftOrder = 2, rightOrder = 2, leftPairs = 2, carbonPairs = 0, rightPairs = 2) {
  let diagram = initialCo2();
  diagram = setBondOrder(diagram, "o-left", "c", leftOrder);
  diagram = setBondOrder(diagram, "c", "o-right", rightOrder);
  diagram = setLonePairs(diagram, "o-left", leftPairs);
  diagram = setLonePairs(diagram, "c", carbonPairs);
  return setLonePairs(diagram, "o-right", rightPairs);
}
const code = (diagram) => evaluateCo2(diagram).code;

test("zero-formal-charge O=C=O passes with 16 electrons and full octets", () => {
  const result = evaluateCo2(build());
  assert.equal(result.pass, true);
  assert.equal(result.usedElectrons, 16);
  assert.deepEqual(Object.values(result.shells).sort(), [8, 8, 8]);
  assert.deepEqual(Object.values(result.formalCharges).sort(), [0, 0, 0]);
});
test("missing bond diagnosed before incomplete electron allocation", () =>
  assert.equal(code(initialCo2()), "missing-bond"));
test("unfinished total electron allocation is diagnosed", () =>
  assert.equal(code(build(2, 2, 1, 0, 2)), "electron-deficit"));
test("excess electrons diagnosed without silently dropping them", () =>
  assert.equal(code(build(2, 2, 3, 0, 2)), "electron-excess"));
test("correct electron total but carbon fails octet", () =>
  assert.equal(code(build(1, 1, 3, 0, 3)), "octet"));
test("charged minor Lewis contributor is recognized but not accepted as dominant CO2", () =>
  assert.equal(code(build(3, 1, 1, 0, 3)), "formal-charge"));
test("swapping identical oxygen atom identities or reversing bond endpoints does not change result", () => {
  const d = build();
  const swapped = { ...d, atoms: [d.atoms[2], d.atoms[1], d.atoms[0]],
    bonds: d.bonds.map((b) => ({ a: b.b, b: b.a, order: b.order })) };
  assert.equal(code(swapped), "pass");
});
test("out-of-range inputs are ignored, not allowed into learner state", () => {
  const d = initialCo2();
  assert.equal(setBondOrder(d, "c", "o-left", 4), d);
  assert.equal(setLonePairs(d, "c", -1), d);
  assert.equal(setBondOrder(d, "nonexistent", "c", 2), d);
});
test("structurally invalid graphs are rejected", () => {
  const d = build();
  assert.equal(code({ ...d, atoms: d.atoms.slice(1) }), "invalid-structure");
  assert.equal(code({ ...d, bonds: [d.bonds[0], d.bonds[0]] }), "invalid-structure");
});
