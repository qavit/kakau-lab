import test from "node:test";
import assert from "node:assert/strict";
import { SPECIES, SPECIES_ORDER } from "../models/chemistry/lewis-species.ts";
import { LAYOUTS, ATOM_CLEARANCE, PAIR_RADIUS, bondPairDots, lonePairAngles, directionDegrees, co2PairDots, tangentPair } from "../models/chemistry/lewis-layout.ts";
import { createHistory, commit, undo, redo } from "../models/chemistry/lewis-history.ts";
import { initialDiagram, evaluateLewis } from "../models/chemistry/lewis.ts";
import { advanceBond, editLonePairs } from "../models/chemistry/lewis-editor.ts";
import { diagnose, hints, budgetNote } from "../models/chemistry/lewis-feedback.ts";
import { build } from "./fixtures/lewis-build.mjs";

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDist = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d); };

test("layouts place every atom once and leave room for three bonding pairs on every bond", () => {
  for (const id of SPECIES_ORDER) {
    const layout = LAYOUTS[id], sp = SPECIES[id];
    assert.deepEqual(Object.keys(layout.positions).sort(), sp.atoms.map((a) => a.id).sort());
    const pts = Object.values(layout.positions);
    for (const p of pts) assert.ok(p.x - 60 > -20 && p.x + 60 < layout.width + 20 && p.y > 20 && p.y < layout.height - 20, `${id} fits`);
    for (const [a, b] of sp.bonds) assert.ok(dist(layout.positions[a], layout.positions[b]) >= 2 * ATOM_CLEARANCE + 2 * 11 + 10, `${id} ${a}-${b} bond is long enough`);
  }
});
test("bonding pairs: two dots per pair, oriented across the bond, for every bond and order", () => {
  for (const id of SPECIES_ORDER) for (const [a, b] of SPECIES[id].bonds) for (const order of [1, 2, 3]) {
    const pa = LAYOUTS[id].positions[a], pb = LAYOUTS[id].positions[b];
    const pairs = bondPairDots(pa, pb, order);
    assert.equal(pairs.length, order);
    assert.equal(pairs.flat().length, 2 * order);
    const ux = (pb.x - pa.x) / dist(pa, pb), uy = (pb.y - pa.y) / dist(pa, pb);
    for (const [d1, d2] of pairs) {
      assert.ok(Math.abs((d2.x - d1.x) * ux + (d2.y - d1.y) * uy) < 1e-9, "pair axis is perpendicular to the bond");
      assert.ok(Math.abs(dist(d1, d2) - 10) < 1e-9);
    }
  }
});
test("horizontal bond -> vertical colon, vertical bond -> horizontal dots, diagonal -> tilted pair", () => {
  const [h] = bondPairDots(LAYOUTS.h2.positions.h1, LAYOUTS.h2.positions.h2, 1);
  assert.equal(h[0].x, h[1].x); assert.notEqual(h[0].y, h[1].y);
  const [v] = bondPairDots(LAYOUTS.ch4.positions.c, LAYOUTS.ch4.positions.h1, 1);
  assert.equal(v[0].y, v[1].y); assert.notEqual(v[0].x, v[1].x);
  const [d] = bondPairDots(LAYOUTS.h2o.positions.h1, LAYOUTS.h2o.positions.o, 1);
  assert.ok(Math.abs(d[0].x - d[1].x) > 1 && Math.abs(d[0].y - d[1].y) > 1);
});
test("multiple pairs of one bond stay side by side along the bond and never overlap", () => {
  const pairs = bondPairDots(LAYOUTS.hcn.positions.c, LAYOUTS.hcn.positions.n, 3);
  const xs = pairs.map(([p]) => p.x);
  assert.deepEqual([...xs].sort((a, b) => a - b), xs);
  assert.ok(xs[1] - xs[0] >= 10 && xs[2] - xs[1] >= 10);
});
test("lone pairs: count is exact, clear of bonds and of each other for 0-4 pairs on every atom", () => {
  for (const id of SPECIES_ORDER) for (const atom of SPECIES[id].atoms) {
    const here = LAYOUTS[id].positions[atom.id];
    const bondAngles = SPECIES[id].bonds.filter(([a, b]) => a === atom.id || b === atom.id)
      .map(([a, b]) => directionDegrees(here, LAYOUTS[id].positions[a === atom.id ? b : a]));
    for (let k = 0; k <= 4; k++) {
      const angles = lonePairAngles(bondAngles, k);
      assert.equal(angles.length, k);
      const dots = angles.flatMap((a) => tangentPair(here.x, here.y, PAIR_RADIUS, a));
      assert.equal(dots.length, 2 * k);
      for (let i = 0; i < angles.length; i++) for (let j = i + 1; j < angles.length; j++) assert.ok(angDist(angles[i], angles[j]) >= 21.9, `${id}/${atom.id}/${k} pairs apart`);
    }
  }
});
test("the pairs that complete each reference structure never sit on a bond", () => {
  const needs = { h2o: { o: 2 }, nh3: { n: 1 }, hcn: { n: 1 }, co2: { "o-left": 2, "o-right": 2 } };
  for (const [id, atoms] of Object.entries(needs)) for (const [atomId, k] of Object.entries(atoms)) {
    const here = LAYOUTS[id].positions[atomId];
    const bondAngles = SPECIES[id].bonds.filter(([a, b]) => a === atomId || b === atomId)
      .map(([a, b]) => directionDegrees(here, LAYOUTS[id].positions[a === atomId ? b : a]));
    for (const angle of lonePairAngles(bondAngles, k)) for (const bond of bondAngles) assert.ok(angDist(angle, bond) >= 60, `${id}/${atomId} pair ${angle} vs bond ${bond}`);
  }
});
test("water's two lone pairs sit above the bent H-O-H, nitrogen's one above NH3", () => {
  const o = LAYOUTS.h2o.positions;
  const water = lonePairAngles([directionDegrees(o.o, o.h1), directionDegrees(o.o, o.h2)], 2);
  assert.ok(water.every((a) => a > 180 && a < 360), "upward in SVG coordinates");
  const n = LAYOUTS.nh3.positions;
  const ammonia = lonePairAngles(["h1", "h2", "h3"].map((h) => directionDegrees(n.n, n[h])), 1);
  assert.deepEqual(ammonia, [270]);
});
test("CO2 oxygen pairs keep the previously accepted +-60 degree placement", () => {
  assert.deepEqual(lonePairAngles([0], 2), [120, 240]);
  assert.deepEqual(lonePairAngles([180], 2).sort((a, b) => a - b), [60, 300]);
  const [t1, t2] = tangentPair(65, 110, 57, 240);
  const [e1, e2] = co2PairDots("o-left", "top", 65);
  assert.deepEqual([t1, t2], [e1, e2]);
});

test("history: undo and redo keep the evaluated chemistry consistent", () => {
  let h = createHistory(initialDiagram("h2o"));
  const steps = [(d) => advanceBond(d, "h1", "o", "bond"), (d) => advanceBond(d, "o", "h2", "bond"), (d) => editLonePairs(d, "o", "pair"), (d) => editLonePairs(d, "o", "pair")];
  const states = [h.present];
  for (const s of steps) { h = commit(h, s(h.present)); states.push(h.present); }
  assert.equal(evaluateLewis(h.present).code, "pass");
  h = undo(h);
  assert.equal(evaluateLewis(h.present).code, "electron-deficit");
  assert.equal(h.present, states[3]);
  h = redo(h);
  assert.equal(evaluateLewis(h.present).code, "pass");
  h = undo(undo(undo(undo(undo(h)))));
  assert.equal(h.present, states[0]);
  assert.equal(h.past.length, 0);
  assert.equal(undo(h), h);
});
test("history: a new edit clears redo, and a no-op edit is not recorded", () => {
  let h = commit(createHistory(initialDiagram("h2")), advanceBond(initialDiagram("h2"), "h1", "h2", "bond"));
  h = undo(h);
  assert.equal(h.future.length, 1);
  assert.equal(commit(h, h.present), h);
  h = commit(h, editLonePairs(h.present, "h1", "pair"));
  assert.equal(h.future.length, 0);
  const d = initialDiagram("h2");
  assert.equal(editLonePairs(d, "h1", "erase"), d, "erasing nothing changes nothing");
});
test("editor caps lone pairs at four instead of wrapping to zero", () => {
  let d = initialDiagram("h2o");
  for (let i = 0; i < 6; i++) d = editLonePairs(d, "o", "pair");
  assert.equal(d.atoms.find((a) => a.id === "o").lonePairs, 4);
});

test("feedback names the failing atoms and the electron arithmetic", () => {
  const d = build("hcn", { "h-c": 1, "c-n": 2 }, { n: 2 });
  const [zh, en] = diagnose(d, evaluateLewis(d));
  assert.match(zh, /C 周圍 6 個（應為 8）/);
  assert.match(en, /C has 6 \(needs 8\)/);
  const e = build("nh3", { "n-h1": 1, "n-h2": 1, "n-h3": 1 });
  assert.match(diagnose(e, evaluateLewis(e))[0], /8 個價電子.*6 個.*2 個/);
  const w = build("h2o", { "h1-o": 2, "o-h2": 1 }, { o: 1 });
  assert.match(diagnose(w, evaluateLewis(w))[0], /氫只能容納 2 個/);
  assert.match(diagnose(w, evaluateLewis(w))[0], /H₁/);
});
test("every code produces a bilingual message; hints and budget are species-specific", () => {
  const codes = new Set();
  for (const id of SPECIES_ORDER) {
    for (const d of [initialDiagram(id), { ...initialDiagram(id), charge: 1 }]) {
      const r = evaluateLewis(d); codes.add(r.code);
      const [zh, en] = diagnose(d, r);
      assert.ok(zh.length > 5 && en.length > 5);
    }
    assert.equal(hints(initialDiagram(id)).length, 3);
    assert.match(hints(initialDiagram(id))[0][0], new RegExp(SPECIES[id].formula));
  }
  assert.deepEqual([...codes].sort(), ["invalid-structure", "missing-bond"]);
  assert.match(budgetNote(initialDiagram("h2o"))[0], /H 1（×2）、O 6/);
});
