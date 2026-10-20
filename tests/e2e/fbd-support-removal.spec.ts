import { expect, test, type Page } from "@playwright/test";

async function enterBaseline(page: Page) {
  await page.goto("/fbd");
  await page.getByRole("button", { name: "開始選擇系統" }).click();
  await page.getByRole("button", { name: "選擇木塊為系統" }).click();
  for (const agent of ["地球", "桌面"]) await page.getByRole("checkbox", { name: `${agent} ↔ 木塊`, exact: true }).check();
  await page.getByRole("button", { name: "用交互作用建立力圖" }).click();
}

async function addForce(page: Page, agent: string, kind: string, direction: string) {
  await page.getByRole("button", { name: `從 ${agent} ↔ 木塊 補一個力`, exact: true }).click();
  await page.getByLabel("力的種類").selectOption(kind);
  await page.getByRole("button", { name: direction, exact: true }).click();
}

async function passBaseline(page: Page) {
  await addForce(page, "地球", "weight", "向下");
  await addForce(page, "桌面", "normal", "向上");
  await page.getByRole("button", { name: "提交我的力圖" }).click();
  await page.getByRole("button", { name: "比較交互作用與力" }).click();
  await expect(page.getByRole("heading", { name: /PASS：交互作用/ })).toBeVisible();
}

test("remove support: wrong prediction, old normal diagnosis, revision, then evidence", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enterBaseline(page);
  await expect(page.getByRole("button", { name: "撤走桌面，開始下一段" })).toHaveCount(0);
  await passBaseline(page);
  await expect(page.getByText("待修正")).toHaveCount(0); // PASS: no diagnostic wall
  await page.getByRole("button", { name: "撤走桌面，開始下一段" }).click();
  await expect(page.getByRole("heading", { name: "情境：桌面剛從木塊下方撤走" })).toBeVisible();
  await expect(page.getByRole("group", { name: /木塊自由體圖/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "物理證據" })).toHaveCount(0);
  await page.getByRole("button", { name: "先做預測" }).click();
  await expect(page.getByRole("button", { name: "保存預測並修訂模型" })).toBeDisabled();
  await page.getByLabel("哪個交互作用會消失？").selectOption("earth");
  await page.getByLabel("哪個交互作用仍存在？").selectOption("table");
  await page.getByLabel("物塊接下來的運動？").selectOption("stay");
  await page.getByLabel("為什麼這樣預測？").fill("我猜原來的平衡會維持。");
  await expect(page.getByRole("region", { name: "物理證據" })).toHaveCount(0);
  await page.getByRole("button", { name: "保存預測並修訂模型" }).click();
  await expect(page.getByRole("checkbox", { name: "桌面 ↔ 木塊（桌面已撤走）" })).toBeChecked();
  await expect(page.getByRole("button", { name: /正向力 ·/ })).toBeVisible(); // not silently erased
  await expect(page.getByRole("region", { name: "物理證據" })).toHaveCount(0);
  await page.getByRole("button", { name: "提交我的力圖" }).click();
  await page.getByRole("button", { name: "比較交互作用與力" }).click();
  await expect(page.locator('[data-code="inactive-agent-force"]')).toContainText("正向力");
  await expect(page.getByRole("region", { name: "物理證據" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "修正我的力圖" })).toHaveCount(1); // failing result: one next step
  await page.getByRole("button", { name: "修正我的力圖" }).click();
  await expect(page.getByRole("status", { name: "上次待修正" })).toContainText("正向力"); // last issues stay visible while repairing
  await page.getByRole("checkbox", { name: "桌面 ↔ 木塊（桌面已撤走）" }).uncheck();
  await expect(page.getByRole("button", { name: /正向力 ·/ })).toHaveCount(0);
  await page.getByRole("button", { name: "提交我的力圖" }).click();
  await page.getByRole("button", { name: "比較交互作用與力" }).click();
  await expect(page.getByRole("heading", { name: /PASS：交互作用/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "物理證據" })).toContainText("−mg");
  await expect(page.getByRole("region", { name: "物理證據" })).toContainText("−g");
  await expect(page.getByRole("region", { name: "物理證據" })).toContainText("我猜原來的平衡會維持。");
  await expect(page.getByRole("status", { name: "上次待修正" })).toHaveCount(0); // reminder cleared after resubmit
  await page.getByRole("button", { name: "完成，重新練習一次" }).click();
  await expect(page.getByRole("heading", { name: "情境：靜止在水平桌面上的木塊" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("remove support: missing gravity and invented acceleration can be corrected; restart returns to baseline", async ({ page }) => {
  await enterBaseline(page);
  await passBaseline(page);
  await page.getByRole("button", { name: "撤走桌面，開始下一段" }).click();
  await page.getByRole("button", { name: "先做預測" }).click();
  await page.getByLabel("哪個交互作用會消失？").selectOption("table");
  await page.getByLabel("哪個交互作用仍存在？").selectOption("earth");
  await page.getByLabel("物塊接下來的運動？").selectOption("down");
  await page.getByLabel("為什麼這樣預測？").fill("桌面不再接觸木塊。");
  await page.getByRole("button", { name: "保存預測並修訂模型" }).click();
  await page.getByRole("checkbox", { name: "桌面 ↔ 木塊（桌面已撤走）" }).uncheck();
  await page.getByRole("button", { name: /重力 ·/ }).click();
  await page.getByRole("button", { name: "刪除選取的力" }).click();
  await addForce(page, "地球", "other", "向下");
  await page.getByRole("button", { name: "提交我的力圖" }).click();
  await page.getByRole("button", { name: "比較交互作用與力" }).click();
  await expect(page.locator('[data-code="missing-force"]')).toContainText("重力");
  await expect(page.locator('[data-code="extra-force"]')).toContainText("加速度");
  await page.getByRole("button", { name: "修正我的力圖" }).click();
  await page.getByRole("button", { name: "刪除選取的力" }).click();
  await addForce(page, "地球", "weight", "向下");
  await page.getByRole("button", { name: "提交我的力圖" }).click();
  await page.getByRole("button", { name: "比較交互作用與力" }).click();
  await expect(page.getByRole("region", { name: "物理證據" })).toBeVisible();
  await page.getByRole("button", { name: "重新開始" }).click();
  await expect(page.getByRole("heading", { name: "情境：靜止在水平桌面上的木塊" })).toBeVisible();
  await expect(page.getByRole("region", { name: "物理證據" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "開始選擇系統" })).toBeVisible();
});
