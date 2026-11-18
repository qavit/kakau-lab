// Mobile workspace (Owner-approved A + phone-only B, 2026-11-18): real-page tests, not overlay prototypes.
// A: 844×390 landscape two-column workspace. B: phone-only 預設 shortcut (≤2 operations, last item reachable, keyboard).
// Evidence (screenshots + metrics.json) goes to QA_EVIDENCE_DIR when set.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const OUT = process.env.QA_EVIDENCE_DIR ? resolve(process.env.QA_EVIDENCE_DIR) : null;
const PHONES = [
  { name: "360x800", width: 360, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "320x640", width: 320, height: 640 },
  { name: "844x390", width: 844, height: 390 },
];
const metrics: Record<string, unknown> = {};

async function openPage(browser: Browser, width: number, height: number, url = "/projectile") {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(url);
  await expect(page.locator("main")).toHaveAttribute("data-interactive", "true");
  return { ctx, page };
}
async function shot(page: Page, name: string) { if (OUT) { await mkdir(OUT, { recursive: true }); await page.screenshot({ path: resolve(OUT, name) }); } }
const tool = (page: Page, name: string) => page.locator(".projectile-panel-actions").getByRole("button", { name, exact: true });

/** Visible fraction (0–100) of the on-screen trajectory canvas, plus its size. */
async function canvas(page: Page) {
  return page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).checkVisibility() && !e.closest("[inert],[aria-hidden='true']");
    const svg = [...document.querySelectorAll(".projectile-path-card .canvas-host > svg")].find(vis);
    if (!svg) return { pct: 0, w: 0, h: 0 };
    const r = svg.getBoundingClientRect();
    const ih = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)), iw = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
    return { pct: Math.round((100 * ih * iw) / (r.width * r.height)), w: Math.round(r.width), h: Math.round(r.height) };
  });
}
async function inViewport(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const e = [...document.querySelectorAll(sel)].find((x) => (x as HTMLElement).checkVisibility() && !x.closest("[inert],[aria-hidden='true']"));
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return r.top >= -0.5 && r.bottom <= innerHeight + 0.5 && r.left >= -0.5 && r.right <= innerWidth + 0.5;
  }, selector);
}
async function rangeInView(page: Page, label: string) {
  return page.evaluate((text) => {
    const input = [...document.querySelectorAll("label")].filter((l) => l.textContent?.includes(text) && (l as HTMLElement).checkVisibility()).map((l) => l.querySelector("input[type=range]")).find(Boolean);
    if (!input) return null;
    const r = input.getBoundingClientRect();
    return r.top >= -0.5 && r.bottom <= innerHeight + 0.5;
  }, label);
}
async function overlaps(page: Page, a: string, b: string) {
  return page.evaluate(([x, y]) => {
    const pick = (s: string) => [...document.querySelectorAll(s)].find((e) => (e as HTMLElement).checkVisibility() && !e.closest("[inert],[aria-hidden='true']"))!.getBoundingClientRect();
    const p = pick(x), q = pick(y);
    return Math.min(p.right, q.right) - Math.max(p.left, q.left) > 1 && Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top) > 1;
  }, [a, b]);
}
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const SPEED = 'label:has-text("發射速度") input[type=range]';
const CURSOR = 'input[aria-label="時間游標"]';

// ───────────────────────────── A: landscape 844×390 ─────────────────────────────
test.describe("A · landscape 844×390 two-column workspace", () => {
  test("initial: canvas, transport and readout are all on the first screen, nothing overlaps", async ({ browser }) => {
    const { ctx, page } = await openPage(browser, 844, 390);
    const c = await canvas(page);
    metrics["844x390 initial canvas"] = c;
    expect(c.pct).toBeGreaterThanOrEqual(99);
    expect(c.h).toBeGreaterThanOrEqual(250);
    expect(await inViewport(page, ".projectile-readout")).toBe(true);
    expect(await inViewport(page, ".projectile-transport")).toBe(true);
    expect(await overlaps(page, ".projectile-path-card", ".projectile-dock")).toBe(false);
    expect(await noOverflow(page)).toBe(true);
    await shot(page, "after-844x390-1-initial.png");
    await ctx.close();
  });

  test("parameters open: canvas stays visible, controls + readout reachable, slider works, play/pause works, state survives rotation", async ({ browser }) => {
    const { ctx, page } = await openPage(browser, 844, 390);
    await page.locator('button[aria-label="暫停"]').first().click();
    await tool(page, "參數").click();
    await page.waitForTimeout(300);
    const c = await canvas(page);
    metrics["844x390 params canvas"] = c;
    expect(c.pct).toBeGreaterThanOrEqual(99);
    expect(c.h).toBeGreaterThanOrEqual(150);
    expect(await rangeInView(page, "發射速度")).toBe(true);
    expect(await inViewport(page, ".projectile-readout")).toBe(true);
    expect(await inViewport(page, 'button[aria-label="播放"], button[aria-label="暫停"]')).toBe(true);
    expect(await inViewport(page, CURSOR)).toBe(true);
    expect(await overlaps(page, ".projectile-path-card", ".projectile-side")).toBe(false);
    expect(await overlaps(page, ".projectile-path-card", ".projectile-dock")).toBe(false);
    expect(await overlaps(page, ".projectile-dock", ".projectile-side")).toBe(false);
    expect(await noOverflow(page)).toBe(true);
    await shot(page, "after-844x390-2-params.png");

    // Operate: change launch speed, scrub the cursor, play then pause.
    await page.locator(SPEED + ":visible").first().fill("27");
    await page.locator(CURSOR + ":visible").first().fill("0.7");
    const playBtn = page.locator('button[aria-label="播放"]').first();
    await playBtn.click();
    await expect(page.locator('button[aria-label="暫停"]').first()).toBeVisible();
    await page.locator('button[aria-label="暫停"]').first().click();
    await expect(page.locator('button[aria-label="播放"]').first()).toBeVisible();
    expect((await canvas(page)).pct).toBeGreaterThanOrEqual(99);

    // Rotate to portrait and back: parameters, cursor and panel state are kept.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(300);
    expect(await page.locator(SPEED + ":visible").first().inputValue()).toBe("27");
    expect(Number(await page.locator(CURSOR + ":visible").first().inputValue())).toBeCloseTo(0.7, 1);
    await expect(tool(page, "參數")).toHaveAttribute("aria-expanded", "true");
    expect((await canvas(page)).pct).toBeGreaterThanOrEqual(99);
    await ctx.close();
  });

  test("layers drawer, expanded view, guided task and share notice keep the canvas usable", async ({ browser }) => {
    const { ctx, page } = await openPage(browser, 844, 390);
    // Layers
    await tool(page, "圖層").click();
    await expect(page.locator("#projectile-layer-drawer")).toHaveClass(/\bopen\b/);
    await shot(page, "after-844x390-3-layers.png");
    await page.keyboard.press("Escape");
    await expect(page.locator("#projectile-layer-drawer")).not.toHaveClass(/\bopen\b/);
    // Share notice does not push the canvas out
    await page.getByRole("button", { name: "工具", exact: true }).click();
    await page.getByRole("button", { name: /分享設定/ }).click();
    await expect(page.locator(".projectile-share-notice").first()).toBeVisible();
    metrics["844x390 share-notice canvas"] = await canvas(page);
    expect((await canvas(page)).pct, "canvas still partly visible with the share notice").toBeGreaterThanOrEqual(60);
    await shot(page, "after-844x390-4-share.png");
    // Expanded view: enter and exit back to the workspace
    await page.goto("/projectile");
    await expect(page.locator("main")).toHaveAttribute("data-interactive", "true");
    await tool(page, "放大視圖").click();
    await expect(page.locator(".projectile-stage[data-expanded='true']")).toBeVisible();
    expect((await canvas(page)).pct).toBeGreaterThanOrEqual(99);
    await shot(page, "after-844x390-5-expanded.png");
    expect(await inViewport(page, ".projectile-dock")).toBe(true);
    expect(await overlaps(page, ".projectile-path-card", ".projectile-dock")).toBe(false);
    await page.getByRole("button", { name: /退出|關閉放大|縮小|還原/ }).first().click();
    await expect(page.locator(".projectile-stage[data-expanded='false']")).toBeVisible();
    // Expanded again with the parameter panel left open: same two-column result, and exiting restores the open panel.
    await tool(page, "參數").click();
    await tool(page, "放大視圖").click();
    await expect(page.locator(".projectile-stage[data-expanded='true']")).toBeVisible();
    metrics["844x390 expanded (panel was open) canvas"] = await canvas(page);
    expect((await canvas(page)).pct).toBeGreaterThanOrEqual(99);
    expect(await inViewport(page, ".projectile-dock")).toBe(true);
    await page.getByRole("button", { name: /退出|關閉放大|縮小|還原/ }).first().click();
    await expect(tool(page, "參數")).toHaveAttribute("aria-expanded", "true");
    await tool(page, "參數").click();
    // Guided: predict phase — task card, canvas visible, answer still masked, no preset shortcut
    await page.getByRole("button", { name: "探索任務", exact: true }).click();
    await page.waitForTimeout(250);
    expect((await canvas(page)).pct).toBeGreaterThanOrEqual(99);
    await expect(page.locator(".projectile-preset-entry")).toHaveCount(0);
    await expect(page.locator(".projectile-masked-readout, .projectile-readout [data-masked='true']").first()).toBeVisible();
    await shot(page, "after-844x390-6-guided.png");
    expect(await noOverflow(page)).toBe(true);
    await ctx.close();
  });

  test("axe: landscape initial, params open, preset sheet open — no serious/critical violations", async ({ browser }) => {
    const { ctx, page } = await openPage(browser, 844, 390);
    const run = async (label: string) => {
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
      const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}:${v.nodes.length}`);
      metrics[`axe ${label}`] = { violations: r.violations.map((v) => `${v.id}(${v.impact}):${v.nodes.length}`), serious_critical: bad };
      expect(bad, label).toEqual([]);
    };
    await run("844x390 initial");
    await tool(page, "參數").click(); await page.waitForTimeout(300);
    await run("844x390 params");
    await tool(page, "參數").click();
    await tool(page, "預設").click();
    await expect(page.locator("#projectile-preset-sheet")).toBeVisible();
    await run("844x390 preset sheet");
    await ctx.close();
  });
});

// ───────────────────────────── B: phone preset shortcut ─────────────────────────────
for (const vp of PHONES) {
  test.describe(`B · preset shortcut @ ${vp.name}`, () => {
    test("2 operations apply the last preset; sheet never hidden by the tool bar; panel stays closed", async ({ browser }) => {
      const { ctx, page } = await openPage(browser, vp.width, vp.height);
      let clicks = 0;
      await page.locator('button[aria-label="暫停"]').first().click(); // not counted: pause for stable measurement
      await expect(tool(page, "預設")).toBeVisible();
      // Tool bar: four labelled tools, none truncated or overlapping, each ≥44px high
      const bar = await page.locator(".projectile-panel-actions button").evaluateAll((bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return { t: (b as HTMLElement).innerText.trim(), w: Math.round(r.width), h: Math.round(r.height), clipped: b.scrollWidth > b.clientWidth + 1, right: r.right }; }));
      metrics[`${vp.name} toolbar`] = bar;
      expect(bar.map((b) => b.t)).toEqual(["參數", "預設", "圖層", "放大視圖"]);
      for (const b of bar) { expect(b.clipped, `${b.t} clipped`).toBe(false); expect(b.h, `${b.t} height`).toBeGreaterThanOrEqual(44); expect(b.right).toBeLessThanOrEqual(vp.width); }

      await tool(page, "預設").click(); clicks++;
      const sheet = page.locator("#projectile-preset-sheet");
      await expect(sheet).toBeVisible();
      const items = sheet.getByRole("button");
      expect(await items.count()).toBe(10);
      await shot(page, `after-${vp.name}-7-preset-sheet.png`);
      // The sheet sits above the tool bar and every item can be scrolled fully into view and hit-tested.
      const geo = await page.evaluate(() => {
        const s = document.querySelector("#projectile-preset-sheet")!.getBoundingClientRect();
        const bar = [...document.querySelectorAll(".projectile-panel-actions")].map((e) => e.getBoundingClientRect()).find((r) => r.width > 0)!;
        return { sheetTop: s.top, sheetBottom: s.bottom, barTop: bar.top, vh: innerHeight, vw: innerWidth, sheetRight: s.right, sheetLeft: s.left };
      });
      metrics[`${vp.name} sheet geometry`] = geo;
      expect(geo.sheetTop).toBeGreaterThanOrEqual(0);
      expect(geo.sheetBottom).toBeLessThanOrEqual(geo.vh);
      expect(geo.sheetRight).toBeLessThanOrEqual(geo.vw);
      if (vp.width <= 660) expect(geo.sheetBottom, "sheet clear of the bottom tool bar").toBeLessThanOrEqual(geo.barTop + 1);
      const last = items.last();
      await expect(last).toHaveText("月球重力");
      await last.scrollIntoViewIfNeeded();
      const hit = await last.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { reachable: top === el || el.contains(top), within: r.top >= 0 && r.bottom <= innerHeight, h: Math.round(r.height) };
      });
      metrics[`${vp.name} last item`] = hit;
      expect(hit.reachable).toBe(true);
      expect(hit.within).toBe(true);
      expect(hit.h).toBeGreaterThanOrEqual(44);
      await last.click(); clicks++;
      await expect(sheet).toHaveCount(0);
      metrics[`${vp.name} preset operations`] = clicks;
      expect(clicks).toBeLessThanOrEqual(2);
      // Applied: re-open and the item is pressed; parameter panel never had to open; state is paused at the start.
      await expect(tool(page, "參數")).toHaveAttribute("aria-expanded", "false");
      await tool(page, "預設").click();
      await expect(sheet.getByRole("button", { name: "月球重力" })).toHaveAttribute("aria-pressed", "true");
      await page.keyboard.press("Escape");
      await expect(page.locator('button[aria-label="播放"]').first()).toBeVisible();
      await ctx.close();
    });

    test("keyboard: Enter opens, focus moves in, Tab walks all 10 items, Enter applies, Escape closes, focus returns", async ({ browser }) => {
      const { ctx, page } = await openPage(browser, vp.width, vp.height);
      await tool(page, "預設").focus();
      await page.keyboard.press("Enter");
      const sheet = page.locator("#projectile-preset-sheet");
      await expect(sheet).toBeVisible();
      const items = sheet.getByRole("button");
      await expect(items.first()).toBeFocused();
      for (let i = 1; i < 10; i++) { await page.keyboard.press("Tab"); await expect(items.nth(i)).toBeFocused(); }
      // focused last item is fully on screen
      expect(await items.last().evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })).toBe(true);
      // Focus is trapped inside the modal sheet: Tab on the last item wraps to the first, Shift+Tab goes back.
      await page.keyboard.press("Tab"); await expect(items.first()).toBeFocused();
      await page.keyboard.press("Shift+Tab"); await expect(items.last()).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(sheet).toHaveCount(0);
      await expect(tool(page, "預設")).toBeFocused();
      // Escape path
      await page.keyboard.press("Enter");
      await expect(sheet).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(sheet).toHaveCount(0);
      await expect(tool(page, "預設")).toBeFocused();
      await ctx.close();
    });

    test("axe: preset sheet open (serious/critical) and no horizontal overflow", async ({ browser }) => {
      const { ctx, page } = await openPage(browser, vp.width, vp.height);
      await tool(page, "預設").click();
      await expect(page.locator("#projectile-preset-sheet")).toBeVisible();
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
      const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}:${v.nodes.length}`);
      metrics[`axe ${vp.name} preset sheet`] = { violations: r.violations.map((v) => `${v.id}(${v.impact}):${v.nodes.length}`), serious_critical: bad };
      expect(bad).toEqual([]);
      expect(await noOverflow(page)).toBe(true);
      await ctx.close();
    });
  });
}

test("B · in-panel 教學預設 menu: the last item is not hidden by the bottom tool bar (portrait phones)", async ({ browser }) => {
  for (const vp of PHONES.filter((p) => p.width <= 390)) {
    const { ctx, page } = await openPage(browser, vp.width, vp.height);
    await tool(page, "參數").click();
    await page.getByRole("button", { name: "教學預設", exact: true }).click();
    const last = page.locator(".projectile-menu-list").last().getByRole("button").last();
    await expect(last).toHaveText("月球重力");
    await page.waitForTimeout(250);
    const hit = await last.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { reachable: top === el || el.contains(top), within: r.bottom <= innerHeight };
    });
    metrics[`${vp.name} in-panel menu last item`] = hit;
    expect(hit, vp.name).toEqual({ reachable: true, within: true });
    await ctx.close();
  }
});

test("B · shortcut is phone-only: absent at 1366×768 and 1280×720; guided hides it; desktop layout unchanged", async ({ browser }) => {
  for (const [w, h] of [[1366, 768], [1280, 720]] as const) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto("/projectile");
    await expect(page.locator("main")).toHaveAttribute("data-interactive", "true");
    await expect(page.locator(".projectile-preset-entry")).toBeHidden();
    await expect(page.getByRole("button", { name: "預設", exact: true })).toHaveCount(0);
    await tool(page, "參數").click();
    await page.getByRole("button", { name: "教學預設", exact: true }).click(); // desktop path is the panel menu, 3 operations incl. opening the panel
    await expect(page.locator(".projectile-menu-list button").last()).toBeVisible();
    const c = await canvas(page);
    metrics[`${w}x${h} desktop canvas (params open)`] = c;
    expect(c.pct).toBe(100);
    expect(await noOverflow(page)).toBe(true);
    await shot(page, `after-${w}x${h}-desktop.png`);
    await ctx.close();
  }
  const { ctx, page } = await openPage(browser, 360, 800);
  await page.getByRole("button", { name: "探索任務", exact: true }).click();
  await expect(page.locator(".projectile-preset-entry")).toHaveCount(0);
  await ctx.close();
});

test.afterAll(async () => { if (OUT) { await mkdir(OUT, { recursive: true }); await writeFile(resolve(OUT, "metrics.json"), JSON.stringify(metrics, null, 2)); } });
