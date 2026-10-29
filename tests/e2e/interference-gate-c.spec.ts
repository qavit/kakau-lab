import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { evidencePath } from "./evidence";

test("Gate C dialog content and stored preferences survive reload", async ({ page }) => {
  await page.goto("/interference-lifecycle");
  const host = page.getByTestId("interference-host");
  await expect(host.locator("[data-interference-runtime]")).toHaveCount(1);
  await expect(host.locator('[data-dialog="counts"]')).toContainText("等號也要算");
  await expect(host.locator('[data-dialog="antiphase"]')).toContainText("同調不等於同相");
  await expect(host.locator('[data-dialog="time"]')).toContainText("模擬器畫的是什麼");
  const hint = host.locator("[data-plot-hint]");
  await expect(hint).toBeVisible();
  await hint.getByRole("button", { name: "關閉操作說明" }).click();
  expect(await page.evaluate(() => localStorage.getItem("kakau-lab-interference-plot-hint"))).toBe("dismissed");
  await expect(hint).toBeHidden();
  const toggle = host.locator('[data-action="toggle-activities"]');
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.reload();
  await expect(host.locator("[data-plot-hint]")).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await host.locator('[data-activity-tab="edge"]').click();
  await host.locator('[data-activity="edge"] [data-open-dialog="hyperbola"]').click();
  const dialog = host.locator('[data-dialog="hyperbola"]');
  await expect(dialog).toContainText("三角不等式");
  await expect(dialog).toContainText("兩個特例");
  await mkdir(evidencePath("interference-gate-c-20261029"), { recursive: true });
  await page.screenshot({ path: evidencePath("interference-gate-c-20261029", "dialog-hyperbola-desktop.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(host.locator('[data-activity="edge"] [data-open-dialog="hyperbola"]')).toBeFocused();
});

test("Gate C mobile sidebar defaults closed and can be reopened @mobile", async ({ page }) => {
  await page.goto("/interference-lifecycle");
  const host = page.getByTestId("interference-host");
  await expect(host.locator("[data-interference-runtime]")).toHaveCount(1);
  const toggle = host.locator('[data-action="toggle-activities"]');
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.tap();
  await expect(host.locator('[data-activity-tab="count"]')).toBeVisible();
  await mkdir(evidencePath("interference-gate-c-20261029"), { recursive: true });
  await page.screenshot({ path: evidencePath("interference-gate-c-20261029", "sidebar-mobile.png"), fullPage: true });
});
