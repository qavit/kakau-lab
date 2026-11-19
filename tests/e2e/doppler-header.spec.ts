import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Header interaction contract: theory, tools, language and appearance.
 *  - Tooltips follow hover and Tab / Shift+Tab focus only; Esc dismisses; leaving or using the control ends them.
 *  - The three drop-downs (tools, language, and the shared appearance menu) open, close, return focus and exclude one another
 *    the same way, are fully keyboard operable, never trap Tab, and expose nothing focusable while closed.
 */
async function open(page: Page) {
  await page.goto("/doppler");
  await expect(page.locator("main")).toHaveAttribute("data-interactive", "true");
}

const header = (page: Page) => page.locator(".header-actions");
const theory = (page: Page) => header(page).getByRole("button", { name: "理論與模型", exact: true });
const tools = (page: Page) => header(page).getByRole("button", { name: "工具", exact: true });
const language = (page: Page) => header(page).getByRole("button", { name: /^語言：/ });
const appearance = (page: Page) => header(page).getByRole("button", { name: /^外觀：/ });
const tipShown = (control: Locator) => control.evaluate((el) => getComputedStyle(el.closest(".doppler-tip")!, "::after").display !== "none");
const expanded = (control: Locator) => control.getAttribute("aria-expanded");
const themeList = (page: Page) => page.locator(".theme-menu__list");

/** Programmatic focus puts the cursor at the stop before the theory button without raising anything. */
async function startBeforeHeader(page: Page) {
  await page.getByRole("button", { name: "探索任務" }).focus();
}

test("keyboard: every header control is reachable in order, tooltips follow Tab and Shift+Tab, nothing hidden takes focus", async ({ page }) => {
  await open(page);
  await expect(page.locator(".doppler-menu-list")).toHaveCount(0); // closed menus render no items at all
  await startBeforeHeader(page);
  const stops: [Locator, boolean][] = [[theory(page), true], [tools(page), true], [language(page), true], [appearance(page), true]];
  for (const [control] of stops) {
    await page.keyboard.press("Tab");
    await expect(control).toBeFocused();
    await expect.poll(() => tipShown(control)).toBe(true);
  }
  // Tabbing on leaves the header and the last tooltip goes away; Shift+Tab walks back and raises each again.
  await page.keyboard.press("Tab");
  await expect.poll(() => tipShown(appearance(page))).toBe(false);
  await page.keyboard.press("Shift+Tab");
  await expect(appearance(page)).toBeFocused();
  await expect.poll(() => tipShown(appearance(page))).toBe(true);
  await page.keyboard.press("Shift+Tab");
  await expect(language(page)).toBeFocused();
  await expect.poll(() => tipShown(language(page))).toBe(true);
  await expect.poll(() => tipShown(appearance(page))).toBe(false);
});

test("tooltip: hover, focus, Escape and leaving behave the same; a script's focus right after a Tab never raises one", async ({ page }) => {
  await open(page);
  // Hover.
  await tools(page).hover();
  await expect.poll(() => tipShown(tools(page))).toBe(true);
  await page.keyboard.press("Escape");
  await expect.poll(() => tipShown(tools(page))).toBe(false);
  await page.mouse.move(0, 500);
  await tools(page).hover();
  await expect.poll(() => tipShown(tools(page))).toBe(true); // re-entering shows it again
  await page.mouse.move(0, 500);
  await expect.poll(() => tipShown(tools(page))).toBe(false);
  // Tab focus: Escape dismisses, focus stays; moving on and back restores.
  await startBeforeHeader(page);
  await page.keyboard.press("Tab");
  await expect.poll(() => tipShown(theory(page))).toBe(true);
  await page.keyboard.press("Escape");
  await expect.poll(() => tipShown(theory(page))).toBe(false);
  await expect(theory(page)).toBeFocused();
  // The defect a time window would have: focus moved by a script in the same breath as a Tab must not look like navigation.
  await page.keyboard.press("Tab"); // now on tools, with its tooltip
  await expect(tools(page)).toBeFocused();
  await page.evaluate(() => (document.querySelector('.header-actions button[aria-label^="語言"]') as HTMLElement).focus());
  await expect(language(page)).toBeFocused();
  await expect.poll(() => tipShown(language(page))).toBe(false);
  await expect.poll(() => tipShown(tools(page))).toBe(false);
  // A real Tab afterwards does.
  await page.keyboard.press("Tab");
  await expect(appearance(page)).toBeFocused();
  await expect.poll(() => tipShown(appearance(page))).toBe(true);
  // A click ends it, and the focus a click leaves behind raises nothing.
  await theory(page).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(theory(page)).toBeFocused();
  await page.mouse.move(0, 500);
  await expect.poll(() => tipShown(theory(page))).toBe(false);
});

for (const [name, trigger, items] of [
  ["tools", tools, [/分享起始設定/, /匯出教學圖/, /匯出事件資料/]],
  ["language", language, ["繁體中文", "English"]],
] as const) {
  test(`${name} drop-down: Enter/Arrow open, Arrow/Home/End move, Escape returns focus, Tab leaves and closes`, async ({ page }) => {
    await open(page);
    const button = trigger(page);
    await startBeforeHeader(page);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    if (name === "language") await page.keyboard.press("Tab");
    await expect(button).toBeFocused();
    expect(await expanded(button)).toBe("false");

    // Enter opens without moving focus; the tooltip steps aside; ArrowDown enters the list.
    await page.keyboard.press("Enter");
    expect(await expanded(button)).toBe("true");
    await expect(button).toBeFocused();
    expect(await tipShown(button)).toBe(false);
    const list = page.locator(".doppler-menu-list");
    const item = (i: number) => (typeof items[i] === "string" ? list.getByRole(i === 0 ? "button" : "link", { name: items[i] as string }) : list.getByRole("button", { name: items[i] as RegExp }));
    await page.keyboard.press("ArrowDown");
    await expect(item(0)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(item(1)).toBeFocused();
    await page.keyboard.press("End");
    await expect(item(items.length - 1)).toBeFocused();
    await page.keyboard.press("ArrowDown"); // wraps
    await expect(item(0)).toBeFocused();
    await page.keyboard.press("ArrowUp"); // wraps back
    await expect(item(items.length - 1)).toBeFocused();
    await page.keyboard.press("Home");
    await expect(item(0)).toBeFocused();

    // Escape closes and returns focus to the trigger.
    await page.keyboard.press("Escape");
    expect(await expanded(button)).toBe("false");
    await expect(list).toHaveCount(0);
    await expect(button).toBeFocused();

    // ArrowUp on the trigger opens and lands on the last item; Tab from there leaves the menu (no trap) and closes it.
    await page.keyboard.press("ArrowUp");
    expect(await expanded(button)).toBe("true");
    await expect(item(items.length - 1)).toBeFocused();
    await page.keyboard.press("Tab");
    expect(await expanded(button)).toBe("false");
    await expect(list).toHaveCount(0);
    await expect(button).not.toBeFocused();
    const next = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName);
    expect(next).toBeTruthy();
    // Shift+Tab from inside the open menu leaves it the other way.
    await button.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Shift+Tab");
    await expect(button).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(await expanded(button)).toBe("false");
  });
}

test("the three menus exclude one another by pointer, close on an outside press, and Escape restores focus to the right trigger", async ({ page }) => {
  await open(page);
  await tools(page).click();
  expect(await expanded(tools(page))).toBe("true");
  await language(page).click();
  expect(await expanded(tools(page))).toBe("false");
  expect(await expanded(language(page))).toBe("true");
  await appearance(page).click();
  expect(await expanded(language(page))).toBe("false");
  await expect(themeList(page)).toBeVisible();
  await tools(page).click();
  await expect(themeList(page)).toHaveCount(0);
  expect(await expanded(tools(page))).toBe("true");
  // Only one list is ever on screen.
  await expect(page.locator(".doppler-menu-list")).toHaveCount(1);
  // An outside press closes whichever is open.
  await page.getByTestId("wavefront-view").click({ position: { x: 40, y: 40 } });
  expect(await expanded(tools(page))).toBe("false");
  await language(page).click();
  await page.getByTestId("time-band").click({ position: { x: 40, y: 20 } });
  expect(await expanded(language(page))).toBe("false");
  await appearance(page).click();
  await expect(themeList(page)).toBeVisible();
  await page.getByTestId("wavefront-view").click({ position: { x: 40, y: 40 } });
  await expect(themeList(page)).toHaveCount(0);
  // Escape returns focus to each trigger.
  for (const control of [tools(page), language(page), appearance(page)]) {
    await control.click();
    await page.keyboard.press("Escape");
    await expect(control).toBeFocused();
  }
});

test("appearance (the shared menu, unchanged) behaves under the same rules from the keyboard", async ({ page }) => {
  await open(page);
  await startBeforeHeader(page);
  for (let i = 0; i < 4; i += 1) await page.keyboard.press("Tab");
  await expect(appearance(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(themeList(page)).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(themeList(page).getByRole("button").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(themeList(page)).toHaveCount(0);
  await expect(appearance(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(themeList(page)).toBeVisible();
  await page.keyboard.press("ArrowDown");
  // Tab walks the options (as in the drop-downs above) and leaves after the last one: it closes, there is no trap.
  const options = await themeList(page).getByRole("button").count();
  for (let i = 0; i < options; i += 1) await page.keyboard.press("Tab");
  await expect(themeList(page)).toHaveCount(0);
});

test("language drop-down shows the current language code, marks it, and switching keeps the starting experiment", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "觀察者靠近", exact: true }).click();
  await expect(language(page)).toHaveText("ZH");
  await language(page).click();
  const list = page.locator(".doppler-menu-list");
  await expect(list.getByRole("button", { name: "繁體中文" })).toHaveAttribute("aria-pressed", "true");
  const link = list.getByRole("link", { name: "English" });
  await expect(link).toHaveAttribute("href", /^\/en\/doppler\?s=/);
  const shared = JSON.parse(new URL(await link.getAttribute("href") as string, "http://x").searchParams.get("s")!);
  expect(shared.setup).toMatchObject({ us: 0, uo: -0.2 });
  expect(shared.preset).toBe("observerApproach");
  await link.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/en/doppler");
  await expect(page.locator(".header-actions").getByRole("button", { name: /^Language：/ })).toHaveText("EN");
  await expect(page.getByRole("button", { name: "Observer approaches" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("clock")).toContainText("0.00 /"); // the starting setup, paused at t = 0
  // Choosing the current language only closes the menu.
  await page.locator(".header-actions").getByRole("button", { name: /^Language：/ }).click();
  await page.locator(".doppler-menu-list").getByRole("button", { name: "English" }).click();
  await expect(page.locator(".doppler-menu-list")).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe("/en/doppler");
});
