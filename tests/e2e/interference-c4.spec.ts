import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

// Gate C4 regressions. Geometry assertions (not pixel baselines) so they hold across machines.
const evidenceDir = "docs/audits/interference-gate-c4-20261029";
const shot = async (page: Page, name: string, selector?: string) => {
  await mkdir(evidenceDir, { recursive: true });
  const path = `${evidenceDir}/${name}.png`;
  if (selector) await page.locator(selector).first().screenshot({ path }); else await page.screenshot({ path });
};
const open = async (page: Page, width: number, height: number) => {
  await page.setViewportSize({ width, height });
  await page.addInitScript(() => localStorage.setItem("kakau-lab-interference-sidebar", "open"));
  await page.goto("/interference");
  await expect(page.locator("[data-interference-runtime]")).toHaveAttribute("data-interference-frame", /.+/);
};
const TABS = ["measure", "count", "antiphase", "time", "edge"] as const;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const setRange = (page: Page, name: string, value: string) => page.locator(`[data-control="${name}"]`).evaluate((el, v) => {
  const input = el as HTMLInputElement; input.value = v; input.dispatchEvent(new Event("input", { bubbles: true }));
}, value);

/** Every visible `.step__title` containing inline math must flow as text: not a flex container, math sits on the
 * same line as the glyph just before it, and the number badge hangs at the left edge of the first line. */
const checkTitles = (page: Page) => page.evaluate(() => {
  const problems: string[] = [];
  for (const title of document.querySelectorAll<HTMLElement>(".step__title")) {
    if (!title.getClientRects().length) continue;
    const label = title.textContent?.slice(0, 30) ?? "";
    if (getComputedStyle(title).display.includes("flex")) problems.push(`${label}: still flex`);
    const box = title.getBoundingClientRect();
    const badge = title.querySelector<HTMLElement>(".step__index");
    if (badge) {
      const b = badge.getBoundingClientRect();
      if (Math.abs(b.left - box.left) > 2) problems.push(`${label}: badge not at start`);
      if (b.top - box.top > 8) problems.push(`${label}: badge not on first line`);
    }
    for (const math of title.querySelectorAll<HTMLElement>("mjx-container")) {
      const m = math.getBoundingClientRect();
      if (!m.width) continue;
      if (m.right > box.right + 1 || m.left < box.left - 1) problems.push(`${label}: math escapes title`);
      // the text node right before the math must end at the math's line (same row) or on the previous row, never after it
      const prev = math.previousSibling;
      if (prev && prev.nodeType === Node.TEXT_NODE && prev.textContent) {
        const range = document.createRange(); const n = prev as Text; range.setStart(n, Math.max(0, n.length - 1)); range.setEnd(n, n.length);
        const r = range.getBoundingClientRect();
        if (r.width && r.left > m.left + 1 && Math.abs(r.top - m.top) < 6) problems.push(`${label}: text after math in source appears before it`);
        if (r.width && Math.abs(r.top - m.top) < 6 && r.right > m.left + 2) problems.push(`${label}: text overlaps math`);
      }
    }
  }
  return problems;
});

for (const [width, height] of [[1440, 900], [390, 844], [320, 720]] as const) {
  test(`activity step titles with inline math flow as text at ${width}px @c4`, async ({ page }) => {
    await open(page, width, height);
    for (const id of TABS) {
      await page.locator(`[data-activity-tab="${id}"]`).click();
      // reveal later steps of activity 1 so every title exists
      if (id === "measure") await page.evaluate(() => document.querySelectorAll("[data-activity-step]").forEach(s => ((s as HTMLElement).hidden = false)));
      await expect(page.locator(`[data-activity="${id}"] mjx-container`).first()).toBeVisible();
      expect(await checkTitles(page), `${id} @${width}`).toEqual([]);
      expect(await noOverflow(page)).toBe(true);
    }
    await page.locator('[data-activity-tab="antiphase"]').click();
    await shot(page, `activity3-title-${width}`, '[data-activity="antiphase"]');
  });
}

test("activity 3 title survives 200% text size without overflow @c4", async ({ page }) => {
  await open(page, 390, 844);
  await page.addStyleTag({ content: "html{font-size:200% !important}" });
  await page.locator('[data-activity-tab="antiphase"]').click();
  await expect(page.locator('[data-activity="antiphase"] mjx-container').first()).toBeVisible();
  expect(await checkTitles(page)).toEqual([]);
  expect(await noOverflow(page)).toBe(true);
  await shot(page, "activity3-title-390-200pct", '[data-activity="antiphase"]');
});

test("wave speed updates v, f, λ, T, MathJax formula and sr text while paused @c4", async ({ page }) => {
  await open(page, 1440, 900);
  await page.locator("details.if-advanced summary").click();
  await expect(page.locator('[data-action="play-pause"]')).toHaveAttribute("aria-pressed", "false");
  const sr = page.locator("[data-kinematics-sr]");
  await expect(sr).toContainText("v = 1.00");
  await setRange(page, "waveSpeed", "1.5");
  await expect(page.locator('[data-output="waveSpeed"]')).toHaveText("1.50");
  await expect(page.locator('[data-output="frequency"]')).toHaveText("1.50");
  await expect(sr).toContainText("v = 1.50");
  await expect(sr).toContainText("f = 1.50");
  await expect(sr).toContainText("T = 0.67");
  const formula = page.locator(".if-kinematics .if-math").first();
  await expect(formula).toContainText(/1\.50/);
  await shot(page, "waveSpeed-sync", ".if-kinematics");
  // quick successive adjustments end on the last value, with one consistent state everywhere
  for (const v of ["0.6", "1.9", "0.8", "1.2", "0.5"]) await setRange(page, "waveSpeed", v);
  await expect(sr).toContainText("v = 0.50");
  await expect(sr).toContainText("f = 0.50");
  await expect(sr).toContainText("T = 2.00");
  await expect(page.locator('[data-output="waveSpeed"]')).toHaveText("0.50");
  await expect(formula).toContainText(/0\.50/);
  // λ is unchanged by v alone, and the field keeps its conditions
  await expect(page.locator('[data-output="wavelength"]')).toHaveText("1.00");
});

test("playback does not retypeset kinematics formulas @c4", async ({ page }) => {
  await open(page, 1440, 900);
  await page.locator("details.if-advanced summary").click();
  await setRange(page, "waveSpeed", "1.4");
  const before = await page.locator(".if-kinematics").evaluate(el => ({ svgs: el.querySelectorAll("svg").length, html: el.innerHTML.length }));
  await page.locator('[data-action="play-pause"]').click();
  await page.waitForTimeout(1200);
  const after = await page.locator(".if-kinematics").evaluate(el => ({ svgs: el.querySelectorAll("svg").length, html: el.innerHTML.length }));
  expect(after).toEqual(before);
});
