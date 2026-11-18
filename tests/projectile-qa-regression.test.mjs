// Independent-oracle regression for the Projectile baseline (QA round 2, 2026-11-18).
// Oracles are textbook closed forms written here, NOT imported from the code under test.
import test from "node:test";
import assert from "node:assert/strict";
import { initialProjectileState, PROJECTILE_PRESETS, deriveProjectileModel } from "../models/projectile.ts";
import { decodeProjectileShare, encodeProjectileShare } from "../models/projectile-serialization.ts";
import { projectileResult, projectileResultSvg } from "../models/projectile-export.ts";
import { launchVelocity, flightTime, range, apex, sampleDragTrajectory, complementaryAngle } from "../lib/science/projectile.ts";

const rad = d => (d * Math.PI) / 180;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ""} ${a} vs ${b} (tol ${tol})`);
const LAYERS = { trajectory: true, velocity: false, components: true, guides: false, grid: true, labels: true, markers: false };

test("vacuum: range, time of flight and apex match level-ground closed forms", () => {
  for (const [v, th, g] of [[20, 30, 9.80665], [35, 45, 9.80665], [15, 70, 1.62], [24, 15, 3.71]]) {
    const vel = launchVelocity(v, th);
    near(flightTime(vel, 0, g), (2 * v * Math.sin(rad(th))) / g, 1e-9, "T");
    near(range(v, th, 0, g), (v * v * Math.sin(rad(2 * th))) / g, 1e-9, "R");
    const a = apex(vel, 0, g);
    near(a.point.y, (v * Math.sin(rad(th))) ** 2 / (2 * g), 1e-9, "H");
    near(a.t, (v * Math.sin(rad(th))) / g, 1e-9, "t_apex");
  }
});

test("at the apex vertical velocity is zero while horizontal velocity is v·cosθ (nonzero unless 90°)", () => {
  const model = deriveProjectileModel({ ...initialProjectileState(), ...PROJECTILE_PRESETS.oblique });
  const s = initialProjectileState(); const st = { ...s, ...PROJECTILE_PRESETS.oblique };
  const vel = launchVelocity(st.speed, st.angle);
  const a = apex(vel, st.height, st.gravity);
  // Nearest trajectory sample to the apex time must have |vy| small and vx == v cosθ.
  const sample = model.trajectory.reduce((p, c) => (Math.abs(c.t - a.t) < Math.abs(p.t - a.t) ? c : p));
  near(sample.velocity.x, st.speed * Math.cos(rad(st.angle)), 1e-9, "vx constant");
  assert.ok(Math.abs(sample.velocity.x) > 1e-6);
  near(sample.velocity.y, 0, st.gravity * 0.1, "vy≈0 near apex");
});

test("level ground: complementary angles share range but not flight time; raising the launch breaks it", () => {
  const v = 22, g = 9.80665;
  for (const th of [20, 30, 40]) {
    const co = complementaryAngle(th);
    near(co, 90 - th, 1e-12);
    near(range(v, th, 0, g), range(v, co, 0, g), 1e-9, "equal range");
    const t1 = flightTime(launchVelocity(v, th), 0, g), t2 = flightTime(launchVelocity(v, co), 0, g);
    assert.ok(Math.abs(t1 - t2) > 0.1, "flight times differ");
    // 45° is the unique maximum on level ground
    assert.ok(range(v, 45, 0, g) >= range(v, th, 0, g));
  }
  for (const h of [2, 10, 25]) {
    assert.ok(Math.abs(range(v, 30, h, g) - range(v, 60, h, g)) > 0.05, `h=${h}: ranges must differ`);
  }
  // Elevated closed form: R = v cosθ (v sinθ + sqrt(v² sin²θ + 2 g h)) / g
  const th = 30, h = 25;
  const expect = (v * Math.cos(rad(th)) * (v * Math.sin(rad(th)) + Math.sqrt((v * Math.sin(rad(th))) ** 2 + 2 * g * h))) / g;
  near(range(v, th, h, g), expect, 1e-9, "elevated R");
});

test("drag: b→0 converges to vacuum linearly, b>0 shortens range, trajectory is finite", () => {
  const v = 30, th = 40, g = 9.80665, vel = launchVelocity(v, th);
  const vac = range(v, th, 0, g);
  const deficit = b => vac - sampleDragTrajectory(vel, 0, g, b).at(-1).point.x;
  const d1 = deficit(1e-3), d2 = deficit(1e-4), d3 = deficit(1e-6);
  assert.ok(d1 > d2 && d2 > d3 && d3 > 0, `monotone deficit ${d1} ${d2} ${d3}`);
  near(d1 / d2, 10, 1.5, "deficit scales ~linearly with b");
  near(deficit(0), 0, 1e-3, "b=0 equals vacuum within RK4+interpolation error");
  for (const s of sampleDragTrajectory(vel, 5, g, 0.01)) {
    assert.ok([s.t, s.point.x, s.point.y, s.velocity.x, s.velocity.y].every(Number.isFinite));
  }
});

test("drag with gravity so low the flight outlasts 120 s ends at the time cap, reported as such", () => {
  const samples = sampleDragTrajectory(launchVelocity(50, 45), 0, 0.001, 0.0001);
  const last = samples.at(-1);
  assert.ok(last.t >= 119.9 && last.t <= 120.1, `t=${last.t}`);
  assert.ok(last.point.y > 0, "still airborne at cap");
});

test("export: JSON and SVG are one snapshot; SVG numbers/points trace to JSON and stay inside the canvas", () => {
  for (const key of ["horizontal", "oblique", "complementary", "elevated", "staircase", "drag", "moon"]) {
    const state = { ...initialProjectileState(), ...PROJECTILE_PRESETS[key] };
    for (const cursor of [0, 0.37, 1]) {
      const result = projectileResult(state, LAYERS, cursor, null);
      const svg = projectileResultSvg(result);
      assert.doesNotMatch(svg, /NaN|Infinity|undefined/, key);
      assert.ok(svg.includes(`t=${result.cursor.t.toFixed(3)} s`), "cursor time in text equals JSON");
      assert.ok(svg.includes(`x=${result.cursor.point.x.toFixed(3)} m`));
      const polylines = [...svg.matchAll(/<polyline[^>]*points="([^"]+)"/g)];
      assert.equal(polylines.length, result.trajectories.length, `${key}: one polyline per trajectory`);
      polylines.forEach((m, i) => {
        const pts = m[1].trim().split(/\s+/).map(p => p.split(",").map(Number));
        assert.equal(pts.length, result.trajectories[i].samples.length);
        for (const [x, y] of pts) { assert.ok(x >= 0 && x <= 1000 && y >= 0 && y <= 790, `${key}: point (${x},${y}) clipped`); }
      });
      assert.ok(result.trajectories.every(t => t.termination === "landing" || t.termination === "time-cap"));
    }
  }
});

test("export contains no learner/answer fields and every trajectory has finite samples", () => {
  const result = projectileResult({ ...initialProjectileState(), ...PROJECTILE_PRESETS.drag }, LAYERS, 0.5, null);
  const json = JSON.stringify(result);
  assert.doesNotMatch(json, /prediction|explanation|answer|student|learner|session/i);
  for (const t of result.trajectories) for (const s of t.samples) assert.ok(Number.isFinite(s.t) && Number.isFinite(s.point.x) && Number.isFinite(s.point.y));
  assert.equal(result.modelVersion, "projectile-vacuum-rk4-1");
});

test("share v1 golden string (wire-format pin): legacy link decodes, re-encodes byte-identically, cursor not carried", () => {
  const GOLDEN = '{"v":1,"mode":"free","launch":{"x":0,"height":25,"speed":20,"angle":30,"gravity":9.80665,"dragFactor":0,"scenario":"field"},"stairs":{"width":0.3,"rise":0.18,"count":24},"comparisons":{"showComplementary":true,"showEnvelope":false,"showAcceleration":true,"showDrag":false},"layers":{"trajectory":true,"velocity":false,"components":true,"guides":false,"grid":true,"labels":true,"markers":false},"preset":"elevated"}';
  const d = decodeProjectileShare(GOLDEN);
  assert.equal(d.error, null);
  assert.equal(d.state.playing, false, "loads paused");
  assert.equal(d.preset, "elevated");
  assert.equal(encodeProjectileShare(d.state, d.layers, d.preset), GOLDEN);
  assert.ok(!("cursor" in JSON.parse(GOLDEN)) && !GOLDEN.includes("cursorFraction"));
});

test("share v1: every preset encodes→decodes→encodes identically; unknown top-level fields do not leak into re-encode", () => {
  for (const key of Object.keys(PROJECTILE_PRESETS)) {
    const state = { ...initialProjectileState(), ...PROJECTILE_PRESETS[key] };
    const once = encodeProjectileShare(state, LAYERS, key);
    const d = decodeProjectileShare(once);
    assert.equal(d.error, null, key);
    assert.equal(encodeProjectileShare(d.state, d.layers, d.preset), once, key);
  }
  const base = JSON.parse(encodeProjectileShare(initialProjectileState(), LAYERS));
  const d = decodeProjectileShare(JSON.stringify({ ...base, prediction: "A", student: "x" }));
  if (!d.error) assert.doesNotMatch(encodeProjectileShare(d.state, d.layers, d.preset), /prediction|student/);
});

test("SVG legend: each trajectory has a key line with the same stroke+dash as its curve, and fits the canvas", () => {
  for (const key of ["oblique", "complementary", "drag"]) {
    const state = { ...initialProjectileState(), ...PROJECTILE_PRESETS[key] };
    const result = projectileResult({ ...state, showComplementary: true, showDrag: true, dragFactor: state.dragFactor || 0.05 }, LAYERS, 0.4, null);
    const svg = projectileResultSvg(result);
    const curves = [...svg.matchAll(/<polyline[^>]*stroke="([^"]+)"[^>]*stroke-dasharray="([^"]+)"/g)].map(m => m.slice(1, 3).join("|"));
    const keys = [...svg.matchAll(/<line data-legend="([^"]+)" x1="([\d.]+)" x2="[\d.]+"[^>]*stroke="([^"]+)" stroke-width="2.5" stroke-dasharray="([^"]+)"/g)];
    assert.equal(keys.length, result.trajectories.length, key);
    keys.forEach((m, i) => assert.equal(`${m[3]}|${m[4]}`, curves[i], `${key}: legend key ${m[1]} matches curve`));
    // Legend labels: estimated width (CJK 14px, other 7.5px) must stay inside the 1000px canvas.
    for (const m of svg.matchAll(/<text x="([\d.]+)" y="502" font-size="14">([^<]*)<\/text>/g)) {
      const w = [...m[2]].reduce((a, c) => a + (c.charCodeAt(0) > 0x2e80 ? 14 : 7.5), 0);
      assert.ok(Number(m[1]) + w <= 1000, `${key}: legend text overruns (${Number(m[1]) + w})`);
    }
  }
});

import { projectileEvidencePolicy, newGuidedSession, submitPrediction, canManipulateTime, canUseFreeStateControls, projectileLearningActivities } from "../models/projectile-learning.ts";
test("evidence policy table: predict withholds theory/model/numbers; share+export only outside any task", () => {
  for (const id of ["apex", "complementary", "elevated"]) {
    const s = newGuidedSession(id);
    for (const phase of ["predict", "manipulate", "observe", "explain", "complete"]) {
      const pol = projectileEvidencePolicy({ ...s, phase });
      assert.equal(pol.share, false, `${id}/${phase} share`);
      assert.equal(pol.export, false, `${id}/${phase} export`);
      assert.equal(pol.theory, phase !== "predict", `${id}/${phase} theory`);
      assert.equal(pol.numericResults, phase !== "predict", `${id}/${phase} numbers`);
      assert.equal(pol.comparison, phase !== "predict", `${id}/${phase} comparison`);
    }
    assert.equal(canManipulateTime({ ...s, phase: "predict" }), false);
    assert.equal(canUseFreeStateControls(s), false);
    assert.notEqual(submitPrediction(s, "x").phase, "predict");
  }
  const free = projectileEvidencePolicy(null);
  assert.deepEqual([free.share, free.export, free.theory, free.numericResults, free.comparison], [true, true, true, true, true]);
});

test("guided session object carries no student identity and activities expose no answer keys", () => {
  const s = submitPrediction(newGuidedSession("apex"), "vertical-only");
  assert.deepEqual(Object.keys(s).sort(), ["activityId", "explanation", "hasManipulated", "hintLevel", "phase", "prediction"]);
  for (const a of projectileLearningActivities(9.80665)) {
    assert.ok(!("answer" in a) && !("correct" in a) && !a.choices.some(c => "correct" in c || "answer" in c), a.id);
  }
});
