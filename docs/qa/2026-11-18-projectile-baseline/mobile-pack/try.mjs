// Operate a prototype yourself (headed browser, real app + overlay). Needs the app running:  npm run dev   (or  npx vinext start)
//   BASE_URL=http://localhost:3000 node docs/qa/2026-11-18-projectile-baseline/mobile-pack/try.mjs <base|A|B|C> [WxH]
// Default viewport 360x800. Rotate with the buttons at the bottom of the page (swaps width/height; state is kept).
import { chromium } from "playwright"; import { readFile } from "node:fs/promises"; import { dirname, resolve } from "node:path"; import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url)); const proto = process.argv[2] || "base"; const [w, h] = (process.argv[3] || "360x800").split("x").map(Number);
const b = await chromium.launch({ headless: false }); const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
const inject = async () => { if (proto === "base") return; await p.addStyleTag({ content: await readFile(resolve(HERE, "prototypes", proto + ".css"), "utf8") }); try { await p.addScriptTag({ content: await readFile(resolve(HERE, "prototypes", proto + ".js"), "utf8") }); } catch {} };
await p.goto((process.env.BASE_URL || "http://localhost:3000") + "/projectile"); await p.waitForSelector('main[data-interactive="true"]'); await inject();
await p.exposeFunction("__rotate", async () => { const v = p.viewportSize(); await p.setViewportSize({ width: v.height, height: v.width }); });
await p.evaluate(() => { const bt = document.createElement("button"); bt.textContent = "⟲ rotate"; bt.style.cssText = "position:fixed;right:4px;top:4px;z-index:99999;font-size:11px;padding:2px 6px;opacity:.6"; bt.onclick = () => window.__rotate(); document.body.append(bt); });
console.log(`Prototype ${proto} @ ${w}x${h} — close the window to exit. (Overlay is lost on reload.)`); await new Promise((r) => b.on("disconnected", r));
