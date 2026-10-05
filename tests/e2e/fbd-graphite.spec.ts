import { expect, test, type Page } from "@playwright/test";

async function enter(page: Page) {
  await page.goto("/fbd");
  await expect(page.locator("main")).toHaveAttribute("data-interactive", "true");
  await page.getByRole("button", { name: "開始選擇系統" }).click();
  await page.getByRole("button", { name: "選擇木塊為系統" }).click();
  for (const agent of ["地球", "桌面", "手"]) await page.getByRole("checkbox", { name: `${agent} ↔ 木塊`, exact: true }).check();
  await page.getByRole("button", { name: "用交互作用建立力圖" }).click();
}
async function addForce(page: Page, agent: string, kind: string, direction: string) {
  await page.getByRole("button", { name: `從 ${agent} ↔ 木塊 補一個力`, exact: true }).click();
  await page.getByLabel("力的種類").selectOption(kind);
  await page.getByRole("button", { name: direction, exact: true }).click();
}
const line = (page: Page) => page.locator('line[data-element-type="force-vector"]:not(.fbd-hit)');
async function geometry(page: Page, index = 0) {
  return line(page).nth(index).evaluate((l) => ["x1", "y1", "x2", "y2"].map((a) => Number(l.getAttribute(a))));
}
/** Drag the tip handle so the pointer ends at (dx, dy) in screen pixels from the particle anchor. */
async function dragTip(page: Page, dx: number, dy: number, steps = 8) {
  await page.locator("svg:has(.fbd-handle)").evaluate((el) => el.scrollIntoView({ block: "center" }));
  const anchor = await page.locator("svg:has(.fbd-handle) circle:not(.fbd-handle)").first().boundingBox();
  const handle = await page.locator(".fbd-handle").boundingBox();
  expect(anchor && handle).toBeTruthy();
  const ax = anchor!.x + anchor!.width / 2, ay = anchor!.y + anchor!.height / 2;
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(ax + dx, ay + dy, { steps });
  await page.mouse.up();
}

test("direct manipulation: select, drag direction, fixed anchor/length, magnitude unchanged @graphite", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enter(page);
  await addForce(page, "手", "applied", "向右");
  const [x1, y1, x2, y2] = await geometry(page);
  const length = Math.hypot(x2 - x1, y2 - y1);
  await expect(page.locator(".fbd-handle")).toHaveCount(1);

  await dragTip(page, 120, -120); // up-right 45deg (screen y is down)
  await expect(page.getByLabel("方向（度）")).toHaveValue("45");
  const after = await geometry(page);
  expect([after[0], after[1]]).toEqual([x1, y1]); // anchor fixed
  expect(Math.hypot(after[2] - after[0], after[3] - after[1])).toBeCloseTo(length, 5); // display length fixed
  await expect(page.getByText("力大小：未知")).toBeVisible(); // magnitude untouched

  // repeated drags, including a long overshoot and a pass through the anchor
  await dragTip(page, -300, 0);
  await expect(page.getByLabel("方向（度）")).toHaveValue("180");
  await dragTip(page, 0, 40);
  await expect(page.getByLabel("方向（度）")).toHaveValue("270");
  const last = await geometry(page);
  expect(Math.hypot(last[2] - last[0], last[3] - last[1])).toBeCloseTo(length, 5);
  expect(errors).toEqual([]);
});

test("non-horizontal direction and learning flow with dragged forces @graphite", async ({ page }) => {
  await enter(page);
  await addForce(page, "地球", "weight", "向下");
  await addForce(page, "桌面", "normal", "向下"); // learner starts wrong
  await addForce(page, "手", "applied", "向左");
  // select the normal force by clicking its arrow on the canvas
  await page.getByRole("button", { name: /正向力 ·/ }).click();
  await expect(page.locator(".fbd-handle")).toHaveCount(1);
  await dragTip(page, 0, -60); // straight up
  await expect(page.getByLabel("方向（度）")).toHaveValue("90");
  await page.getByRole("button", { name: /手的拉力 ·/ }).click();
  await dragTip(page, 80, 0); // right
  await expect(page.getByLabel("方向（度）")).toHaveValue("0");
  await dragTip(page, 100, -58); // ~30deg above horizontal: a non-horizontal direction is representable
  const deg = Number(await page.getByLabel("方向（度）").inputValue());
  expect(deg).toBeGreaterThanOrEqual(28);
  expect(deg).toBeLessThanOrEqual(32);
  await dragTip(page, 80, 0);
  await page.getByRole("button", { name: "提交我的力圖" }).click();
  await expect(page.locator(".fbd-handle")).toHaveCount(0); // not editable after commit
  await page.getByRole("button", { name: "比較交互作用與力" }).click();
  await expect(page.getByRole("heading", { name: "PASS：交互作用、力的身分與方向一致" })).toBeVisible();
  await page.getByRole("button", { name: "修正我的力圖" }).click();
  await expect(page.locator(".fbd-handle")).toHaveCount(1);
});

test("canvas cannot create anonymous forces; slider/button fallback still works @graphite", async ({ page }) => {
  await enter(page);
  const svg = page.locator('svg[viewBox="0 0 360 280"]');
  await svg.click({ position: { x: 300, y: 60 } });
  await expect(line(page)).toHaveCount(0);
  await addForce(page, "地球", "weight", "向下");
  await svg.click({ position: { x: 300, y: 60 } }); // empty canvas
  await expect(line(page)).toHaveCount(1);
  await page.getByLabel("方向（度）").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("方向（度）")).toHaveValue("271");
});

test("direct manipulation works with touch input on mobile @graphite @mobile", async ({ page }) => {
  await enter(page);
  await addForce(page, "手", "applied", "向右");
  const anchor = await page.locator("svg:has(.fbd-handle) circle:not(.fbd-handle)").first().boundingBox();
  const handle = await page.locator(".fbd-handle").boundingBox();
  const ax = anchor!.x + anchor!.width / 2, ay = anchor!.y + anchor!.height / 2;
  const hx = handle!.x + handle!.width / 2, hy = handle!.y + handle!.height / 2;
  await page.dispatchEvent(".fbd-handle", "pointerdown", { pointerId: 7, pointerType: "touch", isPrimary: true, button: 0, clientX: hx, clientY: hy, bubbles: true });
  await page.evaluate(([x, y]) => window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 7, pointerType: "touch", clientX: x, clientY: y })), [ax, ay - 70]);
  await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7, pointerType: "touch" })));
  await expect(page.getByLabel("方向（度）")).toHaveValue("90");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
