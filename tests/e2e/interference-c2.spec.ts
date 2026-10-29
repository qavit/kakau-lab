import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { evidencePath } from "./evidence";

const evidenceDir = evidencePath("interference-gate-c2-20261029");

test("keyboard focus order, hidden sidebar and point readout @c2", async ({ page }) => {
  await page.goto("/interference");
  const host = page.getByTestId("interference-host");
  await expect(host.locator("[data-interference-runtime]")).toHaveCount(1);
  const sequence: Array<{ tag: string; name: string; hidden: boolean }> = [];
  for (let i = 0; i < 34; i++) {
    await page.keyboard.press("Tab");
    sequence.push(await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return { tag: el.tagName.toLowerCase(), name: el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 50) || "", hidden: !el.getClientRects().length };
    }));
  }
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(`${evidenceDir}/tab-sequence.json`, JSON.stringify(sequence, null, 2));
  expect(sequence.every(item => !item.hidden)).toBe(true);
  const wavelength = host.locator('[data-control="wavelength"]');
  await wavelength.focus();
  const before = await wavelength.inputValue();
  await page.keyboard.press("ArrowRight");
  expect(await wavelength.inputValue()).not.toBe(before);
  const plot = host.locator("[data-interference-plot]");
  await plot.focus();
  await page.keyboard.press("Enter");
  await expect(host.locator("[data-selected-point]")).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Delete");
  await expect(host.locator("[data-point-position]")).toHaveText("尚未放置 P");
  const toggle = host.locator('[data-action="toggle-activities"]');
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.focus();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => (document.activeElement as Element).closest(".interference-activities") !== null)).toBe(false);
});

test("dialog focus, reduced motion and semantic audit @c2", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/interference");
  const host = page.getByTestId("interference-host");
  await expect(host.locator("[data-interference-runtime]")).toHaveCount(1);
  await expect(host.locator('[data-action="play-pause"]')).toHaveAttribute("aria-pressed", "false");
  const frame = await host.locator("[data-interference-runtime]").getAttribute("data-interference-frame");
  await page.waitForTimeout(120);
  await expect(host.locator("[data-interference-runtime]")).toHaveAttribute("data-interference-frame", frame!);
  await host.locator('[data-activity-tab="edge"]').click();
  const opener = host.locator('[data-activity="edge"] [data-open-dialog="hyperbola"]');
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = host.locator('[data-dialog="hyperbola"]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(/距離差固定/);
  await expect(dialog.getByRole("button", { name: "關閉" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  const axe = await new AxeBuilder({ page }).include('[data-testid="interference-host"]').analyze();
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(`${evidenceDir}/axe.json`, JSON.stringify({ violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })) }, null, 2));
  expect(axe.violations.filter(v => v.impact === "critical" || v.impact === "serious")).toEqual([]);
});

test("responsive controls and canvas aspect ratio @c2", async ({ page }) => {
  await page.goto("/interference");
  const host = page.getByTestId("interference-host");
  await expect(host.locator("[data-interference-runtime]")).toHaveCount(1);
  const results: Array<{ width: number; overflow: number; plotRatio: number }> = [];
  for (const width of [1280, 640, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    results.push(await page.evaluate(() => {
      const plot = document.querySelector("[data-interference-plot]")!.getBoundingClientRect();
      return { width: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth, plotRatio: plot.width / plot.height };
    }));
  }
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(`${evidenceDir}/reflow-viewport.json`, JSON.stringify(results, null, 2));
  expect(results.every(item => item.overflow <= 1 && Math.abs(item.plotRatio - 1) < .02)).toBe(true);
  await page.screenshot({ path: `${evidenceDir}/viewport-320.png`, fullPage: true });
});

test("repeated mount, play, dispose and remount @c2", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/interference-lifecycle");
  const host = page.getByTestId("interference-host");
  const toggle = page.getByTestId("toggle-interference");
  for (let i = 0; i < 5; i++) {
    await expect(host.locator("[data-interference-runtime]")).toHaveCount(1);
    await host.locator('[data-action="play-pause"]').click();
    await expect(host.locator('[data-action="play-pause"]')).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(host).toHaveCount(0);
    await toggle.click();
  }
  expect(errors).toEqual([]);
});

test("guided count activity completes with keyboard input @c2", async ({ page }) => {
  await page.goto("/interference");
  const host = page.getByTestId("interference-host");
  await expect(host.locator("[data-interference-runtime]")).toHaveCount(1);
  const tab = host.locator('[data-activity-tab="count"]');
  await tab.focus();
  await page.keyboard.press("Enter");
  await expect(host.locator("#activity-count-title")).toBeFocused();
  await host.locator('[data-answer="count-predict-antinodes"]').focus();
  await page.keyboard.type("5");
  await page.keyboard.press("Tab");
  await page.keyboard.type("4");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(host.locator('[data-activity="count"] [data-activity-step="observe"]')).toBeVisible();
  await host.locator('[data-answer="count-antinodes"]').focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("7");
  await page.keyboard.press("Tab");
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("6");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(host.locator("[data-count-result]")).toContainText("7 條波腹線、6 條波節線");
});
