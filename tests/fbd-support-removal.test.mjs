import test from "node:test";
import assert from "node:assert/strict";
import { directionFromDegrees } from "../lib/science/fbd.ts";
import { addFbdForce, addFbdInteraction, createFbdForce, removeFbdForce } from "../models/fbd.ts";
import {
  RELEASED_TABLE_REFERENCE, TABLE_REFERENCE, commitTable, compareTable, compareTableDiagram,
  compareTableSubmission, initialTableLearning, recordTablePrediction, releasedTableEvidence,
  removeTableSupport, reviseTable,
} from "../models/fbd-table.ts";

function baseline() {
  let state = initialTableLearning();
  for (const interaction of TABLE_REFERENCE.canonicalInteractions) state = { ...state, learner: addFbdInteraction(state.learner, interaction) };
  for (const force of TABLE_REFERENCE.canonicalForces) state = { ...state, learner: addFbdForce(state.learner, createFbdForce(force)) };
  return { ...state, phase: "forces" };
}
function released() {
  const checked = compareTable(commitTable(baseline()));
  return removeTableSupport(checked);
}
const prediction = { lostInteraction: "earth", remainingInteraction: "table", motion: "stay", reason: "我猜原本的平衡會保留。" };
const codes = (diagram) => compareTableDiagram(diagram, "unknown", RELEASED_TABLE_REFERENCE, false).diagnostics.map((item) => item.code);

test("support removal is locked until a committed baseline passes", () => {
  const initial = initialTableLearning();
  assert.equal(removeTableSupport(initial), initial);
  const incomplete = compareTable(commitTable({ ...initial, phase: "forces" }));
  assert.equal(removeTableSupport(incomplete), incomplete);
  const committed = commitTable(baseline());
  assert.equal(removeTableSupport(committed), committed);
  const changed = removeTableSupport(compareTable(committed));
  assert.equal(changed.phase, "change");
  assert.equal(changed.supportPresent, false);
  assert.equal(changed.baselineSubmission.diagram.forces.length, 2);
  assert.equal(changed.learner.diagram.forces.length, 2); // preserve the old normal as learner work
});

test("prediction is recorded before rebuilding and remains learner-authored", () => {
  const changed = released();
  assert.equal(recordTablePrediction(changed, prediction), changed);
  const predicting = { ...changed, phase: "predict" };
  assert.equal(recordTablePrediction(predicting, { ...prediction, reason: " " }), predicting);
  const rebuilt = recordTablePrediction(predicting, prediction);
  assert.equal(rebuilt.phase, "rebuild");
  assert.deepEqual(rebuilt.prediction, prediction);
  assert.ok(!JSON.stringify(rebuilt).includes("canonical"));
  assert.equal(compareTableSubmission(rebuilt), null);
});

test("only gravity remains after support removal; old normal and invented acceleration are diagnosed", () => {
  const old = released().learner.diagram;
  assert.deepEqual(RELEASED_TABLE_REFERENCE.canonicalInteractions.map((item) => item.sourceAgentId), ["earth"]);
  assert.deepEqual(RELEASED_TABLE_REFERENCE.canonicalForces.map((item) => item.kind), ["weight"]);
  assert.ok(codes(old).includes("inactive-agent-force"));
  const withoutTable = { ...old, interactions: old.interactions.filter((item) => item.sourceAgentId !== "table"), forces: old.forces.filter((item) => item.kind !== "normal") };
  assert.equal(compareTableDiagram(withoutTable, "unknown", RELEASED_TABLE_REFERENCE, false).pass, true);
  assert.ok(codes({ ...withoutTable, forces: [] }).includes("missing-force"));
  const invented = createFbdForce({ id: "acceleration", interactionId: "earth-block", kind: "other", label: "向下加速度", direction: directionFromDegrees(270) });
  assert.ok(codes({ ...withoutTable, forces: [...withoutTable.forces, invented] }).includes("extra-force"));
});

test("released model rejects Newton III partner and force components as extra forces", () => {
  const old = released().learner.diagram;
  const diagram = { ...old, interactions: old.interactions.filter((item) => item.sourceAgentId === "earth"), forces: old.forces.filter((item) => item.kind === "weight") };
  const partner = { id: "partner", kind: "contact", sourceAgentId: "block", targetSystemId: "table", label: "木塊對桌面" };
  assert.ok(codes({ ...diagram, agents: [...diagram.agents, { id: "block", label: "木塊" }], interactions: [...diagram.interactions, partner] }).includes("wrong-target"));
  const component = createFbdForce({ id: "component", interactionId: "earth-block", kind: "other", label: "重力的 y 分量" });
  assert.ok(codes({ ...diagram, forces: [...diagram.forces, component] }).includes("extra-force"));
});

test("released comparison uses a frozen submission; revision can remove normal without removing gravity", () => {
  const predicting = { ...released(), phase: "predict" };
  const editing = recordTablePrediction(predicting, prediction);
  const wrong = compareTable(commitTable(editing));
  assert.ok(compareTableSubmission(wrong).diagnostics.some((item) => item.code === "inactive-agent-force"));
  let learner = reviseTable(wrong).learner;
  learner = removeFbdForce(learner, "normal");
  learner = { ...learner, diagram: { ...learner.diagram, interactions: learner.diagram.interactions.filter((item) => item.sourceAgentId !== "table") } };
  const corrected = compareTable(commitTable({ ...reviseTable(wrong), learner }));
  assert.equal(compareTableSubmission(corrected).pass, true);
  assert.equal(corrected.learner.diagram.forces.length, 1);
  assert.equal(corrected.learner.diagram.forces[0].kind, "weight");
  assert.equal(corrected.prediction.motion, "stay"); // an incorrect prediction remains visible for reflection
});

test("symbolic evidence uses upward-positive sign convention and does not create a force", () => {
  const evidence = releasedTableEvidence();
  assert.deepEqual(evidence, { initialVelocityY: 0, netForceY: "−mg", accelerationY: "−g", accelerationMps2Y: -9.81 });
  assert.throws(() => releasedTableEvidence(-1));
  assert.equal(initialTableLearning().learner.diagram.forces.length, 0);
});
