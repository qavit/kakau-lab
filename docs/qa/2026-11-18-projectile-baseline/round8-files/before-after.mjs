// Before/After measurement for the Owner-approved mobile workspace change (A: 844×390 landscape, B: phone preset shortcut).
// Both builds must be running: BEFORE = the commit before the change (9f92792, no product change), AFTER = the new head.
//   BEFORE_URL=http://localhost:3200 AFTER_URL=http://localhost:3100 node docs/qa/2026-11-18-projectile-baseline/round8-files/before-after.mjs
// Writes data/before-after.json and shots/{before,after}-<viewport>-<state>.png next to this file. Chromium (touch emulation), not a real device.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILDS = { before: process.env.BEFORE_URL || "http://localhost:3200", after: process.env.AFTER_URL || "http://localhost:3100" };
const VIEWPORTS = [[360, 800], [390, 844], [320, 640], [844, 390], [1366, 768], [1280, 720]];
await mkdir(resolve(HERE, "shots"), { recursive: true }); await mkdir(resolve(HERE, "data"), { recursive: true });

const canvas = (page) => page.evaluate(() => {
  const vis = (e) => e.checkVisibility() && !e.closest("[inert],[aria-hidden='true']");
  const svg = [...document.querySelectorAll(".projectile-path-card .canvas-host > svg")].find(vis);
  if (!svg) return null;
  const r = svg.getBoundingClientRect();
  const ih = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)), iw = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
  return { size: `${Math.round(r.width)}x${Math.round(r.height)}`, visiblePct: Math.round((100 * ih * iw) / (r.width * r.height)), top: Math.round(r.top) };
});
const inView = (page, sel) => page.evaluate((s) => {
  const e = [...document.querySelectorAll(s)].find((x) => x.checkVisibility() && !x.closest("[inert],[aria-hidden='true']"));
  if (!e) return null; const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight;
}, sel);
const sliderInView = (page) => page.evaluate(() => {
  const l = [...document.querySelectorAll("label")].find((x) => x.textContent.includes("發射速度") && x.checkVisibility());
  if (!l) return null; const r = l.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight;
});
const lastItem = (page, sel) => page.evaluate((s) => {
  const list = [...document.querySelectorAll(s)].find((x) => x.checkVisibility()); if (!list) return null;
  const el = list.querySelector("button:last-of-type"); el.scrollIntoView({ block: "nearest" });
  const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { text: el.textContent.trim(), fullyInViewport: r.top >= 0 && r.bottom <= innerHeight, notCovered: top === el || el.contains(top) };
}, sel);

const out = {};
const browser = await chromium.launch();
for (const [build, base] of Object.entries(BUILDS)) {
  for (const [w, h] of VIEWPORTS) {
    const phone = w < 700 || h < 500;
    const key = `${w}x${h}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: phone, isMobile: phone });
    const page = await ctx.newPage();
    await page.goto(base + "/projectile"); await page.waitForSelector('main[data-interactive="true"]');
    await page.locator('button[aria-label="暫停"]').first().dispatchEvent("click");
    const bar = page.locator(".projectile-panel-actions");
    const rec = (out[key] ||= {})[build] = {};
    rec.initial = { canvas: await canvas(page), readoutInView: await inView(page, ".projectile-readout"), transportInView: await inView(page, ".projectile-transport"), hScroll: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1) };
    await page.screenshot({ path: resolve(HERE, "shots", `${build}-${key}-1-initial.png`) });
    await bar.getByRole("button", { name: "參數", exact: true }).click(); await page.waitForTimeout(350);
    rec.paramsOpen = { canvas: await canvas(page), sliderInView: await sliderInView(page), readoutInView: await inView(page, ".projectile-readout"), playInView: await inView(page, 'button[aria-label="播放"], button[aria-label="暫停"]') };
    await page.screenshot({ path: resolve(HERE, "shots", `${build}-${key}-2-params.png`) });
    // Preset: count operations from a fresh page to apply the LAST preset (月球重力).
    await page.goto(base + "/projectile"); await page.waitForSelector('main[data-interactive="true"]');
    await page.locator('button[aria-label="暫停"]').first().dispatchEvent("click");
    let ops = 0;
    const shortcut = bar.getByRole("button", { name: "預設", exact: true });
    if (await shortcut.isVisible().catch(() => false)) {
      await shortcut.click(); ops++;
      rec.presetListLastItem = await lastItem(page, "#projectile-preset-sheet");
      await page.screenshot({ path: resolve(HERE, "shots", `${build}-${key}-3-preset-list.png`) });
      await page.locator("#projectile-preset-sheet").getByRole("button", { name: "月球重力", exact: true }).click(); ops++;
      rec.presetPath = "預設 → 月球重力";
    } else {
      await bar.getByRole("button", { name: "參數", exact: true }).click(); ops++;
      await page.getByRole("button", { name: "教學預設", exact: true }).click(); ops++;
      await page.waitForTimeout(250);
      rec.presetListLastItem = await lastItem(page, ".projectile-menu-list");
      await page.screenshot({ path: resolve(HERE, "shots", `${build}-${key}-3-preset-list.png`) });
      await page.locator(".projectile-menu-list").getByRole("button", { name: "月球重力", exact: true }).click(); ops++;
      rec.presetPath = "參數 → 教學預設 → 月球重力";
    }
    rec.presetOperations = ops;
    // Expanded view (immersion) and rotation retention
    await page.goto(base + "/projectile"); await page.waitForSelector('main[data-interactive="true"]');
    await bar.getByRole("button", { name: "放大視圖", exact: true }).click(); await page.waitForTimeout(400);
    rec.expanded = { canvas: await canvas(page), dockInView: await inView(page, ".projectile-dock") };
    await page.screenshot({ path: resolve(HERE, "shots", `${build}-${key}-4-expanded.png`) });
    await ctx.close();
  }
}
await browser.close();
await writeFile(resolve(HERE, "data", "before-after.json"), JSON.stringify(out, null, 2));
const row = (k, b) => { const r = out[k][b]; return `${r.initial.canvas?.size}/${r.initial.canvas?.visiblePct}% | ${r.paramsOpen.canvas?.size}/${r.paramsOpen.canvas?.visiblePct}% | slider ${r.paramsOpen.sliderInView} | ops ${r.presetOperations} | last ${JSON.stringify(r.presetListLastItem?.fullyInViewport)}/${JSON.stringify(r.presetListLastItem?.notCovered)} | exp ${r.expanded.canvas?.size}`; };
for (const k of Object.keys(out)) { console.log(k, "BEFORE", row(k, "before")); console.log(k, "AFTER ", row(k, "after")); }
