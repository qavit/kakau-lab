import test from "node:test";
import assert from "node:assert/strict";
import {
  addFbdAgent,
  addFbdForce,
  addFbdInteraction,
  createFbdAgent,
  createFbdForce,
  createFbdInteraction,
  deriveFbdModel,
  initialFbdState,
  selectFbdForce,
  updateFbdForce,
  validateFbdStructure,
} from "../models/fbd.ts";

function stateWithPush(extra = {}) {
  let state = initialFbdState();
  state = addFbdAgent(state, createFbdAgent({ id: "hand", label: "手" }));
  state = addFbdInteraction(state, createFbdInteraction({
    id: "push-contact",
    kind: "applied",
    sourceAgentId: "hand",
    targetSystemId: state.diagram.system.id,
    label: "手推物體",
  }));
  return addFbdForce(state, createFbdForce({
    id: "push",
    interactionId: "push-contact",
    kind: "applied",
    label: "外力",
    magnitudeN: 4,
    direction: { x: 1, y: 0 },
    ...extra,
  }));
}

test("duplicate agent, interaction and force ids are rejected", () => {
  const state = stateWithPush();
  assert.throws(() => addFbdAgent(state, createFbdAgent({ id: "hand", label: "另一隻手" })), /Duplicate FBD agent/);
  assert.throws(
    () => addFbdInteraction(state, createFbdInteraction({
      id: "push-contact",
      kind: "contact",
      sourceAgentId: "hand",
      targetSystemId: state.diagram.system.id,
      label: "重複",
    })),
    /Duplicate FBD interaction/,
  );
  assert.throws(
    () => addFbdForce(state, createFbdForce({ id: "push", interactionId: "push-contact", kind: "applied", label: "重複" })),
    /Duplicate FBD force/,
  );
});

test("blank identity fields are rejected at creation", () => {
  assert.throws(() => createFbdAgent({ id: " ", label: "手" }), /non-empty/);
  assert.throws(() => createFbdAgent({ id: "hand", label: "" }), /non-empty/);
  assert.throws(
    () => createFbdInteraction({ id: "i", kind: "contact", sourceAgentId: "", targetSystemId: "body-1", label: "x" }),
    /non-empty/,
  );
  assert.throws(
    () => createFbdForce({ id: "f", interactionId: "  ", kind: "other", label: "x" }),
    /must reference an interaction/,
  );
});

test("force magnitude and direction are validated on create and on update", () => {
  for (const magnitudeN of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => createFbdForce({ id: "f", interactionId: "i", kind: "other", label: "x", magnitudeN }),
      /magnitude/,
    );
    assert.throws(() => updateFbdForce(stateWithPush(), "push", { magnitudeN }), /magnitude/);
  }
  assert.throws(() => updateFbdForce(stateWithPush(), "push", { direction: { x: 0, y: 0 } }), /direction/);
});

test("updateFbdForce can clear a magnitude, rejects unknown interactions and ignores unknown ids", () => {
  const state = stateWithPush();
  const cleared = updateFbdForce(state, "push", { magnitudeN: null });
  assert.equal(cleared.diagram.forces[0].magnitudeN, null);
  assert.equal(state.diagram.forces[0].magnitudeN, 4);
  assert.throws(() => updateFbdForce(state, "push", { interactionId: "nope" }), /Unknown FBD interaction/);
  assert.equal(updateFbdForce(state, "missing", { magnitudeN: 1 }), state);
});

test("selectFbdForce ignores unknown ids and clears on null", () => {
  const state = stateWithPush();
  assert.equal(selectFbdForce(state, "missing"), state);
  assert.equal(selectFbdForce(state, null).selectedForceId, null);
  assert.equal(selectFbdForce(selectFbdForce(state, null), "push").selectedForceId, "push");
});

test("validateFbdStructure reports each broken reference", () => {
  const state = stateWithPush();
  assert.deepEqual(validateFbdStructure(state.diagram), []);
  const broken = {
    ...state.diagram,
    agents: [],
    interactions: [{ ...state.diagram.interactions[0], targetSystemId: "other" }],
    forces: [{ ...state.diagram.forces[0], interactionId: "gone" }],
  };
  assert.deepEqual(validateFbdStructure(broken), [
    "unknown-interaction-agent",
    "wrong-interaction-target",
    "unknown-force-interaction",
  ]);
});

test("deriveFbdModel yields acceleration only with a complete net force and a mass", () => {
  const state = stateWithPush();
  assert.deepEqual(deriveFbdModel(state).netForceN, { x: 4, y: 0 });
  assert.equal(deriveFbdModel(state).acceleration, null);

  const withMass = { ...state, diagram: { ...state.diagram, system: { ...state.diagram.system, massKg: 2 } } };
  assert.deepEqual(deriveFbdModel(withMass).acceleration, { x: 2, y: 0 });

  const qualitative = updateFbdForce(withMass, "push", { magnitudeN: null });
  const derived = deriveFbdModel(qualitative);
  assert.equal(derived.netForceN, null);
  assert.equal(derived.acceleration, null);

  const broken = { ...withMass, diagram: { ...withMass.diagram, agents: [] } };
  assert.equal(deriveFbdModel(broken).netForceN, null);
});
