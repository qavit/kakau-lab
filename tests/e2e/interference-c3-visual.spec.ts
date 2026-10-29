import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

// Gate C3 layout parity. Assertions are geometric (region order, sizes, overflow) so they hold across
// machines; the screenshots are evidence for the audit report, not pixel baselines.
const evidenceDir = "docs/audits/interference-gate-c3-20261029/lab-after";
const shot = async (page: Page, name: string, fullPage = false) => { await mkdir(evidenceDir, { recursive: true }); await page.screenshot({ path: `${evidenceDir}/${name}.png`, fullPage }); };
const rect = async (page: Page, selector: string) => {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`${selector} has no box`);
  return box;
};
const open = async (page: Page, width: number, height: number, sidebar?: "open" | "closed") => {
  await page.setViewportSize({ width, height });
  if (sidebar) await page.addInitScript((value) => localStorage.setItem("kakau-lab-interference-sidebar", value), sidebar);
  await page.goto("/interference");
  await expect(page.locator("[data-interference-runtime]")).toHaveAttribute("data-interference-frame", /.+/);
};
const noHorizontalOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const placePoint = async (page: Page) => {
  const plot = await rect(page, "[data-interference-plot]");
  await page.mouse.click(plot.x + plot.width * .62, plot.y + plot.height * .3);
  await expect(page.locator("[data-selected-point]")).toBeVisible();
};

for (const [width, height] of [[1440, 900], [1280, 800]] as const) {
  test(`desktop ${width}: toolbar, plot, rail, activities and time bar keep Front's spatial relations @c3`, async ({ page }) => {
    await open(page, width, height, "open");
    const toolbar = await rect(page, ".interference-controls"), plot = await rect(page, "[data-interference-plot]");
    const rail = await rect(page, ".if-rail"), activities = await rect(page, ".interference-activities"), time = await rect(page, ".interference-time");
    expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(plot.y + 1);
    expect(plot.x + plot.width).toBeLessThanOrEqual(rail.x + 1);
    expect(rail.x + rail.width).toBeLessThanOrEqual(activities.x + 1);
    expect(plot.y + plot.height).toBeLessThanOrEqual(time.y);
    expect(Math.abs(plot.width - plot.height)).toBeLessThan(2);
    expect(plot.width).toBeGreaterThanOrEqual(480);
    expect(plot.width * plot.height).toBeGreaterThan(rail.width * rail.height);
    expect(await noHorizontalOverflow(page)).toBe(true);
    // one scroll region per column at most: the simulator fits the first screen. The server-rendered concept
    // summary sits below it, so the page may scroll to reach that, but the lab itself must not need it.
    expect(await page.evaluate(() => document.querySelector('[data-testid="interference-host"]')!.getBoundingClientRect().bottom <= window.innerHeight + 40)).toBe(true);
    await shot(page, `desktop-${width}-activities-open`);

    await page.locator('[data-action="toggle-activities"]').click();
    const collapsed = await rect(page, ".interference-activities");
    expect(collapsed.width).toBeLessThan(60);
    expect((await rect(page, "[data-interference-plot]")).width).toBeGreaterThanOrEqual(plot.width);
    await expect(page.getByRole("navigation", { name: "選擇活動" })).toBeHidden();
    await shot(page, `desktop-${width}-activities-closed`);
  });
}

test("formulas update live, textbook counts and advanced mode stay distinct @c3", async ({ page }) => {
  await open(page, 1440, 900, "open");
  const geometry = page.locator("[data-geometry-sr]");
  const svgs = page.locator(".if-rail mjx-container svg");
  await expect(svgs.first()).toBeVisible(); // real MathJax SVG, not CSS or text
  await expect(geometry).toHaveText("d/λ = 2.00，波腹線 5 條，波節線 4 條。");
  const setRange = (name: string, value: string) => page.locator(`[data-control="${name}"]`).evaluate((el, v) => { const input = el as HTMLInputElement; input.value = v; input.dispatchEvent(new Event("input", { bubbles: true })); }, value);
  await setRange("separation", "3");
  await expect(geometry).toHaveText("d/λ = 3.00，波腹線 7 條，波節線 6 條。");
  await expect(page.locator("[data-mode-status]")).toHaveText("課本模式");
  const before = await rect(page, ".if-rail");
  await setRange("separation", "3.5");
  expect(await rect(page, ".if-rail")).toEqual(before); // live numbers do not shift the rail

  await page.locator("details.if-advanced summary").click();
  await setRange("phase2", "180");
  await expect(page.locator("[data-mode-status]")).toHaveText("進階模式");
  await expect(page.locator("[data-counts-textbook]")).toBeHidden();
  await expect(page.locator("[data-counts-advanced]")).toBeVisible();
  await expect(page.locator("[data-term='constructive']")).toHaveText("相長條件線");
  await shot(page, "desktop-1440-advanced");
});

test("measurement rail: empty prompt, P readouts, classification and waveform @c3", async ({ page }) => {
  await open(page, 1440, 900, "open");
  await expect(page.locator("[data-point-empty]")).toBeVisible();
  await expect(page.locator("[data-point-values]")).toBeHidden();
  const plotBefore = await rect(page, "[data-interference-plot]");
  await placePoint(page);
  expect(await rect(page, "[data-interference-plot]")).toEqual(plotBefore); // placing P never moves the field
  await expect(page.locator(".if-rail [data-point-values] mjx-container svg").first()).toBeVisible();
  await expect(page.locator("[data-measure-sr]")).toContainText("r₁ =");
  await expect(page.locator("[data-measure-sr]")).not.toContainText("0.00，r₂");
  await expect(page.locator("[data-classification-title]")).not.toBeEmpty();
  await expect(page.locator('[data-readout="phase-difference"]')).toContainText("°");
  await expect(page.locator("[data-waveform]")).toBeVisible();
  const rail = await rect(page, ".if-rail"), wave = await rect(page, "[data-waveform]");
  expect(wave.y + wave.height).toBeLessThanOrEqual(rail.y + rail.height + 1);
  await shot(page, "desktop-1440-point-placed");
  await page.locator('[data-action="clear-point"]').click();
  await expect(page.locator("[data-point-empty]")).toBeVisible();
});

test("activity 2 masks the live counts until the answer is revealed @c3", async ({ page }) => {
  await open(page, 1440, 900, "open");
  await page.locator('[data-activity-tab="count"]').click();
  await expect(page.locator("[data-geometry-sr]")).toContainText("線數暫時遮住");
  await page.locator('[data-answer="count-predict-antinodes"]').fill("7");
  await page.locator('[data-answer="count-predict-nodes"]').fill("6");
  await page.locator('[data-activity-action="count-lock"]').click();
  await page.locator('[data-answer="count-antinodes"]').fill("7");
  await page.locator('[data-answer="count-nodes"]').fill("6");
  await page.locator('[data-activity-action="count-check"]').click();
  await expect(page.locator("[data-geometry-sr]")).toContainText("波腹線 7 條");
  await shot(page, "desktop-1440-activity-count-done");
});

test("projection mode enlarges the field, keeps measurement and restores state @c3", async ({ page }) => {
  await open(page, 1440, 900, "open");
  await placePoint(page);
  const normal = await rect(page, "[data-interference-plot]");
  await page.locator('[data-action="projection"]').click();
  const projected = await rect(page, "[data-interference-plot]");
  expect(projected.width).toBeGreaterThan(normal.width);
  await expect(page.locator(".interference-controls")).toBeHidden();
  await expect(page.locator(".interference-activities")).toBeHidden();
  await expect(page.locator("[data-point-values]")).toBeVisible();
  await expect(page.locator('[data-action="play-pause"]')).toBeVisible();
  expect(await noHorizontalOverflow(page)).toBe(true);
  await shot(page, "desktop-1440-projection");
  await page.locator('[data-action="projection"]').click();
  await expect(page.locator(".interference-controls")).toBeVisible();
  await expect(page.locator("[data-selected-point]")).toBeVisible();
  expect((await rect(page, "[data-interference-plot]")).width).toBeCloseTo(normal.width, 0);
});

test("teaching dialog stays inside the viewport and returns focus @c3", async ({ page }) => {
  await open(page, 1440, 900, "open");
  await page.locator('[data-activity-tab="edge"]').click();
  const opener = page.locator('[data-activity="edge"] [data-open-dialog="hyperbola"]');
  await opener.click();
  const dialog = page.locator('[data-dialog="hyperbola"]');
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 1440 && box.y + box.height <= 900).toBe(true);
  await shot(page, "desktop-1440-dialog");
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
});

for (const scheme of ["light", "dark"] as const) {
  test(`no serious contrast or semantic violations in ${scheme} theme @c3`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, 1440, 900, "open");
    await placePoint(page);
    const report = await new AxeBuilder({ page }).include('[data-testid="interference-host"]').analyze();
    expect(report.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 5).join(", ")}`)).toEqual([]);
    await shot(page, `desktop-1440-${scheme}`);
  });
}

for (const [width, height] of [[768, 1024], [390, 844], [320, 720]] as const) {
  test(`responsive ${width}: single column, no overflow, usable plot @c3`, async ({ page }) => {
    await open(page, width, height);
    expect(await noHorizontalOverflow(page)).toBe(true);
    const plot = await rect(page, "[data-interference-plot]"), rail = await rect(page, ".if-rail"), time = await rect(page, ".interference-time");
    expect(plot.width).toBeGreaterThanOrEqual(Math.min(width - 32, 280));
    expect(plot.y + plot.height).toBeLessThanOrEqual(time.y + 1);
    expect(time.y + time.height).toBeLessThanOrEqual(rail.y + 1);
    await shot(page, `mobile-${width}-default`, true);
    await placePoint(page);
    expect(await noHorizontalOverflow(page)).toBe(true);
    // accordion: opening activities pushes content down instead of overlapping the field
    const before = await rect(page, "[data-interference-plot]");
    await page.locator('[data-action="toggle-activities"]').click();
    await expect(page.getByRole("navigation", { name: "選擇活動" })).toBeVisible();
    const after = await rect(page, "[data-interference-plot]");
    expect(after.y).toBeGreaterThan(before.y);
    expect(await noHorizontalOverflow(page)).toBe(true);
    await shot(page, `mobile-${width}-guided`, true);
  });
}

test("mobile formulas and dialog scroll locally without widening the page @c3", async ({ page }) => {
  await open(page, 320, 720);
  await page.locator('[data-action="toggle-activities"]').click();
  await page.locator('[data-activity-tab="antiphase"]').click();
  await page.locator('input[name="antiphase-choice"][value="node"]').check();
  await page.locator('[data-activity-action="antiphase-apply"]').click();
  await page.locator('[data-activity="antiphase"] [data-open-dialog="antiphase"]').click();
  const box = await page.locator('[data-dialog="antiphase"]').boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 320).toBe(true);
  expect(await noHorizontalOverflow(page)).toBe(true);
  await shot(page, "mobile-320-dialog");
});

test("rail, activities and dialogs are real MathJax SVG and update without node growth @c3", async ({ page }) => {
  await open(page, 1440, 900, "open");
  const svgs = page.locator('[data-testid="interference-host"] mjx-container svg');
  await expect(page.locator(".if-rail mjx-container svg").first()).toBeVisible();
  await expect(page.locator(".if-rail .rail-ratio mjx-container svg")).toHaveCount(1);
  await expect(page.locator(".if-rail .rail-count mjx-container svg")).toHaveCount(2);
  await expect(page.locator('[data-dialog="counts"] mjx-container svg').first()).toBeAttached();
  await expect(page.locator('[data-activity="measure"] mjx-container svg').first()).toBeAttached();
  const noCssFakes = await page.locator(".if-rail").evaluate((rail) => rail.querySelectorAll(".if-frac, .if-floor, [data-slot]").length);
  expect(noCssFakes).toBe(0);

  // parameter change retypesets the formula with the new number
  const ratioBefore = await page.locator(".rail-ratio mjx-container").innerHTML();
  await page.locator('[data-control="separation"]').evaluate((el) => { const i = el as HTMLInputElement; i.value = "3"; i.dispatchEvent(new Event("input", { bubbles: true })); });
  await expect.poll(async () => page.locator(".rail-ratio mjx-container").innerHTML()).not.toBe(ratioBefore);
  await expect(page.locator("[data-geometry-sr]")).toContainText("d/λ = 3.00");

  // playback: no re-typesetting, no SVG growth, formula DOM untouched
  await placePoint(page);
  await expect(page.locator(".measure-formulas mjx-container svg").first()).toBeVisible();
  const count = await svgs.count();
  const railHtml = await page.locator(".if-rail .measure-formulas").innerHTML();
  await page.locator('[data-action="play-pause"]').click();
  await page.waitForTimeout(1500);
  await page.locator('[data-action="play-pause"]').click();
  expect(await svgs.count()).toBe(count);
  expect(await page.locator(".if-rail .measure-formulas").innerHTML()).toBe(railHtml);
  await shot(page, "math-desktop-1440");
});

test("MathJax formulas stay readable in dark theme and on mobile @c3", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await open(page, 390, 844);
  await placePoint(page);
  await expect(page.locator(".if-rail .rail-ratio mjx-container svg")).toBeVisible();
  expect(await noHorizontalOverflow(page)).toBe(true);
  const fill = await page.locator(".if-rail .rail-ratio mjx-container svg").first().evaluate((el) => getComputedStyle(el).color);
  expect(fill).not.toBe("rgb(0, 0, 0)");
  await shot(page, "math-mobile-390-dark", true);
});
