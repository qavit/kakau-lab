import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { catalogLabs, experimentalLabs, labRegistry, unlistedLabs } from "../lib/labs/registry.ts";

const requiredFields = ["id", "title", "subject", "description", "topics", "level", "status", "maturity", "visibility"];

test("registry ids are unique", () => {
  const ids = labRegistry.map((lab) => lab.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("registry numbers are unique", () => {
  const numbers = labRegistry.map((lab) => lab.number).filter((n) => n !== undefined);
  assert.equal(new Set(numbers).size, numbers.length);
});

test("registry numbers 01 through 10 are all present", () => {
  const numbers = new Set(labRegistry.map((lab) => lab.number));
  for (let n = 1; n <= 10; n += 1) {
    assert.ok(numbers.has(String(n).padStart(2, "0")), `missing number ${n}`);
  }
});

test("inventory holds labs 01-10 plus the uncatalogued FBD", () => {
  assert.equal(labRegistry.length, 11);
  const fbd = labRegistry.find((lab) => lab.id === "fbd");
  assert.ok(fbd);
  assert.equal(fbd.number, undefined);
  assert.deepEqual(fbd.implementation, { app: "kakau-lab", route: "/fbd" });
});

test("maturity and visibility matrix is exact", () => {
  const matrix = Object.fromEntries(labRegistry.map((lab) => [lab.id, `${lab.maturity}/${lab.visibility}`]));
  assert.deepEqual(matrix, {
    "solar-sphere": "beta/public",
    "magnetic-field-superposition": "prototype/unlisted",
    "planetary-wind-systems": "prototype/unlisted",
    "valley-bedding": "prototype/unlisted",
    "standard-atmosphere-profile": "beta/public",
    "coriolis-effect": "prototype/unlisted",
    "projectile-motion": "stable/public",
    "two-source-interference": "beta/public",
    electrostatics: "stable/public",
    "hydrogen-atom": "prototype/unlisted",
    fbd: "prototype/unlisted",
  });
});

test("catalogLabs selects exactly the five public non-prototype labs in product order", () => {
  assert.deepEqual(
    catalogLabs().map((lab) => lab.id),
    ["solar-sphere", "standard-atmosphere-profile", "projectile-motion", "two-source-interference", "electrostatics"],
  );
  const excluded = ["magnetic-field-superposition", "planetary-wind-systems", "valley-bedding", "coriolis-effect", "hydrogen-atom", "fbd"];
  assert.deepEqual(unlistedLabs().map((lab) => lab.id).sort(), [...excluded].sort());
});

test("catalog and sitemap logic no longer depend on legacy status", async () => {
  for (const file of ["../components/ModelCatalog.tsx", "../app/sitemap.ts"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /publishedLabs|\.status\b/, file);
  }
});

test("models 01-07 are internal kakau-lab routes", () => {
  const internal = labRegistry.filter((lab) => lab.number !== undefined && Number(lab.number) <= 7);
  assert.equal(internal.length, 7);
  for (const lab of internal) {
    assert.equal(lab.implementation.app, "kakau-lab");
    assert.ok(lab.implementation.route, `${lab.id} must have a route`);
  }
});

test("model 08 is the local kakau-lab interference route", () => {
  const model08 = labRegistry.find((lab) => lab.number === "08");
  assert.ok(model08);
  assert.equal(model08.id, "two-source-interference");
  assert.equal(model08.number, "08");
  assert.equal(model08.title, "雙點波源干涉");
  assert.equal(model08.implementation.app, "kakau-lab");
  assert.equal(model08.implementation.route, "/interference");
  assert.equal(model08.maturity, "beta");
  assert.equal(model08.visibility, "public");
  assert.equal(catalogLabs().includes(model08), true);
  assert.equal(model08.status, "published");
});

test("model 09 is the published local electrostatics route", () => {
  const model09 = labRegistry.find((lab) => lab.number === "09");
  assert.ok(model09);
  assert.equal(model09.id, "electrostatics");
  assert.equal(model09.title, "靜電學");
  assert.equal(model09.implementation.app, "kakau-lab");
  assert.equal(model09.implementation.route, "/electrostatics");
  assert.equal(model09.status, "published");
  assert.equal(catalogLabs().includes(model09), true);
  assert.deepEqual(experimentalLabs(), []);
});

test("every manifest carries the required fields", () => {
  for (const lab of labRegistry) {
    for (const field of requiredFields) {
      assert.ok(field in lab, `${lab.id ?? "<unknown>"} missing field ${field}`);
    }
    assert.ok(lab.topics.length > 0, `${lab.id} must have at least one topic`);
    assert.ok(lab.level.length > 0, `${lab.id} must have at least one level`);
  }
});

test("local implementations declare a route, external ones a valid https URL", () => {
  for (const lab of labRegistry) {
    if (lab.implementation.app === "kakau-lab") {
      assert.ok(lab.implementation.route, `${lab.id} (kakau-lab) must declare a route`);
      assert.match(lab.implementation.route, /^\//, `${lab.id} route must be absolute within the app`);
    } else {
      assert.ok(lab.implementation.url, `${lab.id} (kakau-web) must declare a url`);
      assert.match(lab.implementation.url, /^https:\/\//, `${lab.id} url must be https`);
    }
  }
});

test("registry module contains no React or lucide-react imports", async () => {
  const source = await readFile(new URL("../lib/labs/registry.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /^import .*"react"/m);
  assert.doesNotMatch(source, /^import .*"lucide-react"/m);
  assert.doesNotMatch(source, /^import .*"three"/m);
});

test("catalog derives its model count from the registry, not a hard-coded string", async () => {
  const source = await readFile(new URL("../components/ModelCatalog.tsx", import.meta.url), "utf8");
  assert.match(source, /labs\.length/);
  assert.doesNotMatch(source, /07 interactive models/);
});
