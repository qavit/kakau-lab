// Quick look: BASE_URL=... node shot.mjs <proto|base> <WxH> <out.png> [params|presets]
import { chromium } from "playwright"; import { readFile } from "node:fs/promises"; import { dirname, resolve } from "node:path"; import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url)); const [proto, vp, out, act] = process.argv.slice(2); const [w, h] = vp.split("x").map(Number);
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 500 || h < 500 }); const p = await ctx.newPage();
await p.goto((process.env.BASE_URL || "http://localhost:3100") + "/projectile"); await p.waitForSelector('main[data-interactive="true"]');
if (proto !== "base") { await p.addStyleTag({ content: await readFile(resolve(HERE, "prototypes", proto + ".css"), "utf8") }); try { await p.addScriptTag({ content: await readFile(resolve(HERE, "prototypes", proto + ".js"), "utf8") }); } catch {} }
await p.locator('button[aria-label="暫停"]').first().dispatchEvent("click").catch(() => {}); await p.waitForTimeout(300);
if (act === "params") { await p.getByRole("button", { name: "參數", exact: true }).click(); await p.waitForTimeout(500); }
await p.screenshot({ path: out }); await b.close();
