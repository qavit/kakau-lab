// Prototype sanity in states beyond free-exploration: guided predict and layer drawer. Saves screenshots to shots/.
import { chromium } from "playwright"; import { readFile } from "node:fs/promises"; import { dirname, resolve } from "node:path"; import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url)); const BASE = process.env.BASE_URL || "http://localhost:3100";
const b = await chromium.launch();
for (const [proto, vps] of [["base", [[360, 800], [844, 390]]], ["A", [[360, 800], [844, 390]]], ["C", [[360, 800], [844, 390]]]]) for (const [w, h] of vps) for (const st of ["guided", "layers"]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  await p.goto(BASE + "/projectile"); await p.waitForSelector('main[data-interactive="true"]');
  if (proto !== "base") { await p.addStyleTag({ content: await readFile(resolve(HERE, "prototypes", proto + ".css"), "utf8") }); }
  await p.locator('button[aria-label="暫停"]').first().dispatchEvent("click");
  if (st === "guided") await p.getByRole("button", { name: "探索任務", exact: true }).click(); else await p.getByRole("button", { name: "圖層", exact: true }).click();
  await p.waitForTimeout(600);
  const m = await p.evaluate(() => { const svg = [...document.querySelectorAll(".projectile-path-card .canvas-host > svg")].find(e => e.checkVisibility()); const r = svg?.getBoundingClientRect(); return { canvas: r ? `${Math.round(r.width)}x${Math.round(r.height)} top=${Math.round(r.top)}` : null, hOverflow: document.documentElement.scrollWidth > innerWidth + 1, scrollH: document.documentElement.scrollHeight }; });
  console.log(proto, `${w}x${h}`, st, JSON.stringify(m));
  await p.screenshot({ path: resolve(HERE, "shots", `${proto}-${w}x${h}-5-${st}.png`) }); await ctx.close();
}
await b.close();
