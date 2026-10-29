import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { evidencePath } from "./evidence";

// Gate D1: the concept summary below the simulator must use real MathJax (not Unicode text) and never overflow.
// D1_EVIDENCE_DIR (the full directory) stays supported; otherwise follow the shared EVIDENCE_DIR root.
const evidenceDir = process.env.D1_EVIDENCE_DIR ?? evidencePath("interference-gate-d1-20261029");

for (const width of [320, 390, 1440]) {
  test(`summary formulas are MathJax SVG without overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/interference");
    const summary = page.locator(".if-summary");
    await summary.scrollIntoViewIfNeeded();
    // 4 cards: 7 display formulas plus 6 inline formulas in the lead and body text.
    await expect(summary.locator("mjx-container svg").first()).toBeVisible({ timeout: 15_000 });
    const counts = await summary.evaluate((el) => ({
      display: el.querySelectorAll('mjx-container[display="true"]').length,
      inline: el.querySelectorAll('mjx-container:not([display="true"])').length,
      plain: el.querySelectorAll(".formula-plain").length,
    }));
    expect(counts.display).toBe(7);
    expect(counts.inline).toBe(6);
    expect(counts.plain).toBe(0);

    // No leftover Unicode math in the prose, and the key symbols come from TeX.
    const text = await summary.evaluate((el) => {
      const copy = el.cloneNode(true) as HTMLElement;
      copy.querySelectorAll("mjx-container, style").forEach((n) => n.remove());
      return copy.textContent ?? "";
    });
    expect(text).not.toMatch(/[⌊⌋₁₂½]/);
    expect(await summary.locator("mjx-container").count()).toBeGreaterThan(10);

    // No page-level or local horizontal scroll; each display formula sits inside its card.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const bad = await summary.evaluate((el) => {
      const problems: string[] = [];
      for (const box of el.querySelectorAll<HTMLElement>(".if-summary__formulas")) {
        if (box.scrollWidth > box.clientWidth + 1) problems.push(`scrollable formulas: ${box.scrollWidth}>${box.clientWidth}`);
        const b = box.getBoundingClientRect();
        for (const m of box.querySelectorAll("mjx-container")) {
          const r = m.getBoundingClientRect();
          if (r.right > b.right + 1 || r.left < b.left - 1) problems.push("formula leaves its box");
        }
      }
      for (const card of el.querySelectorAll<HTMLElement>(".if-summary__card")) {
        if (card.scrollWidth > card.clientWidth + 1) problems.push("card overflows");
      }
      return problems;
    });
    expect(bad).toEqual([]);

    // Accessible name for each formula group.
    for (const g of await summary.locator('[role="group"]').all()) await expect(g).toHaveAttribute("aria-label", /.+/);

    await mkdir(evidenceDir, { recursive: true });
    await summary.screenshot({ path: `${evidenceDir}/summary-${width}.png` });
  });
}

test("summary is not re-typeset while the animation plays", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/interference");
  const summary = page.locator(".if-summary");
  await summary.scrollIntoViewIfNeeded();
  await expect(summary.locator("mjx-container svg").first()).toBeVisible({ timeout: 15_000 });
  const mark = await summary.evaluate((el) => {
    const first = el.querySelector("mjx-container");
    (first as unknown as { __mark: number }).__mark = 1;
    return el.querySelectorAll("mjx-container").length;
  });
  await page.waitForTimeout(1500);
  const after = await summary.evaluate((el) => ({
    same: (el.querySelector("mjx-container") as unknown as { __mark?: number }).__mark === 1,
    count: el.querySelectorAll("mjx-container").length,
  }));
  expect(after.same).toBe(true);
  expect(after.count).toBe(mark);
});
