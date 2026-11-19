import { expect, test, type Page } from "@playwright/test";

/**
 * Label collision guard. At the instants where the selected pair is received (the moment O sits on a front,
 * and the brackets are drawn), no text may overlap another text or the S / O markers, in either locale and
 * at the widths the product supports. Lines and rings are allowed to cross labels; text and markers are not.
 */
const PRESETS: Record<string, [string, string]> = {
  rest: ["都靜止", "Both at rest"],
  sourceApproach: ["波源靠近", "Source approaches"],
  observerApproach: ["觀察者靠近", "Observer approaches"],
  sourceRecede: ["波源遠離", "Source recedes"],
  observerRecede: ["觀察者遠離", "Observer recedes"],
  sameDirection: ["同向同速", "Same direction, same speed"],
};

async function overlaps(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const boxOf = (el: Element) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
    const hit = (a: ReturnType<typeof boxOf>, b: ReturnType<typeof boxOf>) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1.5;
    for (const id of ["wavefront-view", "time-band"]) {
      const svg = document.querySelector(`[data-testid="${id}"]`)!;
      const svgBox = boxOf(svg);
      const texts = [...svg.querySelectorAll("text")].filter((t) => t.textContent?.trim());
      const solids = [...svg.querySelectorAll('[data-testid="source-marker"], [data-testid="observer-marker"], g[data-event] path, g[data-event] rect')];
      for (let i = 0; i < texts.length; i += 1) {
        const a = boxOf(texts[i]);
        if (a.r > svgBox.r + 1 || a.l < svgBox.l - 1) out.push(`${id}: "${texts[i].textContent}" leaves the view`);
        for (let j = i + 1; j < texts.length; j += 1) if (hit(a, boxOf(texts[j]))) out.push(`${id}: "${texts[i].textContent}" × "${texts[j].textContent}"`);
        for (const s of solids) if (hit(a, boxOf(s))) out.push(`${id}: "${texts[i].textContent}" × ${(s as HTMLElement).dataset.testid ?? s.parentElement?.getAttribute("data-event") + "#" + s.parentElement?.getAttribute("data-n")}`);
      }
    }
    return out;
  });
}

for (const locale of [0, 1] as const) {
  for (const width of [320, 360, 390, 768, 1280]) {
    test(`no text collides with text or markers at reception instants: ${locale ? "en" : "zh"} ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 700 ? 800 : 720 });
      await page.goto(locale ? "/en/doppler" : "/doppler");
      await expect(page.locator("main")).toHaveAttribute("data-interactive", "true");
      const found: string[] = [];
      for (const [id, names] of Object.entries(PRESETS)) {
        await page.getByRole("button", { name: names[locale], exact: true }).click();
        for (const pair of [0, 2, 4, "last"] as const) {
          // pick the pair with the stepper, then move to the instant both of its fronts are received
          const stepper = page.getByTestId("pair-readout").locator("output");
          const next = page.getByRole("button", { name: locale ? "Next pair" : "下一對" });
          const previous = page.getByRole("button", { name: locale ? "Previous pair" : "上一對" });
          if (pair === "last") { while (await next.isEnabled()) await next.click(); }
          else {
            while (!(await stepper.innerText()).startsWith(`#${pair} `)) {
              const current = Number((await stepper.innerText()).match(/#(\d+)/)![1]);
              const button = current < pair ? next : previous;
              if (await button.isDisabled()) break;
              await button.click();
            }
          }
          await page.getByRole("button", { name: locale ? "Play to reception" : "播放到接收" }).first().click();
          for (const o of await overlaps(page)) found.push(`${id} pair ${pair}: ${o}`);
          await page.getByRole("button", { name: locale ? "Back to start" : "回到起點" }).click();
        }
      }
      // A run that ends early because S and O are closing, at its last pair.
      await page.getByLabel(locale ? /^Source S · Source velocity/ : /^波源 S · 波源速度/).fill("0.5");
      await page.getByLabel(locale ? /^Observer O · Observer velocity/ : /^觀察者 O · 觀察者速度/).fill("-0.5");
      const next = page.getByRole("button", { name: locale ? "Next pair" : "下一對" });
      while (await next.isEnabled()) await next.click();
      await page.getByRole("button", { name: locale ? "Play to reception" : "播放到接收" }).first().click();
      for (const o of await overlaps(page)) found.push(`closing last pair: ${o}`);
      expect([...new Set(found)], found.length ? "collisions" : "").toEqual([]);
    });
  }
}
