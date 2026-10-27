import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import * as h from "../lib/science/hydrogen.ts";
import {
  advanceHydrogen,
  deriveHydrogenModel,
  fireTransition,
  initialHydrogenState,
  placeElectron,
  selectTransition,
  setMaxLevel,
} from "../models/hydrogen.ts";

const near = (actual, expected, tolerance, message) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message ?? ""} expected ${expected} ± ${tolerance}, got ${actual}`);

test("level energies follow −13.6 eV / n² and tend to zero", () => {
  near(h.levelEnergy(1), -13.6057, 1e-3);
  near(h.levelEnergy(2), -3.4014, 1e-3);
  near(h.levelEnergy(3) * 9, h.levelEnergy(1), 1e-9, "E3 · 9 = E1");
  assert.ok(h.levelEnergy(7) < 0 && h.levelEnergy(7) > h.levelEnergy(6));
});

test("orbit radius scales as n² and speed as 1/n; angular momentum is n ħ", () => {
  near(h.orbitRadius(1), 52.918, 1e-3);
  near(h.orbitRadius(4) / h.orbitRadius(1), 16, 1e-9);
  near(h.orbitSpeed(1), 2.1877e6, 1e3, "v1 = αc ≈ 2.19e6 m/s");
  near(h.orbitSpeed(2) * 2, h.orbitSpeed(1), 1e-6);
  near(h.relativeAngularVelocity(2), 1 / 8, 1e-12);
  assert.equal(h.angularMomentum(5), 5);
});

test("the energy route and the Rydberg-formula route give the same wavelength for every pair", () => {
  for (let upper = 2; upper <= h.MAX_LEVEL; upper += 1) {
    for (let lower = 1; lower < upper; lower += 1) {
      near(h.transition(upper, lower).wavelength, h.rydbergWavelength(upper, lower), 1e-2, `${upper}→${lower}`);
    }
  }
});

test("known lines land where they are observed (R∞ keeps the Hα error under 0.1 %)", () => {
  const halpha = h.transition(3, 2);
  near(halpha.wavelength, 656.47, 656.47 * 1e-3, "Hα vacuum 656.47 nm");
  near(h.transition(4, 2).wavelength, 486.27, 486.27 * 1e-3, "Hβ");
  near(h.transition(2, 1).wavelength, 121.57, 121.57 * 1e-3, "Lyman α");
  assert.equal(halpha.series, "Balmer");
  assert.equal(halpha.region, "visible");
  assert.equal(h.transition(2, 1).region, "ultraviolet");
  assert.equal(h.transition(4, 3).region, "infrared");
  near(halpha.photonEnergy, 1.889, 1e-3);
  near(halpha.frequency, h.SPEED_OF_LIGHT / (halpha.wavelength * 1e-9), 1e10, "f = c / λ");
});

test("Lyman is all ultraviolet, Paschen all infrared, and Balmer is the visible series", () => {
  const regions = (lower, maxN) => new Set(h.seriesLines(lower, maxN).map((line) => line.region));
  assert.deepEqual([...regions(1, h.MAX_LEVEL)], ["ultraviolet"]);
  assert.deepEqual([...regions(3, h.MAX_LEVEL)], ["infrared"]);
  // The four classic visible Balmer lines, 3→2 … 6→2; 7→2 (397 nm) is still visible at the violet edge.
  assert.deepEqual([...regions(2, 6)], ["visible"]);
  assert.equal(h.transition(7, 2).region, "visible");
  assert.equal(h.transition(2, 1).region, "ultraviolet");
});

test("series wavelengths shrink toward the series limit and never pass it", () => {
  for (const lower of [1, 2, 3]) {
    const lines = h.seriesLines(lower, h.MAX_LEVEL);
    const limit = h.seriesLimitWavelength(lower);
    for (let i = 1; i < lines.length; i += 1) assert.ok(lines[i].wavelength < lines[i - 1].wavelength);
    assert.ok(lines.at(-1).wavelength > limit);
  }
  near(h.seriesLimitWavelength(2), 364.5, 0.5, "Balmer limit");
  near(h.seriesLimitWavelength(1), 91.13, 0.1, "Lyman limit");
});

test("transition order and level range are enforced", () => {
  assert.throws(() => h.transition(2, 2), RangeError);
  assert.throws(() => h.transition(2, 3), RangeError);
  assert.throws(() => h.levelEnergy(0), RangeError);
  assert.throws(() => h.levelEnergy(1.5), RangeError);
  assert.throws(() => h.levelEnergy(h.MAX_LEVEL + 1), RangeError);
  assert.throws(() => h.levelEnergy(Number.NaN), RangeError);
});

test("visible colours exist exactly inside 380–750 nm", () => {
  assert.equal(h.visibleRgb(300), undefined);
  assert.equal(h.visibleRgb(800), undefined);
  assert.equal(h.visibleRgb(Number.NaN), undefined);
  const [r, , b] = h.visibleRgb(656.47);
  assert.ok(r > 150 && b === 0, "Hα is red");
  const [r2, g2, b2] = h.visibleRgb(486.27);
  assert.ok(b2 > r2 && g2 > 0, "Hβ is blue-green");
});

test("selectTransition repairs invalid input and parks the electron at the starting level", () => {
  const state = initialHydrogenState();
  const inverted = selectTransition(state, 2, 4);
  assert.ok(inverted.upper > inverted.lower);
  const huge = selectTransition(state, 99, 1);
  assert.equal(huge.upper, state.maxN);
  const nan = selectTransition(state, Number.NaN, Number.NaN);
  assert.ok(nan.upper > nan.lower && nan.lower >= 1);
  assert.equal(selectTransition(state, 4, 2, "emission").electronLevel, 4);
  assert.equal(selectTransition(state, 4, 2, "absorption").electronLevel, 2);
});

test("shrinking the shown levels pulls the selected transition inside", () => {
  const wide = selectTransition(initialHydrogenState(), 5, 2);
  const narrow = setMaxLevel(wide, 3);
  assert.equal(narrow.maxN, 3);
  assert.ok(narrow.upper <= 3 && narrow.upper > narrow.lower);
  assert.equal(setMaxLevel(wide, 1).maxN, 3);
  assert.equal(setMaxLevel(wide, 99).maxN, 7);
});

test("emission drops the electron at once and sends the photon out", () => {
  const fired = fireTransition(selectTransition(initialHydrogenState(), 3, 2, "emission"));
  assert.equal(fired.electronLevel, 2);
  assert.equal(fired.photonProgress, 0);
  const mid = advanceHydrogen(fired, 0.5);
  assert.equal(mid.electronLevel, 2);
  assert.ok(mid.photonProgress > 0 && mid.photonProgress < 1);
  const done = advanceHydrogen(mid, 5);
  assert.equal(done.photonProgress, null);
  assert.equal(done.electronLevel, 2);
});

test("absorption keeps the electron down until the photon arrives, then lifts it", () => {
  const fired = fireTransition(selectTransition(initialHydrogenState(), 3, 2, "absorption"));
  assert.equal(fired.electronLevel, 2);
  const mid = advanceHydrogen(fired, 0.5);
  assert.equal(mid.electronLevel, 2, "no jump while the photon is still travelling");
  const done = advanceHydrogen(mid, 5);
  assert.equal(done.electronLevel, 3);
  assert.equal(done.photonProgress, null);
});

test("pausing freezes the electron and any photon; bad time steps are ignored", () => {
  const fired = { ...fireTransition(initialHydrogenState()), playing: false };
  assert.equal(advanceHydrogen(fired, 1), fired);
  const live = { ...fired, playing: true };
  for (const dt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(advanceHydrogen(live, dt), live);
});

test("orbit angle advances n³ times slower on level n and stays within one turn", () => {
  const base = { ...initialHydrogenState(), photonProgress: null };
  const one = advanceHydrogen(placeElectron(base, 1), 0.01).orbitAngle;
  const three = advanceHydrogen(placeElectron(base, 3), 0.01).orbitAngle;
  near(one / three, 27, 1e-9);
  let state = placeElectron(base, 1);
  for (let i = 0; i < 2000; i += 1) state = advanceHydrogen(state, 0.05);
  assert.ok(state.orbitAngle >= 0 && state.orbitAngle < 2 * Math.PI);
});

test("deriveHydrogenModel reports the selected photon and the electron's own level", () => {
  const readout = deriveHydrogenModel(selectTransition(initialHydrogenState(), 4, 2));
  assert.equal(readout.levels.length, 5);
  assert.equal(readout.selected.upper, 4);
  assert.equal(readout.seriesName, "Balmer");
  assert.equal(readout.series.length, 3);
  assert.equal(readout.electron.n, 4);
  assert.equal(readout.ready, true);
  const fired = deriveHydrogenModel(fireTransition(selectTransition(initialHydrogenState(), 4, 2)));
  assert.equal(fired.inFlight, true);
  assert.equal(fired.ready, false);
});

test("layering: the science file imports nothing, the model imports science only", async () => {
  const [science, model] = await Promise.all([
    readFile(new URL("../lib/science/hydrogen.ts", import.meta.url), "utf8"),
    readFile(new URL("../models/hydrogen.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(science, /^import /m);
  assert.doesNotMatch(model, /from "(react|three)|components\/|lib\/render/);
  assert.match(model, /from "\.\.\/lib\/science\/hydrogen\.ts"/);
});
