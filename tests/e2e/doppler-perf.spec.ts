import { expect, test } from "@playwright/test";

/**
 * Informal baseline, not a release gate: first-interactive time and frame cost while playing at 2×, on whatever
 * machine runs it. Skipped unless DOPPLER_PERF=1 so it never makes the normal suite flaky.
 */
test.skip(process.env.DOPPLER_PERF !== "1", "set DOPPLER_PERF=1 to measure");

test("baseline: first interactive, playback frame cost, panel toggle", async ({ page }, testInfo) => {
  const started = Date.now();
  await page.goto("/doppler");
  await expect(page.locator("main")).toHaveAttribute("data-interactive", "true");
  const interactive = Date.now() - started;
  await page.getByRole("button", { name: "波源靠近", exact: true }).click();
  await page.getByRole("button", { name: "2×" }).click();
  const frames = await page.evaluate(() => new Promise<number[]>((resolve) => {
    (document.querySelector('button[aria-label="播放"]') as HTMLButtonElement).click();
    const deltas: number[] = [];
    let last = performance.now();
    const step = () => {
      const now = performance.now();
      deltas.push(now - last);
      last = now;
      if (deltas.length < 180) requestAnimationFrame(step);
      else resolve(deltas);
    };
    requestAnimationFrame(step);
  }));
  const sorted = [...frames].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const mean = frames.reduce((a, b) => a + b, 0) / frames.length;
  const panel = await page.evaluate(async () => {
    const t0 = performance.now();
    (document.querySelector('button[aria-label="放大視圖：空氣參考系的波前"]') as HTMLButtonElement).click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return performance.now() - t0;
  });
  const report = { firstInteractiveMs: interactive, frameMeanMs: Number(mean.toFixed(2)), frameP95Ms: Number(p95.toFixed(2)), expandToggleMs: Number(panel.toFixed(1)), note: "dev server, headless Chromium, unthrottled" };
  console.log(JSON.stringify(report));
  await testInfo.attach("perf", { body: JSON.stringify(report, null, 2), contentType: "application/json" });
  expect(mean).toBeLessThan(40);
});
