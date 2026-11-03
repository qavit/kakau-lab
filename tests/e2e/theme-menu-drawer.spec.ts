import { expect, test, type Page } from "@playwright/test";

// W45 iteration: the Layers drawer must not cover the header's appearance control.
const labs = [
  { name: "Solar", path: "/solar", layers: /^圖層$/, drawer: "#solar-layer-drawer" },
  { name: "Atmosphere zh", path: "/atmosphere-profile", layers: /^圖層$/, drawer: "#atmosphere-layer-drawer" },
  { name: "Atmosphere en", path: "/en/atmosphere-profile", layers: /^Layers$/, drawer: "#atmosphere-layer-drawer" },
] as const;

test.describe.configure({ timeout: 60_000 });

const trigger = (page: Page) => page.locator(".theme-menu__trigger");
const reachable = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => {
  const r = el.getBoundingClientRect();
  const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return !!top && el.contains(top);
});

for (const lab of labs) {
  for (const width of [1440, 390, 360]) {
    test(`${lab.name} ${width}px: appearance menu works with the layer drawer closed and open`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 780 });
      await page.goto(lab.path, { waitUntil: "networkidle" });
      const layersButton = page.getByRole("button", { name: lab.layers });

      // Closed drawer: the menu opens, selects and closes as before.
      await trigger(page).click();
      await expect(page.locator(".theme-menu__list")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator(".theme-menu__list")).toHaveCount(0);

      // Open drawer: it starts below the header, so the trigger and the Layers button stay clickable.
      await layersButton.click();
      await expect(page.locator(`${lab.drawer}.open`)).toBeVisible();
      expect(await reachable(page, ".theme-menu__trigger"), "trigger not covered").toBe(true);
      expect(await reachable(page, `.header-actions button[aria-controls="${lab.drawer.slice(1)}"]`), "layers button not covered").toBe(true);
      const geometry = await page.evaluate((sel) => {
        const drawer = document.querySelector(sel)!.getBoundingClientRect();
        const bar = document.querySelector(".topbar")!.getBoundingClientRect();
        return { drawerTop: drawer.top, barBottom: bar.bottom, drawerBottom: drawer.bottom, vh: innerHeight, sw: document.documentElement.scrollWidth <= innerWidth };
      }, lab.drawer);
      expect(geometry.drawerTop).toBeGreaterThanOrEqual(geometry.barBottom - 1);
      expect(geometry.drawerBottom).toBeLessThanOrEqual(geometry.vh);
      expect(geometry.sw).toBe(true);

      // The menu opens over the drawer area without being covered by it, and picks a theme.
      await trigger(page).click();
      await expect(page.locator(".theme-menu__list")).toBeVisible();
      for (const name of ["亮色", "Light"]) {
        const option = page.locator(".theme-menu__option", { hasText: name });
        if (await option.count()) expect(await option.evaluate((el) => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
      }

      // Escape closes the menu first (drawer stays), focus returns to the trigger; a second Escape closes the drawer
      // and returns focus to the Layers button.
      await page.keyboard.press("Escape");
      await expect(page.locator(".theme-menu__list")).toHaveCount(0);
      await expect(page.locator(`${lab.drawer}.open`)).toBeVisible();
      await expect(trigger(page)).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.locator(`${lab.drawer}.open`)).toHaveCount(0);
      await expect(layersButton).toBeFocused();
    });
  }

  test(`${lab.name}: keyboard reaches the appearance trigger while the drawer is open; closed drawer is inert`, async ({ page }) => {
    await page.goto(lab.path, { waitUntil: "networkidle" });
    expect(await page.locator(lab.drawer).evaluate((el) => (el as HTMLElement).inert)).toBe(true);
    await page.getByRole("button", { name: lab.layers }).click();
    await expect(page.locator(`${lab.drawer} header button`)).toBeFocused();
    // Shift+Tab from the drawer eventually lands on the trigger; Tab order is DOM order: header controls precede the drawer.
    let reached = false;
    for (let i = 0; i < 25 && !reached; i++) {
      await page.keyboard.press("Shift+Tab");
      reached = await trigger(page).evaluate((el) => el === document.activeElement);
    }
    expect(reached).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.locator(".theme-menu__list")).toBeVisible();
  });
}
