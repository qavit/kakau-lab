import { expect, test, type Page } from "@playwright/test";

/* Screenshots are written only on request, so an ordinary run never touches tracked files. */
const evidenceDir = process.env.GATE_A_EVIDENCE_DIR;
const shot = async (page: Page, name: string) => { if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/${name}` }); };

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
    await shot(page, `gate-a-projectile-${viewport.width}x${viewport.height}.png`);

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
      if (viewport.width === 360 && activity.includes("最高點")) await shot(page, "gate-a-projectile-guided-predict-360x800.png");
      await page.getByRole("button", { name: "工具", exact: true }).click();
      await expect(page.getByRole("button", { name: "分享設定", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /匯出軌跡/ })).toHaveCount(0);
      await expect(page.locator(".projectile-menu-note")).toContainText("不提供分享與匯出");
      await page.getByRole("button", { name: "工具", exact: true }).click();
      if (activity.includes("30°") || activity.includes("抬高")) {
        await expect(page.locator(".projectile-path-card path[stroke='#f2c66d']")).toHaveCount(0);
      }
      await page.getByRole("button", { name: answer, exact: true }).click();
      await expect(page.getByRole("button", { name: "理論與計算", exact: true })).toBeEnabled();
      await expect(page.getByRole("slider", { name: "時間游標" })).toBeEnabled();
      await expect(page.locator(".projectile-masked-readout")).toHaveCount(0);
    }

    // Leaving a task with a committed prediction asks first; declining keeps the task and its phase.
    await page.getByRole("button", { name: "自由探索", exact: true }).click();
    const leave = page.getByRole("alertdialog", { name: "離開探索任務" });
    await expect(leave).toBeVisible();
    await expect(leave.getByRole("button", { name: "繼續任務" })).toBeFocused();
    await leave.getByRole("button", { name: "繼續任務" }).click();
    await expect(page.locator(".guided-side")).toBeVisible();
    await expect(page.locator(".projectile-masked-readout")).toHaveCount(0);
    await page.getByRole("button", { name: "自由探索", exact: true }).click();
    await leave.getByRole("button", { name: "離開任務" }).click();
    await expect(page.locator(".guided-side")).toHaveCount(0);

    // Core controls stay reachable: playback speed at every size, and the first parameter slider
    // lands on screen together with the trajectory when the panel opens.
    await expect(page.getByRole("button", { name: "2×", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "參數", exact: true }).click();
    const firstParameter = page.locator(".projectile-side[data-open='true'] input[type='range']").first();
    await expect(firstParameter).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("img", { name: /拋體運動軌跡圖/ })).toBeInViewport({ ratio: 0.6 });
    await page.getByRole("button", { name: "參數", exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 0));

    const slider = page.getByRole("slider", { name: "時間游標" });
    await slider.fill("0.62");
    const before = await slider.inputValue();
    await page.getByRole("button", { name: "放大", exact: true }).click();
    await expect(page.getByRole("button", { name: "回到預設視圖" })).toHaveClass(/active/);
    const expand = page.getByRole("button", { name: "放大視圖", exact: true });
    await expand.click();
    await expect(page.locator(".projectile-stage")).toHaveAttribute("data-expanded", "true");
    if (viewport.width === 360) await shot(page, "gate-a-projectile-expanded-360x800.png");
    await expect(slider).toHaveValue(before);
    await expect(page.getByRole("button", { name: "回到預設視圖" })).toHaveClass(/active/);
    await expect(page.getByRole("button", { name: "退出放大" })).toBeFocused();
    for (let press = 0; press < 24; press += 1) {
      await page.keyboard.press("Tab");
      // Focus may pass through the document itself when it wraps, but never lands on a control behind the view.
      expect(await page.evaluate(() => document.activeElement === document.body || Boolean(document.activeElement?.closest(".projectile-stage[data-expanded='true']")))).toBe(true);
    }
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
