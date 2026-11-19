import assert from "node:assert/strict";
import test from "node:test";
import { DOPPLER_MODEL_VERSION, createDopplerExperiment, measurePair } from "../lib/science/doppler.ts";
import {
  DEFAULT_VIEW,
  DOPPLER_PRESETS,
  DOPPLER_PRESET_ORDER,
  clampPair,
  initialSetup,
  makeReference,
  matchingPreset,
  pairReadoutAt,
  presetSetup,
  setupWithVelocities,
  snapVelocity,
} from "../models/doppler.ts";
import { decodeDopplerShare, encodeDopplerShare } from "../models/doppler-serialization.ts";
import {
  DOPPLER_ACTIVITIES,
  advance,
  canManipulateTime,
  chooseExplanation,
  dopplerEvidencePolicy,
  finishVerification,
  hasGuidedProgress,
  keepResult,
  newGuidedSession,
  sessionSetup,
  submitPrediction,
  switchVerifyVariant,
  verificationDone,
} from "../models/doppler-learning.ts";
import { dopplerResult, dopplerResultSvg } from "../models/doppler-export.ts";

const view = { ...DEFAULT_VIEW, connectors: false };

test("share round-trips a starting setup and presentation, and carries no runtime or learner data", () => {
  for (const id of DOPPLER_PRESET_ORDER) {
    const setup = presetSetup(id);
    const encoded = encodeDopplerShare(setup, view, id);
    const decoded = decodeDopplerShare(encoded);
    assert.equal(decoded.error, null);
    assert.deepEqual(decoded.setup, setup);
    assert.deepEqual(decoded.view, view);
    assert.equal(decoded.preset, id);
  }
  const encoded = encodeDopplerShare(setupWithVelocities(0.35, -0.15), DEFAULT_VIEW, null);
  const data = JSON.parse(encoded);
  assert.equal(data.v, 1);
  assert.equal(data.model, DOPPLER_MODEL_VERSION);
  assert.deepEqual(data.setup, { xs: -3, xo: 3, us: 0.35, uo: -0.15 });
  for (const forbidden of ["playing", "time", "prediction", "explanation", "session", "reference"]) assert.ok(!encoded.includes(forbidden), forbidden);
  assert.equal(decodeDopplerShare(encoded).preset, null);
});

test("an absent share is the default setup; bad shares fall back and say why", () => {
  assert.equal(decodeDopplerShare(undefined).error, null);
  assert.deepEqual(decodeDopplerShare(undefined).setup, initialSetup());
  const good = JSON.parse(encodeDopplerShare(presetSetup("sourceApproach"), DEFAULT_VIEW, "sourceApproach"));
  const cases = [
    ["unreadable", ""],
    ["unreadable", "{}"],
    ["unreadable", "null"],
    ["unreadable", "[1]"],
    ["unreadable", ["a", "b"]],
    ["unreadable", "x".repeat(2001)],
    ["format-version", JSON.stringify({ ...good, v: 2 })],
    ["model-version", JSON.stringify({ ...good, model: "doppler-wavefront-0" })],
    ["model-version", JSON.stringify({ ...good, model: undefined })],
    ["unreadable", JSON.stringify({ ...good, mode: "guided" })],
    ["unreadable", JSON.stringify({ ...good, setup: { ...good.setup, us: 0.9 } })],
    ["unreadable", JSON.stringify({ ...good, setup: { ...good.setup, uo: null } })],
    ["unreadable", JSON.stringify({ ...good, setup: { ...good.setup, uo: "0" } })],
    ["unreadable", JSON.stringify({ ...good, setup: { ...good.setup, xo: -3 } })],
    ["unreadable", JSON.stringify({ ...good, view: { ...good.view, pair: -1 } })],
    ["unreadable", JSON.stringify({ ...good, view: { ...good.view, pair: 1.5 } })],
    ["unreadable", JSON.stringify({ ...good, view: { ...good.view, labels: "yes" } })],
  ];
  for (const [error, encoded] of cases) {
    const result = decodeDopplerShare(encoded);
    assert.equal(result.error, error, JSON.stringify(encoded).slice(0, 80));
    assert.deepEqual(result.setup, initialSetup(), "fallback is the default setup");
  }
  assert.equal(decodeDopplerShare(JSON.stringify({ ...good, preset: "nonsense" })).preset, null);
  assert.throws(() => encodeDopplerShare({ ...initialSetup(), sourceVelocity: 0.9 }, DEFAULT_VIEW));
});

test("presets are legal, distinct and found again by matchingPreset", () => {
  const seen = new Set();
  for (const id of DOPPLER_PRESET_ORDER) {
    const setup = presetSetup(id);
    assert.doesNotThrow(() => createDopplerExperiment(setup));
    assert.equal(matchingPreset(setup), id);
    seen.add(JSON.stringify(DOPPLER_PRESETS[id]));
  }
  assert.equal(seen.size, DOPPLER_PRESET_ORDER.length);
  assert.equal(matchingPreset(setupWithVelocities(0.15, 0)), null);
  assert.equal(snapVelocity(0.234), 0.25);
  assert.equal(snapVelocity(-9), -0.5);
  assert.equal(snapVelocity(0.0001), 0);
});

test("a pair reading shows only what has happened by time t, and the pair is clamped to a readable one", () => {
  const experiment = createDopplerExperiment(presetSetup("sourceApproach"));
  const pair = measurePair(experiment, 2);
  const before = pairReadoutAt(experiment, 2, 0);
  assert.deepEqual([before.emissionInterval, before.wavelength, before.period, before.frequency, before.complete], [null, null, null, null, false]);
  const born = pairReadoutAt(experiment, 2, pair.spacingFrom);
  assert.equal(born.emissionInterval, 1);
  assert.ok(Math.abs(born.wavelength - 0.8) < 1e-9);
  assert.equal(born.period, null, "waiting for the adjacent receptions");
  assert.equal(born.complete, false);
  const justBefore = pairReadoutAt(experiment, 2, pair.reception.availableFrom - 0.01);
  assert.equal(justBefore.frequency, null);
  const done = pairReadoutAt(experiment, 2, pair.reception.availableFrom);
  assert.ok(done.complete && Math.abs(done.frequency - 1.25) < 1e-9 && Math.abs(done.period - 0.8) < 1e-9);
  assert.equal(makeReference(experiment.setup, born), null, "half a pair is not a result");
  const kept = makeReference(experiment.setup, done);
  assert.equal(kept.sourceVelocity, 0.2);
  // A slow observer recession leaves few receptions: the pair is pulled back to one that exists.
  const receding = createDopplerExperiment(setupWithVelocities(0, 0.5));
  assert.ok(clampPair(receding, 9) <= receding.receptions.length - 2);
  assert.equal(clampPair(createDopplerExperiment(initialSetup()), 99), createDopplerExperiment(initialSetup()).receptions.length - 2);
});

function reading(session, setup, completeAt = Infinity) {
  const experiment = createDopplerExperiment(setup ?? sessionSetup(session));
  const pair = measurePair(experiment, 2);
  const t = Math.min(completeAt, pair.reception.availableFrom);
  return makeReference(experiment.setup, pairReadoutAt(experiment, 2, t, pair));
}

test("Activity 1 runs predict → measure → explain → complete and needs a real reading to move on", () => {
  let session = newGuidedSession("baseline");
  assert.equal(session.phase, "predict");
  assert.equal(canManipulateTime(session), false);
  assert.equal(hasGuidedProgress(session), false);
  assert.equal(advance(session, reading(session)).phase, "predict", "cannot skip the prediction");
  session = submitPrediction(session, "unchanged");
  assert.equal(session.phase, "measure");
  assert.equal(hasGuidedProgress(session), true);
  assert.equal(advance(session, null).phase, "measure", "an unobserved pair cannot be kept");
  session = advance(session, reading(session));
  assert.equal(session.phase, "explain");
  assert.equal(chooseExplanation(newGuidedSession("baseline"), "x").phase, "predict", "explaining needs the explain phase");
  session = chooseExplanation(session, "sameSpeed");
  assert.equal(session.phase, "complete");
  assert.equal(hasGuidedProgress(session), false);
  assert.equal(session.saved.rest.reference.ratios.frequency, 1);
});

test("Activity 2 keeps S-moves, then O-moves, compares, explains, and verifies recession", () => {
  let session = newGuidedSession("whoMoves");
  assert.equal(session.variant, "source");
  session = submitPrediction(session, "observerHigher");
  assert.equal(session.phase, "measure");
  assert.deepEqual([sessionSetup(session).sourceVelocity, sessionSetup(session).observerVelocity], [0.2, 0]);
  session = advance(session, reading(session));
  assert.equal(session.phase, "observer");
  assert.equal(session.variant, "observer");
  assert.deepEqual([sessionSetup(session).sourceVelocity, sessionSetup(session).observerVelocity], [0, -0.2]);
  assert.equal(session.saved.source.reference.ratios.frequency.toFixed(2), "1.25");
  assert.equal(advance(session, null).phase, "observer");
  session = advance(session, reading(session));
  assert.equal(session.phase, "compare");
  assert.equal(session.saved.observer.reference.ratios.frequency.toFixed(2), "1.20");
  assert.equal(session.saved.source.reference.ratios.wavelength.toFixed(2), "0.80");
  assert.equal(session.saved.observer.reference.ratios.wavelength.toFixed(2), "1.00");
  session = advance(session, null);
  assert.equal(session.phase, "explain");
  session = chooseExplanation(session, "compressedVsClosing");
  assert.equal(session.phase, "verify");
  assert.equal(session.variant, "sourceRecede");
  assert.equal(finishVerification(session).phase, "verify", "nothing verified yet");
  session = keepResult(session, reading(session));
  session = switchVerifyVariant(session, "observerRecede");
  assert.equal(verificationDone(session), false);
  session = keepResult(session, reading(session));
  assert.equal(verificationDone(session), true);
  assert.equal(session.saved.sourceRecede.reference.ratios.wavelength.toFixed(2), "1.20");
  assert.equal(session.saved.sourceRecede.reference.ratios.frequency.toFixed(3), (1 / 1.2).toFixed(3));
  assert.equal(session.saved.observerRecede.reference.ratios.frequency.toFixed(2), "0.80");
  assert.equal(finishVerification(session).phase, "complete");
  // Both tasks are defined.
  assert.deepEqual(DOPPLER_ACTIVITIES.map((a) => a.id), ["baseline", "whoMoves"]);
});

test("disclosure follows the phase: nothing numeric, theoretical, shareable or exportable while predicting", () => {
  const free = dopplerEvidencePolicy(null);
  assert.deepEqual(Object.values(free), Array(Object.keys(free).length).fill(true));
  const predicting = dopplerEvidencePolicy(newGuidedSession("whoMoves"));
  assert.deepEqual(predicting, { theory: false, modelInfo: false, numeric: false, guides: false, frequency: false, reference: false, share: false, export: false });
  let session = submitPrediction(newGuidedSession("whoMoves"), "same");
  const measuring = dopplerEvidencePolicy(session);
  assert.equal(measuring.numeric, true);
  assert.equal(measuring.frequency, false, "the frequency row waits for the comparison");
  assert.equal(measuring.share, false);
  assert.equal(measuring.export, false);
  session = { ...session, phase: "compare" };
  assert.equal(dopplerEvidencePolicy(session).frequency, true);
  assert.equal(dopplerEvidencePolicy(submitPrediction(newGuidedSession("baseline"), "unsure")).frequency, false);
});

test("a result is the whole experiment from one snapshot, refuses guided sessions and bad times", () => {
  const setup = presetSetup("sourceApproach");
  const reference = reading(null, presetSetup("observerApproach"));
  const result = dopplerResult(setup, DEFAULT_VIEW, 9.5, reference, null, "sourceApproach");
  assert.equal(result.schema, "doppler-result-1");
  assert.equal(result.modelVersion, DOPPLER_MODEL_VERSION);
  assert.equal(result.cursorTime, 9.5);
  assert.equal(result.emissions.length, 17);
  assert.equal(result.receptions[0].n, 0);
  assert.equal(result.pair.n, 2);
  assert.equal(result.ratios.wavelength.toFixed(3), "0.800");
  assert.equal(result.ratios.frequency.toFixed(3), "1.250");
  assert.equal(result.analytic.frequency.toFixed(3), "1.250");
  assert.equal(result.reference.ratios.frequency.toFixed(2), "1.20");
  assert.ok(!JSON.stringify(result).includes("prediction"));
  assert.throws(() => dopplerResult(setup, DEFAULT_VIEW, 1, null, newGuidedSession("baseline")), /guided|探索任務/);
  assert.throws(() => dopplerResult(setup, DEFAULT_VIEW, -1, null, null), RangeError);
  assert.throws(() => dopplerResult(setup, DEFAULT_VIEW, 99, null, null), RangeError);
  assert.throws(() => dopplerResult(setup, DEFAULT_VIEW, Number.NaN, null, null), RangeError);
  assert.throws(() => dopplerResult({ ...setup, observerVelocity: 2 }, DEFAULT_VIEW, 1, null, null));
});

test("the SVG is a standalone bilingual figure with conditions, units, version, comparison and event marks", () => {
  const reference = reading(null, presetSetup("observerApproach"));
  const result = dopplerResult(presetSetup("sourceApproach"), DEFAULT_VIEW, 9.5, reference, null, "sourceApproach");
  const svg = dopplerResultSvg(result);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  for (const needle of [
    "聲音的都普勒效應 / Doppler effect of sound",
    'u<tspan baseline-shift="sub" font-size="75%">S</tspan> = +0.20c',
    'u<tspan baseline-shift="sub" font-size="75%">O</tspan> = 0.00c',
    "doppler-wavefront-1",
    "doppler-result-1",
    "λ₀ = cT₀ = 1",
    "x / λ₀",
    "t / T₀",
    "<metadata>",
    'data-event="emission"',
    'data-event="reception"',
    "公式核對 / Formula",
    "1.25",
    "1.20",
    "0.80",
    "to scale",
  ]) assert.ok(svg.includes(needle), needle);
  // Opening the file again recovers every event from the embedded metadata.
  const embedded = JSON.parse(svg.match(/<metadata>([\s\S]*?)<\/metadata>/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'"));
  assert.deepEqual(embedded.receptions, result.receptions);
  assert.equal((svg.match(/data-event="reception"/g) ?? []).length, result.receptions.length);
  assert.equal(svg.includes("NaN") || svg.includes("undefined") || svg.includes("Infinity"), false);
  // A mirrored setup and an experiment cut short by coincidence both render.
  for (const setup of [{ sourceStart: 3, observerStart: -3, sourceVelocity: -0.2, observerVelocity: 0 }, setupWithVelocities(0.5, -0.5)]) {
    const other = dopplerResultSvg(dopplerResult(setup, DEFAULT_VIEW, 0, null, null));
    assert.equal(other.includes("NaN"), false);
  }
  assert.ok(dopplerResultSvg(dopplerResult(setupWithVelocities(0.5, -0.5), DEFAULT_VIEW, 1, null, null)).includes("Ended before S and O coincide"));
});

test("layering: lib/science/doppler.ts depends on nothing; models import lib/science only; no Three.js or React below components", async () => {
  const { readFile } = await import("node:fs/promises");
  const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
  const science = await read("../lib/science/doppler.ts");
  assert.doesNotMatch(science, /^\s*import\s/m, "science imports nothing");
  for (const file of ["doppler", "doppler-learning", "doppler-serialization", "doppler-export"]) {
    const source = await read(`../models/${file}.ts`);
    for (const [, from] of source.matchAll(/from\s+"([^"]+)"/g)) {
      assert.match(from, /^(\.\.\/lib\/science\/doppler\.ts|\.\/[a-z-]+\.ts)$/, `${file} imports ${from}`);
    }
    assert.doesNotMatch(source, /three|react|document\.|window\./i, file);
  }
  const render = await Promise.all(["export", "interaction", "primitives", "viewport"].map((name) => read(`../lib/render/${name}.ts`)));
  for (const source of render) assert.doesNotMatch(source, /doppler/i, "lib/render stays model-agnostic");
});

test("subscripts that name the source or observer are upright capitals, never lowercase italic s / o", async () => {
  const { readFile } = await import("node:fs/promises");
  const files = ["../components/doppler/copy.ts", "../components/doppler/TheoryNotes.tsx", "../components/DopplerLab.tsx", "../models/doppler-export.ts"];
  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\b[uxλ]_[so]\b|\\lambda_[so]\b|t_\{r,|\\Delta t_r\b|[uλ]?[ₛₒ]/, file);
  }
  const theory = await readFile(new URL(files[1], import.meta.url), "utf8");
  assert.match(theory, /u_\\\\mathrm\{S\}/);
  assert.match(theory, /u_\\\\mathrm\{O\}/);
});
