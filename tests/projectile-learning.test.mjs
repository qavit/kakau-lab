import test from "node:test";
import assert from "node:assert/strict";
import {
  canManipulateTime,
  canUseFreeStateControls,
  comparisonVisible,
  isNearApex,
  isRaisedHeightReady,
  hasGuidedProgress,
  newGuidedSession,
  projectileLearningActivities,
  projectileEvidencePolicy,
  recordManipulation,
  revealNextHint,
  revealObservation,
  submitPrediction,
} from "../models/projectile-learning.ts";

const activities = projectileLearningActivities(9.80665);
const REQUIRED_STATE_KEYS = [
  "scenario", "speed", "angle", "height", "gravity", "dragFactor", "stairs",
  "showComplementary", "showEnvelope", "showAcceleration", "showDrag", "playing",
  "direction", "animationSpeed",
];

test("projectile guided activities have unique IDs and complete initial states", () => {
  assert.deepEqual(activities.map((activity) => activity.id), ["apex", "complementary", "elevated"]);
  assert.equal(new Set(activities.map((activity) => activity.id)).size, activities.length);
  for (const activity of activities) {
    assert.deepEqual(Object.keys(activity.initialState).sort(), [...REQUIRED_STATE_KEYS].sort());
    assert.equal(activity.initialState.scenario, "field");
    assert.equal(activity.initialState.dragFactor, 0);
    assert.equal(activity.initialState.playing, false);
  }
});

test("Activity 2 masks its comparison until the prediction is submitted", () => {
  const activity = activities.find(({ id }) => id === "complementary");
  const prediction = newGuidedSession("complementary");
  assert.equal(activity.initialState.showComplementary, false);
  assert.equal(comparisonVisible(prediction), false);

  const observation = submitPrediction(prediction, "same-range");
  assert.equal(observation.phase, "observe");
  assert.equal(comparisonVisible(observation), true);
});

test("Activity 3 changes only the raised-height assumption through the live model state", () => {
  const activity = activities.find(({ id }) => id === "elevated");
  assert.equal(activity.initialState.height, 0);
  assert.equal(activity.initialState.speed, 20);
  assert.equal(activity.initialState.angle, 30);
  assert.equal(activity.initialState.showComplementary, true);
  assert.equal(activity.initialState.dragFactor, 0);
  assert.equal(activity.targetHeight, 25);
  assert.equal(isRaisedHeightReady(24.5, activity.targetHeight), true);
  assert.equal(isRaisedHeightReady(24, activity.targetHeight), false);
});

test("restart and progressive helpers return predictable activity-local state", () => {
  const start = newGuidedSession("apex");
  const predicted = submitPrediction(start, "vertical-only");
  const attempted = recordManipulation(predicted);
  const hinted = revealNextHint(revealNextHint(attempted), 3);
  const observed = revealObservation(hinted);

  assert.equal(predicted.phase, "manipulate");
  assert.equal(attempted.hasManipulated, true);
  assert.equal(hinted.hintLevel, 2);
  assert.equal(observed.phase, "observe");
  assert.deepEqual(newGuidedSession("apex"), start);
});

test("apex detection is forgiving without accepting an unrelated point in the flight", () => {
  assert.equal(isNearApex(1.73, 1.68, 0.45, 3.46), true);
  assert.equal(isNearApex(1.73, 0.4, 13.0, 3.46), false);
});

test("guided mode reserves scenario and preset state for its complete activity setup", () => {
  assert.equal(canUseFreeStateControls(null), true, "free exploration keeps header state controls");
  assert.equal(canUseFreeStateControls(newGuidedSession("apex")), false, "guided mode owns its reference state");
});

test("time manipulation is blocked only until a guided prediction is committed", () => {
  const predicting = newGuidedSession("apex");
  const manipulating = submitPrediction(predicting, "vertical-only");
  const observing = revealObservation(manipulating);

  assert.equal(canManipulateTime(null), true, "free exploration retains all time controls");
  assert.equal(canManipulateTime(predicting), false, "prediction cannot be bypassed with the cursor");
  assert.equal(canManipulateTime(manipulating), true, "manipulation begins immediately after prediction");
  assert.equal(canManipulateTime(observing), true, "observation keeps the instruments available");
});

test("all three predictions hide answer channels and reveal evidence after commitment", () => {
  const free = projectileEvidencePolicy(null);
  assert.deepEqual(free, { theory: true, modelInfo: true, numericResults: true, comparison: true, share: true, export: true });
  for (const activity of activities) {
    const predicting = projectileEvidencePolicy(newGuidedSession(activity.id));
    assert.deepEqual(predicting, { theory: false, modelInfo: false, numericResults: false, comparison: false, share: false, export: false }, activity.id);
    const submitted = projectileEvidencePolicy(submitPrediction(newGuidedSession(activity.id), activity.choices[0].id));
    assert.equal(submitted.theory, true, activity.id);
    assert.equal(submitted.numericResults, true, activity.id);
    assert.equal(submitted.comparison, true, activity.id);
    assert.equal(submitted.share, false, activity.id);
    assert.equal(submitted.export, false, activity.id);
  }
});

test("only a committed, unfinished task counts as progress worth confirming before leaving", () => {
  for (const activity of activities) {
    const fresh = newGuidedSession(activity.id);
    assert.equal(hasGuidedProgress(fresh), false, `${activity.id}: nothing to lose before predicting`);
    const committed = submitPrediction(fresh, activity.choices[0].id);
    assert.equal(hasGuidedProgress(committed), true, `${activity.id}: a prediction is progress`);
    assert.equal(hasGuidedProgress({ ...committed, phase: "complete" }), false, `${activity.id}: a finished task leaves freely`);
  }
});
