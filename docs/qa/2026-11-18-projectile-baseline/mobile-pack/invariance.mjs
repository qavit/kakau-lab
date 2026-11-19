// Do the prototype overlays change anything outside their target viewports? Compares key element rects, base vs overlay.
//   BASE_URL=http://localhost:3100 node docs/qa/2026-11-18-projectile-baseline/mobile-pack/invariance.mjs
import { chromium } from "playwright"; import { readFile, writeFile } from "node:fs/promises"; import { dirname, resolve } from "node:path"; import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url)); const BASE = process.env.BASE_URL || "http://localhost:3100";
const VPS = [[1440, 900], [1366, 768], [1280, 720], [1024, 768], [768, 1024], [900, 600], [640, 360]]; // none is a target of A/B/C except possibly 640x360 (existing short-screen rules)
const SEL = [".projectile-topbar", ".projectile-subbar", ".projectile-stage", ".projectile-path-card", ".projectile-dock", ".projectile-readout", ".projectile-panel-actions"];
const b = await chromium.launch(); const out = {};
for (const proto of ["A", "B", "C"]) {
  const css = await readFile(resolve(HERE, "prototypes", proto + ".css"), "utf8"); let js = ""; try { js = await readFile(resolve(HERE, "prototypes", proto + ".js"), "utf8"); } catch {}
  for (const [w, h] of VPS) {
    const rects = async (overlay) => { const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); await p.goto(BASE + "/projectile"); await p.waitForSelector('main[data-interactive="true"]');
      if (overlay) { await p.addStyleTag({ content: css }); if (js) await p.addScriptTag({ content: js }); }
      await p.locator('button[aria-label="暫停"]').first().dispatchEvent("click"); await p.waitForTimeout(300);
      const r = await p.evaluate((sels) => Object.fromEntries(sels.map((s) => { const e = document.querySelector(s); if (!e) return [s, null]; const q = e.getBoundingClientRect(); return [s, [Math.round(q.x), Math.round(q.y + scrollY), Math.round(q.width), Math.round(q.height)]]; })), SEL);
      await ctx.close(); return r; };
    const a = await rects(false), o = await rects(true);
    const diffs = SEL.filter((s) => JSON.stringify(a[s]) !== JSON.stringify(o[s]));
    // B adds one extra button to the tool bar on phones only; on these viewports it is expected to be absent or equal.
    (out[proto] ||= {})[`${w}x${h}`] = { identical: diffs.length === 0, differing: diffs };
  }
}
await b.close(); await writeFile(resolve(HERE, "data", "invariance.json"), JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 1));
