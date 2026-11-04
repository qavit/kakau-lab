import { expect, test, type Page } from "@playwright/test";

// W45: Catalog and the five model workspaces share one ThemeToggle menu at the end of the header.
const pages = [
  { name: "Catalog", path: "/", locale: "zh" },
  { name: "Projectile", path: "/projectile", locale: "zh" },
  { name: "Solar", path: "/solar", locale: "zh" },
  { name: "Atmosphere zh", path: "/atmosphere-profile", locale: "zh" },
  { name: "Atmosphere en", path: "/en/atmosphere-profile", locale: "en" },
  { name: "Electrostatics", path: "/electrostatics", locale: "zh" },
  { name: "Interference", path: "/interference", locale: "zh" },
] as const;
const labels = { zh: { light: "亮色", dark: "暗色", system: "跟隨系統" }, en: { light: "Light", dark: "Dark", system: "System" } } as const;

const trigger = (page: Page) => page.locator(".theme-menu__trigger");
const option = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).locator("visible=true");
const mode = (page: Page) => page.evaluate(() => document.documentElement.getAttribute("data-mode"));

// Solar boots a WebGL scene on every load; give the longer keyboard walk room on a busy machine.
test.describe.configure({ timeout: 60_000 });

for (const entry of pages) {
  const text = labels[entry.locale];

  test(`ThemeMenu ${entry.name}: one 44px control at the end of the header, closed list is not focusable`, async ({ page }) => {
    await page.goto(entry.path);
    await expect(trigger(page)).toHaveCount(1);
    await expect(page.locator(".theme-switcher")).toHaveCount(0);
    const box = await trigger(page).boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    // Last element of its action row, and no other control in that row sits further right on one line.
    expect(await page.evaluate(() => { const m = document.querySelector(".theme-menu")!; return m.parentElement!.lastElementChild === m; })).toBe(true);
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".theme-menu__list")).toHaveCount(0);
    await expect(page.locator(".theme-menu__option")).toHaveCount(0);
  });

  test(`ThemeMenu ${entry.name}: keyboard, Escape, outside click, focus return and aria-pressed`, async ({ page }) => {
    await page.goto(entry.path);
    await page.evaluate(() => { localStorage.removeItem("mode"); document.documentElement.removeAttribute("data-mode"); });
    await page.reload({ waitUntil: "networkidle" });

    // Enter opens; options are labelled in the page language and the stored "system" choice is marked.
    await trigger(page).focus();
    await page.keyboard.press("Enter");
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
    for (const label of Object.values(text)) await expect(option(page, label)).toBeVisible();
    await expect(option(page, text.system)).toHaveAttribute("aria-pressed", "true");
    await expect(option(page, text.light)).toHaveAttribute("aria-pressed", "false");

    // Escape closes and returns focus to the trigger.
    await page.keyboard.press("Escape");
    await expect(page.locator(".theme-menu__list")).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");

    // Space opens too; ArrowUp/Down walk the options; Tab inside the open list stays in the widget.
    await page.keyboard.press("Space");
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Tab");
    await expect(option(page, text.light)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(option(page, text.dark)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(option(page, text.light)).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(trigger(page)).toBeFocused();

    // Outside click closes.
    await page.mouse.click(2, 2);
    await expect(page.locator(".theme-menu__list")).toHaveCount(0);

    // Dark by Enter: applied, stored, menu closed, focus back on the trigger, label reflects the choice.
    await trigger(page).focus();
    await page.keyboard.press("ArrowDown");
    await expect(option(page, text.system)).toBeFocused(); // ArrowDown from the trigger lands on the selected row
    await page.keyboard.press("ArrowUp");
    await expect(option(page, text.dark)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator(".theme-menu__list")).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    expect(await mode(page)).toBe("dark");
    expect(await page.evaluate(() => localStorage.getItem("mode"))).toBe("dark");
    await expect(trigger(page)).toHaveAttribute("aria-label", new RegExp(text.dark));

    // Light by click, then System removes the explicit choice and the stored value.
    await trigger(page).click();
    await expect(option(page, text.dark)).toHaveAttribute("aria-pressed", "true");
    await option(page, text.light).click();
    expect(await mode(page)).toBe("light");
    await trigger(page).click();
    await option(page, text.system).click();
    expect(await mode(page)).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem("mode"))).toBeNull();
  });

  for (const width of [1440, 390, 360]) {
    test(`ThemeMenu ${entry.name}: open list stays inside the ${width}px viewport without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 780 });
      await page.goto(entry.path);
      await trigger(page).click();
      const list = page.locator(".theme-menu__list");
      await expect(list).toBeVisible();
      const rect = await list.boundingBox();
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      // Nothing paints over the list: the element at each option's centre is the option (or inside it).
      for (const label of Object.values(text)) {
        const hit = await option(page, label).evaluate((el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!top && el.contains(top); });
        expect(hit, `${label} is not covered`).toBe(true);
        const size = await option(page, label).boundingBox();
        expect(size!.height).toBeGreaterThanOrEqual(44);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

test("ThemeMenu choice persists across pages and System follows the OS preference", async ({ page }) => {
  await page.goto("/projectile");
  await page.evaluate(() => localStorage.removeItem("mode"));
  await page.reload();
  await trigger(page).click();
  await option(page, "暗色").click();
  for (const path of ["/", "/solar", "/en/atmosphere-profile", "/electrostatics", "/interference"]) {
    await page.goto(path);
    expect(await mode(page), path).toBe("dark");
    await trigger(page).click();
    await expect(page.getByRole("button", { name: /^(暗色|Dark)$/ }).locator("visible=true")).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
  }
  await trigger(page).click();
  await page.getByRole("button", { name: "跟隨系統", exact: true }).click();
  expect(await mode(page)).toBeNull();
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("dark");
  await page.emulateMedia({ colorScheme: "light" });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
  await page.goto("/");
  await expect(trigger(page)).toHaveAttribute("aria-label", /跟隨系統/);
});
