// Gate C3 helper: captures same-condition screenshots of Front (reference) and Lab. Usage: node scripts/c3-capture.mjs <front|lab> <outDir> <baseUrl>
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const [site, out, base] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const sel = site === "front"
  ? { plot: "[data-lab-plot]", toggle: '[data-action="toggle-sidebar"]', root: "[data-lab-root]", wait: "[data-lab-plot] canvas" }
  : { plot: "[data-interference-plot]", toggle: '[data-action="toggle-activities"]', root: '[data-testid="interference-host"]', wait: "[data-interference-plot] canvas" };
const path = site === "front" ? "/lab/interference" : "/interference";
const sizes = { "desktop-1440": [1440, 900], "desktop-1280": [1280, 800], "tablet-768": [768, 1024], "mobile-390": [390, 844], "narrow-320": [320, 720] };
const browser = await chromium.launch();
async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: "reduce", colorScheme: "light" });
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForSelector(sel.wait);
  await page.waitForTimeout(700);
  return page;
}
const shot = async (page, name, full = true) => page.screenshot({ path: `${out}/${name}.png`, fullPage: full });
const sidebarOpen = async (page) => (await page.locator(sel.toggle).first().getAttribute("aria-expanded")) === "true";
for (const [key, [w, h]] of Object.entries(sizes)) {
  const page = await open(w, h);
  await shot(page, `${key}-default`, w < 1024);
  if (w >= 1024) {
    if (!(await sidebarOpen(page))) await page.locator(sel.toggle).first().click();
    await page.waitForTimeout(300);
    await shot(page, `${key}-activities-open`, false);
    await page.locator(sel.toggle).first().click(); await page.waitForTimeout(300);
    await shot(page, `${key}-activities-closed`, false);
    if (!(await sidebarOpen(page))) await page.locator(sel.toggle).first().click();
  }
  // place P on the plot
  const box = await page.locator(sel.plot).boundingBox();
  await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.3);
  await page.waitForTimeout(400);
  await shot(page, `${key}-point-placed`, w < 1024);
  await page.context().close();
}
await browser.close();
