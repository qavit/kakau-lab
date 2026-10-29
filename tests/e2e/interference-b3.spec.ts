import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { evidencePath } from "./evidence";

test("guided activities, measurement, keyboard, dialog and advanced edge exploration", async ({ page }) => {
  await page.goto("/interference-lifecycle");
  const host = page.getByTestId("interference-host");
  const plot = host.locator("[data-interference-plot]");
  await expect(host.locator("[data-interference-runtime]")).toHaveCount(1);

  await host.locator('[data-action="projection"]').click();
  await expect(host).toHaveClass(/interference-projection/);
  await expect(host.locator('[data-action="projection"]')).toHaveAttribute("aria-pressed", "true");
  await host.locator('[data-action="projection"]').click();
  const collapse = host.locator('[data-action="toggle-activities"]');
  await collapse.click();
  await expect(collapse).toHaveAttribute("aria-expanded", "false");
  await expect(host.getByRole("navigation", { name: "選擇活動" })).toBeHidden();
  await collapse.click();
  await expect(host.getByRole("navigation", { name: "選擇活動" })).toBeVisible();

  // Activity 1: record actual constructive and destructive locations before checking.
  const initialBounds = await plot.boundingBox();
  if (!initialBounds) throw new Error("Plot has no visible bounds");
  await plot.click({ position: { x: initialBounds.width / 2, y: initialBounds.height / 2 } });
  await expect(host.locator('[data-activity="measure"] [data-activity-step="explore"]')).toBeVisible();
  await expect(host.locator('[data-readout="classification"]')).toContainText("相長");
  await expect(host.locator("[data-waveform-curve]")).toHaveAttribute("d", /M.*L/);
  await plot.click({ position: { x: initialBounds.width * .57, y: initialBounds.height * .25 } });
  await expect(host.locator('[data-measure-progress]')).toContainText("波節 1/1");
  await expect(host.locator('[data-activity="measure"] [data-activity-step="conclude"]')).toBeVisible();
  await host.locator('[data-answer="measure-constructive"]').selectOption("integer");
  await host.locator('[data-answer="measure-destructive"]').selectOption("half");
  await host.locator('[data-activity-action="measure-check"]').click();
  await expect(host.locator('[data-activity="measure"] [data-activity-step="done"]')).toBeVisible();
  await host.locator('[data-activity="measure"] [data-open-dialog="hyperbola"]').click();
  const hyperbolaDialog = host.locator('[data-dialog="hyperbola"]');
  await expect(hyperbolaDialog).toBeVisible();
  await expect(hyperbolaDialog.getByRole("button", { name: "關閉" })).toBeFocused();
  await hyperbolaDialog.getByRole("button", { name: "關閉" }).click();
  await expect(hyperbolaDialog).toBeHidden();
  await expect(host.locator('[data-activity="measure"] [data-open-dialog="hyperbola"]')).toBeFocused();

  // Activity 2: prediction precedes the fixed d=3λ observation; answer is 7/6.
  await host.locator('[data-activity-tab="count"]').click();
  await host.locator('[data-answer="count-predict-antinodes"]').fill("7");
  await host.locator('[data-answer="count-predict-nodes"]').fill("6");
  await expect(host.locator('[data-activity="count"] [data-activity-step="observe"]')).toBeHidden();
  await host.locator('[data-activity-action="count-lock"]').click();
  await host.locator('[data-activity-action="count-check"]');
  await host.locator('[data-answer="count-antinodes"]').fill("7");
  await host.locator('[data-answer="count-nodes"]').fill("6");
  await host.locator('[data-activity-action="count-check"]').click();
  await expect(host.locator('[data-count-result]')).toContainText("7 條波腹線、6 條波節線");
  await mkdir(evidencePath("interference-gate-b3"), { recursive: true });
  await page.screenshot({ path: evidencePath("interference-gate-b3", "activity-count-desktop.png"), fullPage: true });
  await host.locator('[data-action="reset-parameters"]').click();
  await expect(host.locator('[data-activity="count"] [data-activity-step="done"]')).toBeVisible();
  await host.locator('[data-activity-action="count-retry"]').click();
  await expect(host.locator('[data-activity="count"] [data-activity-step="predict"]')).toBeVisible();

  // Activity 3: central classification changes from constructive to destructive.
  await host.locator('[data-activity-tab="antiphase"]').click();
  await host.locator('input[name="antiphase-choice"][value="node"]').check();
  await host.locator('[data-activity-action="antiphase-apply"]').click();
  await expect(host.locator('[data-feedback="antiphase"]')).toContainText("相消條件線");
  await expect(host.locator('[data-condition="destructive-0"]')).toHaveAttribute("d", /M/);

  // Activity 4: observe time-varying wavefronts while condition geometry stays fixed.
  await host.locator('[data-activity-tab="time"]').click();
  await host.locator('input[name="time-choice"][value="static"]').check();
  await host.locator('[data-activity-action="time-start"]').click();
  await expect(host.locator('[data-action="play-pause"]')).toHaveAttribute("aria-pressed", "true");
  await expect(host.locator('[data-layer="wavefronts"] circle')).not.toHaveCount(0);
  await host.locator('input[name="time-fronts"][value="moves"]').check();
  await host.locator('input[name="time-lines"][value="static"]').check();
  await host.locator('[data-activity-action="time-check"]').click();
  await expect(host.locator('[data-activity="time"] [data-activity-step="done"]')).toBeVisible();
  await page.screenshot({ path: evidencePath("interference-gate-b3", "activity-time-desktop.png"), fullPage: true });
  await host.locator('[data-action="play-pause"]').click();

  // Advanced edge conditions retain the absent / degenerate / hyperbola boundary.
  await host.locator('[data-activity-tab="edge"]').click();
  await host.locator('[data-activity-action="edge-set"][data-value="2.9"]').click();
  await expect(host.locator('[data-edge-shape]')).toHaveText("不存在");
  await host.locator('[data-activity-action="edge-set"][data-value="3"]').click();
  await expect(host.locator('[data-edge-shape]')).toHaveText("兩條退化半直線");
  await host.locator('[data-activity-action="edge-set"][data-value="3.1"]').click();
  await expect(host.locator('[data-edge-shape]')).toHaveText("雙曲線");

  // Keyboard movement and deletion operate only while the plot owns focus.
  await plot.click({ position: { x: initialBounds.width / 2, y: initialBounds.height / 2 } });
  const before = await host.locator("[data-selected-point]").getAttribute("cx");
  await plot.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => host.locator("[data-selected-point]").getAttribute("cx")).not.toBe(before);
  await page.keyboard.press("Delete");
  await expect(host.locator("[data-selected-point]")).toHaveCount(0);
  await plot.dblclick({ position: { x: initialBounds.width * .7, y: initialBounds.height * .3 } });
  await expect(host.locator("[data-selected-point]")).toHaveCount(0);
});

test("activity controls fit a narrow touch viewport @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/interference-lifecycle");
  const host = page.getByTestId("interference-host");
  await expect(host.locator("[data-interference-runtime]")).toHaveCount(1);
  await host.locator('[data-action="toggle-activities"]').tap();
  await host.locator('[data-activity-tab="count"]').tap();
  await host.locator('[data-answer="count-predict-antinodes"]').fill("7");
  await host.locator('[data-answer="count-predict-nodes"]').fill("6");
  await host.locator('[data-activity-action="count-lock"]').tap();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await mkdir(evidencePath("interference-gate-b3"), { recursive: true });
  await page.screenshot({ path: evidencePath("interference-gate-b3", "activity-count-mobile.png"), fullPage: true });
});

test("interference host exposes named controls and has no serious axe violations @a11y", async ({ page }) => {
  await page.goto("/interference-lifecycle");
  const host = page.getByTestId("interference-host");
  const report = await new AxeBuilder({ page }).include('[data-testid="interference-host"]').analyze();
  expect(report.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  await expect(host.locator('[data-control="wavelength"]')).toHaveAccessibleName(/波長/);
  await expect(host.locator('[data-control="time-cycle"]')).toHaveAccessibleName(/t \/ T/);
  await expect(host.locator('[data-activity-tab="measure"]')).toHaveAccessibleName(/路徑差/);
});
