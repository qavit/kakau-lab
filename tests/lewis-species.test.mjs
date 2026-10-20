import test from "node:test";
import assert from "node:assert/strict";
import { initialDiagram, setBondOrder, setLonePairs, evaluateLewis } from "../models/chemistry/lewis.ts";
import { SPECIES, SPECIES_ORDER, valenceTotal, atomLabel } from "../models/chemistry/lewis-species.ts";
import { octetInspection } from "../models/chemistry/lewis-placement.ts";

import { build } from "./fixtures/lewis-build.mjs";
// Reviewed dominant structures, as learner graphs.
const CORRECT = {
  h2o: { bonds: { "h1-o": 1, "o-h2": 1 }, pairs: { o: 2 }, valence: 8, shells: { h1: 2, o: 8, h2: 2 } },
  ch4: { bonds: { "c-h1": 1, "c-h2": 1, "c-h3": 1, "c-h4": 1 }, pairs: {}, valence: 8, shells: { c: 8, h1: 2, h2: 2, h3: 2, h4: 2 } },
  nh3: { bonds: { "n-h1": 1, "n-h2": 1, "n-h3": 1 }, pairs: { n: 1 }, valence: 8, shells: { n: 8, h1: 2, h2: 2, h3: 2 } },
  h2: { bonds: { "h1-h2": 1 }, pairs: {}, valence: 2, shells: { h1: 2, h2: 2 } },
  hcn: { bonds: { "h-c": 1, "c-n": 3 }, pairs: { n: 1 }, valence: 10, shells: { h: 2, c: 8, n: 8 } },
  co2: { bonds: { "o-left-c": 2, "c-o-right": 2 }, pairs: { "o-left": 2, "o-right": 2 }, valence: 16, shells: { "o-left": 8, c: 8, "o-right": 8 } },
};
const correct = (id) => build(id, CORRECT[id].bonds, CORRECT[id].pairs);

test("catalogue covers all six practice species", () => {
  assert.deepEqual([...SPECIES_ORDER].sort(), Object.keys(CORRECT).sort());
  assert.deepEqual(SPECIES_ORDER.slice(0, 5), ["h2o", "ch4", "nh3", "h2", "hcn"]);
});

for (const id of SPECIES_ORDER) {
  const fx = CORRECT[id];
  test(`${id}: valence total, shells, formal charges and PASS`, () => {
    assert.equal(valenceTotal(SPECIES[id]), fx.valence);
    const r = evaluateLewis(correct(id));
    assert.equal(r.code, "pass");
    assert.equal(r.usedElectrons, fx.valence);
    assert.equal(r.expectedElectrons, fx.valence);
    assert.deepEqual(r.shells, fx.shells);
    assert.ok(Object.values(r.formalCharges).every((q) => q === 0));
    assert.equal(Object.values(r.formalCharges).reduce((a, b) => a + b, 0), 0);
  });
  test(`${id}: fresh task starts with no bonds or lone pairs`, () => {
    const d = initialDiagram(id);
    assert.ok(d.bonds.every((b) => b.order === 0));
    assert.ok(d.atoms.every((a) => a.lonePairs === 0));
    assert.equal(evaluateLewis(d).code, "missing-bond");
  });
  test(`${id}: atom order, bond direction and bond order in the array do not matter`, () => {
    const d = correct(id);
    const shuffled = { ...d, atoms: [...d.atoms].reverse(), bonds: [...d.bonds].reverse().map((b) => ({ a: b.b, b: b.a, order: b.order })) };
    assert.equal(evaluateLewis(shuffled).code, "pass");
  });
  test(`${id}: removing an electron pair is an electron deficit; adding one is an excess`, () => {
    const d = correct(id);
    const bond = d.bonds.find((b) => b.order > 1) ?? d.bonds[0];
    const lone = d.atoms.find((a) => a.lonePairs > 0);
    const less = lone ? setLonePairs(d, lone.id, lone.lonePairs - 1) : setBondOrder(d, bond.a, bond.b, bond.order - 1);
    if (!lone && bond.order === 1) assert.equal(evaluateLewis(less).code, "missing-bond");
    else assert.equal(evaluateLewis(less).code, "electron-deficit");
    const target = d.atoms[0];
    assert.equal(evaluateLewis(setLonePairs(d, target.id, target.lonePairs + 1)).code, "electron-excess");
  });
  test(`${id}: octet inspector uses duet for H and octet otherwise`, () => {
    const d = correct(id);
    for (const a of d.atoms) {
      const i = octetInspection(d, a.id);
      assert.equal(i.target, a.element === "H" ? 2 : 8);
      assert.equal(i.total, CORRECT[id].shells[a.id]);
    }
  });
}

// [species, bonds, pairs, expected code, expected problem atoms]
const WRONG = [
  ["h2o", {}, {}, "missing-bond", []],
  ["h2o", { "h1-o": 1, "o-h2": 1 }, { o: 1 }, "electron-deficit", []],
  ["h2o", { "h1-o": 1, "o-h2": 1 }, { o: 3 }, "electron-excess", []],
  ["h2o", { "h1-o": 2, "o-h2": 1 }, { o: 1 }, "duet", ["h1"]],
  ["ch4", { "c-h1": 1, "c-h2": 1, "c-h3": 1, "c-h4": 1 }, { c: 1 }, "electron-excess", []],
  ["ch4", { "c-h1": 1, "c-h2": 1, "c-h3": 1, "c-h4": 0 }, {}, "missing-bond", []],
  ["ch4", { "c-h1": 1, "c-h2": 1, "c-h3": 1, "c-h4": 1 }, { h1: 1 }, "electron-excess", []],
  ["ch4", { "c-h1": 2, "c-h2": 1, "c-h3": 1, "c-h4": 1 }, {}, "electron-excess", []],
  ["nh3", { "n-h1": 1, "n-h2": 1, "n-h3": 1 }, {}, "electron-deficit", []],
  ["nh3", { "n-h1": 1, "n-h2": 1, "n-h3": 1 }, { n: 2 }, "electron-excess", []],
  ["nh3", { "n-h1": 2, "n-h2": 1, "n-h3": 1 }, {}, "duet", ["h1"]],
  ["h2", { "h1-h2": 2 }, {}, "electron-excess", []],
  ["h2", { "h1-h2": 1 }, { h1: 1 }, "electron-excess", []],
  ["h2", { "h1-h2": 0 }, {}, "missing-bond", []],
  ["hcn", { "h-c": 1, "c-n": 2 }, { n: 2 }, "octet", ["c"]],
  ["hcn", { "h-c": 1, "c-n": 3 }, {}, "electron-deficit", []],
  ["hcn", { "h-c": 1, "c-n": 3 }, { n: 2 }, "electron-excess", []],
  ["hcn", { "h-c": 1, "c-n": 1 }, { n: 3, c: 0 }, "octet", ["c"]],
  ["co2", { "o-left-c": 1, "c-o-right": 1 }, { "o-left": 3, "o-right": 3 }, "octet", ["c"]],
  ["co2", { "o-left-c": 3, "c-o-right": 1 }, { "o-left": 1, "o-right": 3 }, "formal-charge", ["o-left", "o-right"]],
];
for (const [id, bonds, pairs, code, problems] of WRONG) {
  test(`${id} diagnoses ${code}: ${JSON.stringify(bonds)} ${JSON.stringify(pairs)}`, () => {
    const r = evaluateLewis(build(id, bonds, pairs));
    assert.equal(r.code, code);
    assert.equal(r.pass, false);
    if (problems.length) assert.deepEqual(r.problemAtoms, problems);
  });
}

test("a graph that is not the task skeleton is invalid, whatever its coordinates or ids", () => {
  const hcn = correct("hcn");
  const wrongSkeleton = { ...hcn, bonds: [{ a: "h", b: "n", order: 1 }, { a: "c", b: "n", order: 3 }] };
  assert.equal(evaluateLewis(wrongSkeleton).code, "invalid-structure");
  const wrongElement = { ...hcn, atoms: hcn.atoms.map((a) => (a.id === "n" ? { ...a, element: "O" } : a)) };
  assert.equal(evaluateLewis(wrongElement).code, "invalid-structure");
  const unknown = { ...hcn, speciesId: "benzene" };
  assert.equal(evaluateLewis(unknown).code, "invalid-structure");
});
test("hydrogens of H2O / CH4 are interchangeable even when ids are exchanged", () => {
  const d = build("ch4", { "c-h1": 1, "c-h2": 1, "c-h3": 1, "c-h4": 1 });
  const swap = { h1: "h4", h4: "h1", h2: "h3", h3: "h2" };
  const renamed = { ...d, atoms: d.atoms.map((a) => ({ ...a, id: swap[a.id] ?? a.id })), bonds: d.bonds.map((b) => ({ ...b, a: swap[b.a] ?? b.a, b: swap[b.b] ?? b.b })) };
  assert.equal(evaluateLewis(renamed).code, evaluateLewis(d).code);
});
test("atomLabel disambiguates repeated elements only", () => {
  assert.equal(atomLabel(SPECIES.h2o, "o"), "O");
  assert.equal(atomLabel(SPECIES.h2o, "h2"), "H₂");
  assert.equal(atomLabel(SPECIES.hcn, "h"), "H");
});
