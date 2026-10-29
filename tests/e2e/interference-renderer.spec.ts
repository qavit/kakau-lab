import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

test("renderer shows the field and keeps controls, measurement and lifecycle in sync", async ({ page }) => {
  await page.goto("/interference-lifecycle");
  const host = page.getByTestId("interference-host");
  const canvas = host.locator("canvas[data-interference-canvas]");
  await expect(canvas).toBeVisible();
  await expect(host.locator('[data-condition="constructive-0"]')).toHaveAttribute("d", /M/);
  const fieldPixel = await canvas.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("2d")!;
    const { data } = context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1);
    return [...data];
  });
  expect(fieldPixel[3]).toBe(255);
  const artifacts = resolve("docs/audits/interference-gate-b2-20261028");
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: resolve(artifacts, "desktop-default.png"), fullPage: true });

  const intensity = host.locator('input[name="interference-view"][value="intensity"]');
  await intensity.check();
  const stationaryPattern = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await host.locator('[data-control="time-cycle"]').evaluate((element) => {
    const input = element as HTMLInputElement; input.value = "0.5"; input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL())).toBe(stationaryPattern);
  await host.getByRole("button", { name: "更多" }).click();
  for (const mode of ["amplitude", "phase", "displacement"]) await host.locator(`input[name="interference-view"][value="${mode}"]`).check();

  const wavelength = host.locator('[data-control="wavelength"]');
  await wavelength.evaluate((element) => { const input = element as HTMLInputElement; input.value = "1.25"; input.dispatchEvent(new Event("input", { bubbles: true })); });
  await expect(host.locator('[data-output="wavelength"]')).toHaveText("1.25");

  const plot = host.locator("[data-interference-plot]");
  const bounds = await plot.boundingBox();
  if (!bounds) throw new Error("Plot has no visible bounds");
  await page.mouse.click(bounds.x + bounds.width * .7, bounds.y + bounds.height * .38);
  await expect(host.locator("[data-selected-point]")).toBeVisible();
  await expect(host.locator("[data-measure-sr]")).toContainText("r₁ =");
  const markerBefore = await host.locator("[data-selected-point]").getAttribute("cx");
  await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .38);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .55, bounds.y + bounds.height * .62, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => host.locator("[data-selected-point]").getAttribute("cx")).not.toBe(markerBefore);

  const play = host.locator('[data-action="play-pause"]');
  await play.click();
  await expect(play).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(100);
  await play.click();
  await expect(play).toHaveAttribute("aria-pressed", "false");
  const pausedFrame = await host.locator("[data-interference-runtime]").getAttribute("data-interference-frame");
  await page.waitForTimeout(100);
  await expect(host.locator("[data-interference-runtime]")).toHaveAttribute("data-interference-frame", pausedFrame ?? "");
  await host.locator('[data-action="reset-time"]').click();
  await expect(host.locator('[data-output="time-cycle"]')).toHaveText("0.00");
  const advanced = host.locator("details");
  await advanced.locator("summary").click();
  const waveSpeed = host.locator('[data-control="waveSpeed"]');
  await waveSpeed.evaluate((element) => { const input = element as HTMLInputElement; input.value = "1.5"; input.dispatchEvent(new Event("input", { bubbles: true })); });
  await expect(host.locator('[data-output="frequency"]')).toHaveText("1.20");
  const frequency = host.locator('[data-control="frequency"]');
  await frequency.evaluate((element) => { const input = element as HTMLInputElement; input.value = "1.25"; input.dispatchEvent(new Event("input", { bubbles: true })); });
  await expect(host.locator('[data-output="wavelength"]')).toHaveText("1.20");

  await page.screenshot({ path: resolve(artifacts, "desktop.png"), fullPage: true });
  await host.locator('[data-action="reset-parameters"]').click();
  await expect(host.locator('[data-output="wavelength"]')).toHaveText("1.00");
  await expect(host.locator("[data-selected-point]")).toHaveCount(0);
  await page.getByTestId("toggle-interference").click();
  await expect(canvas).toHaveCount(0);
  await page.getByTestId("toggle-interference").click();
  await expect(host.locator("canvas[data-interference-canvas]")).toBeVisible();
});

test("renderer fits a touch viewport and can place a measurement point @mobile", async ({ page }) => {
  await page.goto("/interference-lifecycle");
  const host = page.getByTestId("interference-host");
  const plot = host.locator("[data-interference-plot]");
  await expect(host.locator("canvas[data-interference-canvas]")).toBeVisible();
  await expect(host.locator("[data-interference-runtime]")).toHaveAttribute("data-interference-frame", /.+/);
  const bounds = await plot.boundingBox();
  if (!bounds) throw new Error("Plot has no visible bounds");
  const pixelRatio = await host.locator("canvas[data-interference-canvas]").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    return canvas.width / canvas.getBoundingClientRect().width;
  });
  expect(pixelRatio).toBeGreaterThan(1.2);
  expect(pixelRatio).toBeLessThanOrEqual(1.7);
  await page.touchscreen.tap(bounds.x + bounds.width * .35, bounds.y + bounds.height * .4);
  await expect(host.locator("[data-selected-point]")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await mkdir(resolve("docs/audits/interference-gate-b2-20261028"), { recursive: true });
  await page.screenshot({ path: resolve("docs/audits/interference-gate-b2-20261028/mobile.png"), fullPage: true });
});
