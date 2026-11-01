import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [page, catalog, css, registry, globals] = await Promise.all([
  read("../app/page.tsx"),
  read("../components/ModelCatalog.tsx"),
  read("../app/catalog-c2.css"),
  read("../lib/labs/registry.ts"),
  read("../app/globals.css"),
]);

test("A1 opts in only on catalog route, leaving model workspaces unchanged", () => {
  assert.match(page, /import ["']\.\/catalog-c2\.css["']/);
  assert.match(page, /return <ModelCatalog \/>/);
  assert.match(catalog, /<main className="catalog-shell catalog-c2">/);
  assert.doesNotMatch(globals, /catalog-c2/);
  assert.doesNotMatch(css, /:root\s*\{|\.lab-shell\s*\{|\.projectile-lab\s*\{/);
});

test("A1 preserves catalog eligibility and model links", () => {
  assert.match(catalog, /const labs = catalogLabs\(\)/);
  assert.match(registry, /lab\.visibility === "public" && lab\.maturity !== "prototype"/);
  assert.match(catalog, /lab\.implementation\.app === "kakau-lab" \? lab\.implementation\.route : lab\.implementation\.url/);
  assert.match(catalog, /labs\.map\(\(lab\) => <ModelCard lab=\{lab\} key=\{lab\.id\} \/>\)/);
  assert.match(catalog, /process\.env\.KAKAU_EXPERIMENTAL_PREVIEW === "1"/);
});

test("A1 retains existing previews, semantics, navigation and appearance toggle", () => {
  for (const marker of ["model-card-preview", "layers-card-art", "projectile-card-art", "model-card-tags", "catalog-title", "catalog-principle"]) {
    assert.ok(catalog.includes(marker), "missing catalog marker: " + marker);
  }
  assert.match(catalog, /<ThemeToggle \/>/);
  assert.match(catalog, /<KakauLabMark \/>/);
  assert.match(catalog, /<h1>把看不見的規律/);
  assert.match(catalog, /<Link href=\{href\} className=\{className\}>/);
});

test("A1 has explicit light/dark and system-dark tokens without changing other routes", () => {
  assert.match(css, /body:has\(\.catalog-c2\)/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)/);
  assert.match(css, /html:not\(\[data-mode\]\) \.catalog-c2/);
  assert.match(css, /html\[data-mode="dark"\] \.catalog-c2/);
  assert.match(css, /--lc-text: #16181d/);
  assert.match(css, /--lc-text: #edeef0/);
  assert.match(css, /--lc-focus: #0b6b66/);
  assert.match(css, /--lc-focus: #5fd3cb/);
});

test("A1 includes keyboard focus, 44px controls, mobile cards and reduced-motion", () => {
  assert.match(css, /:is\(a, button\):focus-visible/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /min-width: 44px/);
  assert.match(css, /@media \(max-width: 660px\)/);
  assert.match(css, /\.catalog-c2 \.model-card \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("A1 keeps gold decorative and scientific artwork untouched", () => {
  assert.match(css, /\.catalog-c2 \.catalog-principle::before/);
  assert.match(css, /background: #d8951d/);
  assert.doesNotMatch(css, /\.catalog-c2 \.model-card-art\s*\{[^}]*background:/);
  assert.doesNotMatch(css, /\.catalog-c2 \.projectile-card-path/);
  assert.doesNotMatch(css, /\.catalog-c2 \.coriolis-card-path/);
});
