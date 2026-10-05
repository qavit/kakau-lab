import assert from "node:assert/strict";
import test from "node:test";
import { renderToSVG } from "@graphite/render-svg";
import { FBD_ANCHOR, applyGraphiteIntentToFbd, fbdToDiagramSpec } from "../components/fbd/graphiteAdapter.ts";
import { addFbdAgent, addFbdForce, addFbdInteraction, createFbdForce, initialFbdState } from "../models/fbd.ts";
import { TABLE_REFERENCE, compareTableDiagram } from "../models/fbd-table.ts";

function stateWithForce(direction = { x: 1, y: 0 }, magnitudeN = 4) {
  let s = initialFbdState();
  s = addFbdAgent(s, { id: "hand", label: "手" });
  s = addFbdInteraction(s, { id: "hand-block", kind: "applied", sourceAgentId: "hand", targetSystemId: s.diagram.system.id, label: "手 ↔ 木塊" });
  return addFbdForce(s, createFbdForce({ id: "f1", interactionId: "hand-block", kind: "applied", label: "手的拉力", magnitudeN, direction }));
}
const drag = (state, x, y, lengths) => applyGraphiteIntentToFbd(state, { type: "element/endpoint", elementId: "f1", endpoint: "end", point: { x, y } }, lengths);

test("adapter maps FBD state to a DiagramSpec with fixed anchor and display length", () => {
  const spec = fbdToDiagramSpec(stateWithForce({ x: 0, y: 1 }), { f1: 50 });
  const f = spec.elements.find((e) => e.id === "f1");
  assert.deepEqual(f.start, FBD_ANCHOR);
  assert.deepEqual(f.end, { x: 180, y: 90 });
  assert.match(renderToSVG(spec), /data-element-id="f1"/);
});

test("tip drag changes direction only, normalized in physics coordinates (y up)", () => {
  const before = stateWithForce();
  const after = drag(before, 180 + 30, 140 - 40); // up-right, 3-4-5
  const [force] = after.diagram.forces;
  assert.ok(Math.abs(force.direction.x - 0.6) < 1e-12 && Math.abs(force.direction.y - 0.8) < 1e-12);
  assert.equal(force.magnitudeN, 4);
  assert.equal(force.id, "f1");
  assert.equal(force.interactionId, "hand-block");
  assert.equal(force.kind, "applied");
  assert.equal(force.label, "手的拉力");
  assert.deepEqual(after.diagram.interactions, before.diagram.interactions);
  assert.deepEqual(after.diagram.agents, before.diagram.agents);
});

test("drag distance does not change the displayed length", () => {
  const after = drag(stateWithForce(), 180 + 3000, 140, { f1: 80 });
  const f = fbdToDiagramSpec(after, { f1: 80 }).elements.find((e) => e.id === "f1");
  assert.ok(Math.abs(Math.hypot(f.end.x - 180, f.end.y - 140) - 80) < 1e-9);
});

test("zero-length, non-finite and unknown-id drags are no-ops", () => {
  const s = stateWithForce();
  assert.equal(drag(s, FBD_ANCHOR.x, FBD_ANCHOR.y), s);
  assert.equal(drag(s, NaN, 3), s);
  assert.equal(drag(s, Infinity, 3), s);
  assert.equal(applyGraphiteIntentToFbd(s, { type: "element/endpoint", elementId: "ghost", endpoint: "end", point: { x: 1, y: 1 } }), s);
});

test("repeated drags are stable and the input state is never mutated", () => {
  const s0 = stateWithForce();
  const snapshot = JSON.stringify(s0);
  let s = s0;
  for (const [x, y] of [[300, 140], [180, 20], [20, 140], [180, 260], [300, 140]]) s = drag(s, x, y);
  assert.equal(JSON.stringify(s0), snapshot);
  assert.deepEqual(s.diagram.forces[0].direction, { x: 1, y: 0 });
  assert.equal(s.diagram.forces[0].magnitudeN, 4);
});

test("reference model is isolated from learner edits", () => {
  const refBefore = JSON.stringify(TABLE_REFERENCE);
  const s = drag(stateWithForce(), 20, 140);
  compareTableDiagram(s.diagram);
  assert.equal(JSON.stringify(TABLE_REFERENCE), refBefore);
});
