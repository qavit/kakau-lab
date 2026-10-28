import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test("ten minute interference stability sample @soak", async ({ page }) => {
  test.setTimeout(11 * 60_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/interference");
  const runtime = page.locator("[data-interference-runtime]");
  await expect(runtime).toHaveCount(1);
  const startedAt = Date.now();
  await page.locator('[data-action="play-pause"]').click();
  const samples: Array<{ elapsedSeconds: number; frame: number }> = [];
  for (let minute = 0; minute <= 10; minute += 1) {
    if (minute) await page.waitForTimeout(60_000);
    if (minute % 2 === 1) {
      await page.locator('input[name="interference-view"][value="intensity"]').check();
      await page.locator('input[name="interference-view"][value="displacement"]').check();
    }
    samples.push({ elapsedSeconds: Math.round((Date.now() - startedAt) / 1000), frame: Number(await runtime.getAttribute("data-interference-frame")) });
  }
  await page.locator('[data-action="play-pause"]').click();
  const pausedFrame = Number(await runtime.getAttribute("data-interference-frame"));
  await page.waitForTimeout(250);
  const frameAfterPause = Number(await runtime.getAttribute("data-interference-frame"));
  const evidence = { browser: "Playwright Chromium", elapsedSeconds: Math.round((Date.now() - startedAt) / 1000), samples, pausedFrame, frameAfterPause, pageErrors: errors };
  await mkdir("docs/audits/interference-gate-c2-20261029", { recursive: true });
  await writeFile("docs/audits/interference-gate-c2-20261029/soak.json", JSON.stringify(evidence, null, 2));
  expect(errors).toEqual([]);
  expect(samples.every((sample, i) => i === 0 || sample.frame > samples[i - 1].frame)).toBe(true);
  expect(frameAfterPause).toBe(pausedFrame);
});
