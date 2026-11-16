import { expect, test } from "@playwright/test";

/* Projectile on very short or zoomed screens: the page reflows and scrolls; the enlarged view keeps focus. */

test("projectile: at 400% zoom the page scrolls and reflows instead of pinning bars over the chart", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 180 });
  await page.goto("/projectile");
  const chart = page.locator('svg[role="img"]').first();
  await expect(chart).toBeVisible();

  // Nothing is stuck to the bottom edge, and nothing makes the page wider than the screen.
  const position = await page.locator(".projectile-panel-actions").evaluate((el) => getComputedStyle(el).position);
  expect(position).not.toBe("sticky");
  expect(position).not.toBe("fixed");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  // Scrolling brings the whole chart on screen, because its height follows the viewport.
  await chart.scrollIntoViewIfNeeded();
  await chart.evaluate((el) => el.scrollIntoView({ block: "start" }));
  const box = (await chart.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.y + box.height).toBeLessThanOrEqual(181);

  // The core controls remain reachable by scrolling.
  await page.getByRole("button", { name: /放大視圖/ }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: /放大視圖/ })).toBeInViewport();
  await page.getByRole("button", { name: /^(播放|暫停)$/ }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: /^(播放|暫停)$/ })).toBeInViewport();
});

test("projectile: enlarged view keeps focus inside, and Escape returns it to the trigger", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 180 });
  await page.goto("/projectile");
  const trigger = page.getByRole("button", { name: /放大視圖/ });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await expect(page.locator(".projectile-stage")).toHaveAttribute("data-expanded", "true");
  for (let i = 0; i < 16; i += 1) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.querySelector(".projectile-stage")!.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.locator(".projectile-stage")).toHaveAttribute("data-expanded", "false");
  await expect(trigger).toBeFocused();
});

for (const width of [360, 472, 820, 1280]) {
  test(`projectile: hover readout stays a compact card and time controls do not wrap or clip at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/projectile");
    const chart = page.locator('svg[role="img"]').first();
    // Pause first: the readout follows the pointer, and a loop restarting under it made this timing-dependent.
    const pause = page.getByRole("button", { name: "暫停", exact: true });
    if (await pause.count()) await pause.click();
    const box = (await chart.boundingBox())!;
    const tip = page.locator(".projectile-tip");
    // Move repeatedly: a pointer that arrives before hydration would otherwise never raise the readout.
    await expect(async () => {
      await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5);
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
      await expect(tip).toBeVisible({ timeout: 500 });
    }).toPass();
    // MathJax symbols inside the readout must not inherit the chart's fixed height.
    expect((await tip.boundingBox())!.height).toBeLessThan(400);

    const transport = (await page.locator(".projectile-transport").boundingBox())!;
    const play = (await page.locator('.projectile-transport-buttons button[aria-label="播放"], .projectile-transport-buttons button[aria-label="暫停"]').boundingBox())!;
    expect(play.height).toBeLessThan(50); // label on one line
    const speeds = (await page.locator(".projectile-transport-speeds").boundingBox())!;
    expect(speeds.x + speeds.width).toBeLessThanOrEqual(transport.x + transport.width + 1);
    const scrub = (await page.locator(".projectile-scrub").boundingBox())!;
    expect(scrub.width).toBeGreaterThan(Math.min(240, width * 0.6));
    await expect(page.locator(".projectile-path-card .card-label > span").first()).toHaveCSS("white-space", "nowrap");
  });
}
