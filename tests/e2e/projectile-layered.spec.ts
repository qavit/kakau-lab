import { expect, test } from "@playwright/test";

const viewports = [
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];

for (const viewport of viewports) {
  test(`workspace and disclosure ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/projectile");
    await expect(page.locator("main")).toHaveAttribute("data-interactive", "true");
    const chart = page.locator(".projectile-path-card");
    const dock = page.locator(".projectile-dock");
    const chartBox = await chart.boundingBox();
    const dockBox = await dock.boundingBox();
    expect(chartBox && dockBox && dockBox.y >= chartBox.y + chartBox.height - 2).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `evidence/gate-a-projectile-${viewport.width}x${viewport.height}.png` });

    await page.getByRole("button", { name: "探索任務", exact: true }).click();
    for (const [activity, answer] of [
      ["最高點時，速度是零嗎？", "不會，只有垂直速度變成 0"],
      ["30° 和 60° 會落在同一點嗎？", "射程相同，但 60° 飛得比較久"],
      ["把發射點抬高，規則還成立嗎？", "不再相同"],
    ] as const) {
      await page.getByRole("button", { name: new RegExp(activity.replace(/[?？.]/g, ".")) }).first().click();
      await expect(page.getByRole("button", { name: "理論與計算", exact: true })).toBeDisabled();
      await expect(page.getByRole("slider", { name: "時間游標" })).toBeDisabled();
      await expect(page.locator(".projectile-masked-readout")).toBeVisible();
      if (viewport.width === 360 && activity.includes("最高點")) await page.screenshot({ path: "evidence/gate-a-projectile-guided-predict-360x800.png" });
      await page.getByRole("button", { name: "工具", exact: true }).click();
      await expect(page.getByRole("button", { name: "分享設定", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /匯出軌跡/ })).toHaveCount(0);
      await page.getByRole("button", { name: "工具", exact: true }).click();
      if (activity.includes("30°") || activity.includes("抬高")) {
        await expect(page.locator(".projectile-path-card path[stroke='#f2c66d']")).toHaveCount(0);
      }
      await page.getByRole("button", { name: answer, exact: true }).click();
      await expect(page.getByRole("button", { name: "理論與計算", exact: true })).toBeEnabled();
      await expect(page.getByRole("slider", { name: "時間游標" })).toBeEnabled();
      await expect(page.locator(".projectile-masked-readout")).toHaveCount(0);
    }

    await page.getByRole("button", { name: "自由探索", exact: true }).click();
    const slider = page.getByRole("slider", { name: "時間游標" });
    await slider.fill("0.62");
    const before = await slider.inputValue();
    await page.getByRole("button", { name: "放大", exact: true }).click();
    await expect(page.getByRole("button", { name: "回到預設視圖" })).toHaveClass(/active/);
    const expand = page.getByRole("button", { name: "放大視圖", exact: true });
    await expand.click();
    await expect(page.locator(".projectile-stage")).toHaveAttribute("data-expanded", "true");
    if (viewport.width === 360) await page.screenshot({ path: "evidence/gate-a-projectile-expanded-360x800.png" });
    await expect(slider).toHaveValue(before);
    await expect(page.getByRole("button", { name: "回到預設視圖" })).toHaveClass(/active/);
    await expect(page.getByRole("button", { name: "退出放大" })).toBeFocused();
    await page.evaluate(() => {
      Object.defineProperty(document.documentElement, "requestFullscreen", { value: () => Promise.reject(new Error("blocked")), configurable: true });
    });
    await page.getByRole("button", { name: "全螢幕", exact: true }).click();
    await expect(page.locator(".projectile-expand-notice")).toContainText("視窗內放大仍可使用");
    await page.keyboard.press("Escape");
    await expect(page.locator(".projectile-stage")).toHaveAttribute("data-expanded", "false");
    await expect(expand).toBeFocused();
    await expect(slider).toHaveValue(before);
    await expect(page.getByRole("button", { name: "回到預設視圖" })).toHaveClass(/active/);
  });
}
