/**
 * Vendors MathJax's standalone SVG bundle into `public/` before dev and build.
 *
 * Self-hosted rather than loaded from a CDN so the model works with no third-party runtime
 * dependency — including offline, which matters for a teaching tool used in a classroom. The SVG
 * output is chosen over CHTML because it needs no accompanying web fonts, so this one file is the
 * whole of it. It is copied rather than committed, since it is 2 MB of build output.
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const packageDirectory = dirname(require.resolve("mathjax-full/package.json"));
const source = join(packageDirectory, "es5", "tex-svg.js");
const targetDirectory = join(process.cwd(), "public", "mathjax");

await mkdir(targetDirectory, { recursive: true });
await copyFile(source, join(targetDirectory, "tex-svg.js"));

// The minified bundle carries no license header, and Apache-2.0 asks redistributors to ship the
// license text. Serve it (and a short attribution) next to the bundle so deployed output has both.
await copyFile(join(packageDirectory, "LICENSE"), join(targetDirectory, "LICENSE"));
await writeFile(
  join(targetDirectory, "NOTICE.txt"),
  [
    "tex-svg.js is the MathJax standalone SVG bundle (mathjax-full), https://www.mathjax.org/,",
    "distributed under the Apache License 2.0; the license text is in the LICENSE file beside it.",
    "The bundle may include code from other Apache-2.0 packages that MathJax depends on",
    "(for example speech-rule-engine, mhchemparser and mj-context-menu).",
    "Upstream publishes no separate NOTICE file for this package.",
    "",
  ].join("\n"),
);
console.log("copied mathjax tex-svg.js, LICENSE and NOTICE.txt into public/mathjax/");
