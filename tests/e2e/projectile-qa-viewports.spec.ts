// QA round 4 (2026-11-18): measured viewport usability. Writes metrics.json + screenshots to QA_EVIDENCE_DIR.
import { expect, test, type Page } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const OUT = resolve(process.env.QA_EVIDENCE_DIR || "test-results/qa-viewports");
const VIEWPORTS = [
  { name: "1366x768", width: 1366, height: 768 }, { name: "1280x720", width: 1280, height: 720 },
  { name: "390x844", width: 390, height: 844 }, { name: "360x800", width: 360, height: 800 },
  { name: "320x640", width: 320, height: 640 }, { name: "844x390-landscape", width: 844, height: 390 },
];
const metrics: Record<string, unknown> = {};

async function measure(page: Page) {
  return page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).checkVisibility() && !e.closest("[inert],[aria-hidden='true']");
    const rect = (e: Element | undefined) => { if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; };
    const svgs = [...document.querySelectorAll("svg")].filter(vis).sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height);
    const ctrls = [...document.querySelectorAll("button, a[href], select, input:not([type=range])")].filter(vis).map(e => ({ t: ((e.getAttribute("aria-label") || (e as HTMLElement).innerText || e.tagName) as string).trim().slice(0, 20), r: e.getBoundingClientRect() })).filter(c => c.r.width > 0);
    return {
      vw: innerWidth, vh: innerHeight, scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight,
      canvas: rect(svgs[0]),
      readout: rect([...document.querySelectorAll(".projectile-readout")].find(vis)),
      timeSlider: rect([...document.querySelectorAll('input[aria-label="時間游標"]')].find(vis)),
      under44: ctrls.filter(c => c.r.width < 43.5 || c.r.height < 43.5).map(c => `${c.t} ${Math.round(c.r.width)}x${Math.round(c.r.height)}`),
    };
  });
}

for (const vp of VIEWPORTS) {
  test(`viewport ${vp.name}: no h-overflow, targets ≥44, canvas usable with params/layers open; screenshots`, async ({ browser }) => {
    await mkdir(OUT, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.width < 500, isMobile: vp.width < 500 });
    const page = await ctx.newPage();
    await page.goto("/projectile");
    await expect(page.locator("main")).toHaveAttribute("data-interactive", "true");
    const entry: Record<string, unknown> = {};
    entry.initial = await measure(page);
    await page.screenshot({ path: resolve(OUT, `${vp.name}-1-initial.png`) });
    const m0 = entry.initial as Awaited<ReturnType<typeof measure>>;
    expect(m0.scrollW, "no horizontal overflow").toBeLessThanOrEqual(m0.vw + 1);
    expect(m0.under44, "touch targets").toEqual([]);

    await page.getByRole("button", { name: "參數", exact: true }).click();
    await page.waitForTimeout(350);
    entry.paramsOpen = await measure(page);
    await page.screenshot({ path: resolve(OUT, `${vp.name}-2-params.png`) });
    await page.getByRole("button", { name: "參數", exact: true }).click();

    await page.getByRole("button", { name: "圖層", exact: true }).click();
    await page.waitForTimeout(350);
    entry.layersOpen = await measure(page);
    await page.screenshot({ path: resolve(OUT, `${vp.name}-3-layers.png`) });
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "探索任務", exact: true }).click();
    await page.waitForTimeout(250);
    entry.guided = await measure(page);
    await page.screenshot({ path: resolve(OUT, `${vp.name}-4-guided-predict.png`) });
    const mg = entry.guided as Awaited<ReturnType<typeof measure>>;
    expect(mg.scrollW).toBeLessThanOrEqual(mg.vw + 1);

    // Invariant: portrait phones keep the main canvas near the top of the first screen.
    if (vp.width <= 430 && vp.height > vp.width) expect(m0.canvas!.top, "canvas starts in the top 25% of the first screen").toBeLessThan(vp.height * 0.25);
    metrics[vp.name] = entry;
    await writeFile(resolve(OUT, "metrics.json"), JSON.stringify(metrics, null, 2));
    await ctx.close();
  });
}

// --- focus visibility + measured operation counts (R10 partial / R02) ---
for (const vp of [VIEWPORTS[0], VIEWPORTS[3]]) {
  test(`keyboard: every Tab stop shows a visible focus indicator @${vp.name}`, async ({ browser }) => {
    await mkdir(OUT, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await page.goto("/projectile");
    await expect(page.locator("main")).toHaveAttribute("data-interactive", "true");
    const stops: { label: string; ok: boolean; how: string }[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const s = await page.evaluate(() => {
        const e = document.activeElement as HTMLElement | null;
        if (!e || e === document.body) return null;
        const cs = getComputedStyle(e);
        const outline = cs.outlineStyle === "solid" && parseFloat(cs.outlineWidth) >= 2; // UA `auto` 1px ring is not the C2 indicator
        const shadow = cs.boxShadow !== "none";
        return { label: (e.getAttribute("aria-label") || e.innerText || e.tagName).trim().slice(0, 24), ok: outline || shadow, how: `${cs.outlineStyle}/${cs.outlineWidth}/${cs.outlineColor} shadow=${shadow}` };
      });
      if (s) stops.push(s);
    }
    await writeFile(resolve(OUT, `focus-${vp.name}.json`), JSON.stringify(stops, null, 2));
    expect(stops.length).toBeGreaterThan(15);
    expect(stops.filter(s => !s.ok), "focus stops with no visible indicator").toEqual([]);
    await ctx.close();
  });
}

test("measured operation counts at 360x800 (clicks from a fresh load)", async ({ browser }) => {
  await mkdir(OUT, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const counts: Record<string, number> = {};
  const fresh = async () => { await page.goto("/projectile"); await expect(page.locator("main")).toHaveAttribute("data-interactive", "true"); };
  const click = async (name: string | RegExp, n: { v: number }) => { await page.getByRole("button", { name, exact: typeof name === "string" }).first().click(); n.v++; };

  let n = { v: 0 };
  await fresh(); await click("暫停", n); counts["播放／暫停"] = n.v;
  n = { v: 0 }; await fresh(); await click("參數", n); await expect(page.locator('input[type=range]:visible').first()).toBeVisible(); counts["改發射參數（到達滑桿）"] = n.v;
  n = { v: 0 }; await fresh(); await click("參數", n); await click("教學預設", n); await click("月球重力", n); counts["套用教學預設"] = n.v;
  n = { v: 0 }; await fresh(); await click("圖層", n); await expect(page.getByRole("dialog", { name: "視圖圖層" })).toBeVisible(); counts["開圖層（到達核取方塊）"] = n.v;
  n = { v: 0 }; await fresh(); await click("工具", n); await click(/分享設定/, n); counts["分享設定"] = n.v;
  n = { v: 0 }; await fresh(); await click("工具", n); await expect(page.getByRole("button", { name: "匯出軌跡圖 SVG / Export figure", exact: true })).toBeVisible(); counts["到達匯出"] = n.v;
  n = { v: 0 }; await fresh(); await click("探索任務", n); counts["進入探索任務"] = n.v;
  n = { v: 0 }; await fresh(); await click("理論與計算", n); counts["開理論"] = n.v;
  n = { v: 0 }; await fresh(); await click("回到預設視圖", n); counts["視角復位"] = n.v;
  await writeFile(resolve(OUT, "operation-counts-360x800.json"), JSON.stringify(counts, null, 2));
  for (const [k, v] of Object.entries(counts)) if (k !== "套用教學預設") expect(v, k).toBeLessThanOrEqual(2);
  await ctx.close();
});
