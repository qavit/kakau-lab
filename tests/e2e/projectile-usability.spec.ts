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
