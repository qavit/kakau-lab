// QA round 3 (2026-11-18): Guided flow, evidence policy / anti-leak, retry, mode switching, keyboard.
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const ACTIVITIES = [
  { n: 1, title: "最高點時", predict: "不會，只有垂直速度變成 0" },
  { n: 2, title: "30° 和 60°", predict: "射程相同，但 60° 飛得比較久" },
  { n: 3, title: "把發射點抬高", predict: "不再相同" },
] as const;
const VIEWPORTS = [{ width: 1366, height: 768 }, { width: 390, height: 844 }];
// Anything numeric/derived that the student must not see before predicting.
// (Question/choice wording and slider tick labels are legitimately visible, so they are not tokens.)
const LEAK = /vₓ|vᵧ|最遠射程|θ\s*∗|θ\*|不再是 45|互補角對照|向下加速度|30° 射程|60° 射程|\d+\.\d{1,2} m\b|t\s*=\s*\d/;

async function openGuided(page: Page, viewport = VIEWPORTS[0]) {
  await page.setViewportSize(viewport);
  await page.goto("/projectile");
  await expect(page.locator("main")).toHaveAttribute("data-interactive", "true");
  await page.getByRole("button", { name: "探索任務", exact: true }).click();
}
const pick = (page: Page, title: string) => page.locator("button", { hasText: title }).first().click();
// Text a user or assistive tech can actually reach: rendered, not inert, not aria-hidden.
const visibleText = (page: Page) => page.evaluate(() => {
  const out: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || ["SCRIPT", "STYLE"].includes(el.tagName)) continue;
    if (el.closest("[inert],[aria-hidden='true']")) continue;
    if (!el.checkVisibility()) continue;
    out.push(n.textContent ?? "");
  }
  return out.join(" ");
});

for (const viewport of VIEWPORTS) {
  for (const a of ACTIVITIES) {
    test(`predict phase leaks no result, readout or free-state control: activity ${a.n} @${viewport.width}`, async ({ page }) => {
      await openGuided(page, viewport);
      await pick(page, a.title);
      // Only the question + choices are visible; scan visible text only (display:none is not user-visible).
      const body = await visibleText(page);
      expect(body).not.toMatch(LEAK);
      await expect(page.getByRole("slider", { name: "時間游標" })).toBeDisabled();
      await expect(page.locator(".projectile-readout")).toContainText("將在送出預測後顯示");
      // Free-exploration doors stay shut: layers, share/export, theory/model info.
      await expect(page.getByRole("button", { name: "圖層", exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "工具", exact: true }).click();
      for (const name of ["分享設定", "匯出軌跡資料 JSON / Export data", "匯出軌跡圖 SVG / Export figure"]) await expect(page.getByRole("button", { name: new RegExp(name.split(" ")[0]) })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "模型資訊", exact: true })).toBeDisabled();
      await expect(page.locator(".projectile-menu-note")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "理論與計算", exact: true })).toBeDisabled();
    });
  }
}

test("activity 1: predict → gated manipulate → observe → explain → complete; reveals only after the gate", async ({ page }) => {
  await openGuided(page);
  await pick(page, ACTIVITIES[0].title);
  await page.getByRole("button", { name: ACTIVITIES[0].predict, exact: true }).click();
  const slider = page.getByRole("slider", { name: "時間游標" });
  await expect(slider).toBeEnabled();
  // Not at apex yet → the comparison of v_x / v_y must still be withheld.
  await slider.fill("0.05");
  await expect(page.getByRole("button", { name: "我看到了，繼續", exact: true })).toHaveCount(0);
  await expect(page.locator(".guided-side")).not.toContainText("向下加速度");
  await slider.fill("0.5");
  // Detector sanity: after the gate the same scan DOES find result tokens (so the predict-phase "clean" is meaningful).
  expect(await visibleText(page)).toMatch(LEAK);
  await expect(page.getByRole("button", { name: "我看到了，繼續", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "我看到了，繼續", exact: true }).click();
  await page.getByRole("group", { name: "你的解釋" }).getByRole("button").first().click();
  await expect(page.locator(".guided-complete")).toBeVisible();
  await expect(page.locator(".guided-side")).toContainText("你的預測");
});

test("activity 2: observe is masked until prediction; playback + table then explain", async ({ page }) => {
  await openGuided(page);
  await pick(page, ACTIVITIES[1].title);
  await expect(page.locator(".guided-side table")).toHaveCount(0);
  await page.getByRole("button", { name: ACTIVITIES[1].predict, exact: true }).click();
  await page.getByRole("button", { name: "從起點同時播放", exact: true }).click();
  await expect(page.locator(".guided-side table")).toBeVisible();
  await expect(page.locator(".guided-side")).toContainText("飛行時間");
  await page.getByRole("button", { name: /整理觀測並解釋/ }).click();
  await page.getByRole("group", { name: "你的解釋" }).getByRole("button").first().click();
  await expect(page.locator(".guided-complete")).toBeVisible();
});

test("activity 3: result withheld until h≈25 m; then reveals; completes", async ({ page }) => {
  await openGuided(page);
  await pick(page, ACTIVITIES[2].title);
  await page.getByRole("button", { name: ACTIVITIES[2].predict, exact: true }).click();
  await expect(page.getByRole("button", { name: /比較假設，繼續/ })).toHaveCount(0);
  await expect(page.locator(".guided-side")).not.toContainText("30° 射程");
  let h = page.locator('input[aria-label="發射高度 h"]:visible').first();
  if (!(await h.count())) { await page.getByRole("button", { name: "參數", exact: true }).click(); h = page.locator('input[aria-label="發射高度 h"]:visible').first(); }
  await h.fill("25");
  await expect(page.getByRole("button", { name: /比較假設，繼續/ })).toBeVisible();
  await page.getByRole("button", { name: /比較假設，繼續/ }).click();
  await page.getByRole("group", { name: "你的解釋" }).getByRole("button").first().click();
  await expect(page.locator(".guided-complete")).toBeVisible();
});

test("restart clears prediction; leaving mid-task asks first; cancel keeps progress; leave restores free state", async ({ page }) => {
  await openGuided(page);
  await pick(page, ACTIVITIES[0].title);
  await page.getByRole("button", { name: ACTIVITIES[0].predict, exact: true }).click();
  await page.getByRole("button", { name: /重新開始此任務/ }).click();
  await expect(page.getByRole("group", { name: "你的預測" })).toBeVisible();
  await expect(page.getByRole("slider", { name: "時間游標" })).toBeDisabled();
  await page.getByRole("button", { name: ACTIVITIES[0].predict, exact: true }).click();
  await page.getByRole("button", { name: "自由探索", exact: true }).click();
  const dialog = page.getByRole("alertdialog", { name: "離開探索任務" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "繼續任務" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".guided-side")).toContainText("你的預測");
  await page.getByRole("button", { name: "自由探索", exact: true }).click();
  await page.getByRole("button", { name: "離開任務" }).click();
  await expect(page.getByRole("button", { name: "工具", exact: true })).toBeVisible();
  await expect(page.locator(".guided-side")).toHaveCount(0);
});

test("keyboard only: choose a prediction with Tab/Enter", async ({ page }) => {
  await openGuided(page);
  await pick(page, ACTIVITIES[0].title);
  const choice = page.getByRole("button", { name: ACTIVITIES[0].predict, exact: true });
  await choice.focus();
  await expect(choice).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("slider", { name: "時間游標" })).toBeEnabled();
});

test("answers never reach share URL or exports after a completed task", async ({ page }) => {
  await openGuided(page);
  await pick(page, ACTIVITIES[0].title);
  await page.getByRole("button", { name: ACTIVITIES[0].predict, exact: true }).click();
  await page.getByRole("slider", { name: "時間游標" }).fill("0.5");
  await page.getByRole("button", { name: "我看到了，繼續", exact: true }).click();
  const explanation = page.getByRole("group", { name: "你的解釋" }).getByRole("button").first();
  const explanationText = (await explanation.innerText()).trim();
  await explanation.click();
  await expect(page.locator(".guided-complete")).toBeVisible();
  await page.getByRole("button", { name: "自由探索", exact: true }).click();
  // (completed task: leaving needs no confirm; if one appears, accept it)
  const leave = page.getByRole("button", { name: "離開任務" });
  if (await leave.isVisible().catch(() => false)) await leave.click();
  await page.getByRole("button", { name: "工具", exact: true }).click();
  await page.getByRole("button", { name: /分享設定/ }).click();
  const url = decodeURIComponent(await page.locator(".projectile-share-notice input").inputValue());
  for (const secret of [ACTIVITIES[0].predict, explanationText, "vertical-only", "prediction", "explanation", "student"]) expect(url).not.toContain(secret);
  await page.getByRole("button", { name: "工具", exact: true }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "匯出軌跡資料 JSON / Export data", exact: true }).click();
  const json = await readFile((await (await dl).path())!, "utf8");
  for (const secret of [ACTIVITIES[0].predict, explanationText, "vertical-only", "prediction", "explanation", "student"]) expect(json).not.toContain(secret);
});

test("session progress is not persisted: reload returns to free mode with no task state", async ({ page }) => {
  await openGuided(page);
  await pick(page, ACTIVITIES[0].title);
  await page.getByRole("button", { name: ACTIVITIES[0].predict, exact: true }).click();
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/vertical-only|prediction|不會，只有/);
  await page.reload();
  await expect(page.locator("main")).toHaveAttribute("data-interactive", "true");
  await expect(page.locator(".guided-side")).toHaveCount(0);
});
