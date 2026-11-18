// Mobile workspace measurement (Owner Decision Pack). Run from the repo root against a running server:
//   BASE_URL=http://localhost:3100 node docs/qa/2026-11-18-projectile-baseline/mobile-pack/measure.mjs [base|A|B|C ...]
// Prototype = a CSS overlay injected into the REAL page (no product code changed); `base` = no overlay.
import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || "http://localhost:3000";
const VIEWPORTS = [[360, 800], [390, 844], [320, 640], [844, 390]];
const protos = process.argv.slice(2).length ? process.argv.slice(2) : ["base"];

async function css(proto) { return proto === "base" ? "" : readFile(resolve(HERE, "prototypes", `${proto}.css`), "utf8"); }
async function inject(page, proto) {
  if (proto === "base") return;
  await page.addStyleTag({ content: await css(proto) });
  try { await page.addScriptTag({ content: await readFile(resolve(HERE, "prototypes", `${proto}.js`), "utf8") }); } catch {}
}
const frac = page => page.evaluate(() => {
  const vis = e => e.checkVisibility() && !e.closest("[inert],[aria-hidden='true']");
  const svg = [...document.querySelectorAll(".projectile-path-card .canvas-host > svg")].find(vis);
  if (!svg) return { canvasPx: 0, canvasVisiblePct: 0, canvasTop: null };
  const r = svg.getBoundingClientRect();
  const vh = innerHeight, vw = innerWidth;
  const ih = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
  const iw = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
  return { canvasPx: Math.round(r.width) + "x" + Math.round(r.height), canvasVisiblePct: Math.round(100 * ih * iw / (r.width * r.height)), canvasVisiblePx: Math.round(ih), canvasTop: Math.round(r.top) };
});
const inView = (page, selector) => page.evaluate((sel) => {
  const e = [...document.querySelectorAll(sel)].find(x => x.checkVisibility() && !x.closest("[inert],[aria-hidden='true']"));
  if (!e) return null; const r = e.getBoundingClientRect();
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), fullyInViewport: r.top >= 0 && r.bottom <= innerHeight };
}, selector);
const val = (page, sel) => page.locator(sel).first().inputValue().catch(() => null);
const SPEED = 'label:has-text("發射速度") input[type=range]', ANGLE = 'label:has-text("發射角") input[type=range]', CURSOR = 'input[aria-label="時間游標"]';
const setRange = (page, sel, v) => page.locator(sel + ":visible").first().fill(String(v));

async function open(browser, [w, h], proto) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 500 || h < 500, isMobile: w < 500 || h < 500 });
  const page = await ctx.newPage();
  await page.goto(BASE + "/projectile");
  await page.waitForSelector('main[data-interactive="true"]');
  await inject(page, proto);
  await page.waitForTimeout(250);
  return { ctx, page };
}

// Pause without scrolling the page (a real click on an off-screen 暫停 would scroll and bias the layout measurements).
const pause = page => page.locator('button[aria-label="暫停"]').first().dispatchEvent("click").catch(() => {});
const out = {};
const browser = await chromium.launch();
for (const proto of protos) {
  out[proto] = {};
  for (const vp of VIEWPORTS) {
    const key = `${vp[0]}x${vp[1]}`, tag = `${proto}-${key}`, m = {};
    const { ctx, page } = await open(browser, vp, proto);
    // M1 initial
    m.initial = { ...(await frac(page)), readoutKeyRow: await inView(page, ".projectile-readout .live"), transport: await inView(page, ".projectile-transport"), scrollH: await page.evaluate(() => document.documentElement.scrollHeight), vh: vp[1] };
    await page.screenshot({ path: resolve(HERE, "shots", `${tag}-1-initial.png`) });
    await pause(page);
    // M2 open params: can the student see canvas AND the control together?
    await page.getByRole("button", { name: "參數", exact: true }).click(); await page.waitForTimeout(450);
    const sp = await page.locator(SPEED + ":visible").first().boundingBox();
    m.paramsOpen = { ...(await frac(page)), speedSliderInViewport: !!sp && sp.y >= 0 && sp.y + sp.height <= vp[1], speedSliderY: sp && Math.round(sp.y), readoutKeyRow: await inView(page, ".projectile-readout .live"), scrollY: await page.evaluate(() => Math.round(scrollY)) };
    // M3 edit a parameter, then look again
    await setRange(page, SPEED, 31); await page.waitForTimeout(250);
    m.afterEdit = { ...(await frac(page)), readoutKeyRow: await inView(page, ".projectile-readout .live"), scrollY: await page.evaluate(() => Math.round(scrollY)) };
    await page.screenshot({ path: resolve(HERE, "shots", `${tag}-2-params-edit.png`) });
    // M4 preset: clicks from fresh load (executed)
    let clicks = 0; const click = async (name) => { await page.getByRole("button", { name, exact: true }).first().click(); clicks++; };
    await page.reload(); await page.waitForSelector('main[data-interactive="true"]'); await inject(page, proto);
    await pause(page);
    const shortcut = page.locator(".projectile-panel-actions button").filter({ hasText: /^預設$/ });
    if (await shortcut.count()) { await shortcut.first().click(); clicks++; await click("月球重力"); }
    else { await click("參數"); await click("教學預設"); await click("月球重力"); } await page.waitForTimeout(350);
    m.preset = { clicksFromFreshLoad: clicks, ...(await frac(page)), readoutKeyRow: await inView(page, ".projectile-readout .live") };
    await page.screenshot({ path: resolve(HERE, "shots", `${tag}-3-after-preset.png`) });
    // M5 rotation: set a distinctive state, rotate there and back, compare
    await page.reload(); await page.waitForSelector('main[data-interactive="true"]'); await inject(page, proto);
    await pause(page);
    await page.getByRole("button", { name: "參數", exact: true }).click(); await page.waitForTimeout(300);
    await setRange(page, SPEED, 27); await setRange(page, ANGLE, 52);
    await page.locator(CURSOR).fill("0.7");
    const snap = async () => ({ speed: await val(page, SPEED), angle: await val(page, ANGLE), cursor: await val(page, CURSOR), paramsPanelVisible: !!(await page.locator(SPEED + ":visible").count()), ...(await frac(page)) });
    const before = await snap();
    await page.setViewportSize({ width: vp[1], height: vp[0] }); await page.waitForTimeout(500);
    const rotated = await snap();
    await page.screenshot({ path: resolve(HERE, "shots", `${tag}-4-rotated.png`) });
    await page.setViewportSize({ width: vp[0], height: vp[1] }); await page.waitForTimeout(500);
    const back = await snap();
    m.rotation = { before, rotated, back, stateKept: before.speed === back.speed && before.angle === back.angle && before.cursor === back.cursor && before.speed === rotated.speed && before.angle === rotated.angle && before.cursor === rotated.cursor, panelKept: before.paramsPanelVisible === rotated.paramsPanelVisible && before.paramsPanelVisible === back.paramsPanelVisible };
    out[proto][key] = m; await ctx.close();
  }
}
await browser.close();
const file = resolve(HERE, "data", `${protos.join("+")}.json`);
await writeFile(file, JSON.stringify({ baseUrl: BASE.replace(/\/\/.*@/, "//"), when: new Date().toISOString(), results: out }, null, 2));
console.log("wrote", file);
