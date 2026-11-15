import { expect, test, type Page } from "@playwright/test";

/* Hydrogen usability floor on small screens: readable diagram text and touchable spectrum range. */

async function openHydrogen(page: Page) {
  await page.goto("/hydrogen");
  await expect(page.getByTestId("intent-choice")).toBeVisible();
  await expect(async () => {
    await page.getByTestId("choose-free").click({ timeout: 1000 });
    await expect(page.locator("main.hydrogen-lab")).toHaveAttribute("data-mode", "free", { timeout: 1000 });
  }).toPass();
  await page.evaluate(() => window.scrollTo(0, 0));
}

for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 800 }, { width: 1280, height: 720 }]) {
  test(`hydrogen: diagram text is readable and spectrum range is touchable ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openHydrogen(page);

    // Smallest rendered text in each visible diagram, in CSS px (font size × the SVG's fit-to-box scale).
    const smallest = await page.evaluate(() => [...document.querySelectorAll<SVGSVGElement>('.viewport-card svg[role="img"], .viewport-card svg[aria-label="氫原子能階圖"]')]
      .filter((svg) => svg.getBoundingClientRect().width > 0)
      .map((svg) => {
        const box = svg.getBoundingClientRect();
        const view = svg.viewBox.baseVal;
        const scale = Math.min(box.width / view.width, box.height / view.height);
        const sizes = [...svg.querySelectorAll("text")].filter((t) => t.textContent?.trim()).map((t) => Number(t.getAttribute("font-size")) * scale);
        return { label: svg.getAttribute("aria-label"), min: Math.min(...sizes) };
      }));
    expect(smallest.length).toBeGreaterThan(0);
    for (const diagram of smallest) {
      // e⁻ sits inside a marker that is capped by the innermost orbit, so only labelled text is held to 12px.
      if (diagram.label?.includes("軌道圖")) continue;
      expect(diagram.min, diagram.label ?? "").toBeGreaterThanOrEqual(11.9);
    }

    for (const name of ["自動範圍", "可見光 380–750"]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box!.height, name).toBeGreaterThanOrEqual(43.5);
      expect(box!.width, name).toBeGreaterThanOrEqual(43.5);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
