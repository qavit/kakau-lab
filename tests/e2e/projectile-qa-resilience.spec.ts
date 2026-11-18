// QA round 5 (2026-11-18): failure recovery, reduced motion, non-colour encoding, axe, zoom-equivalent reflow.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const OUT = resolve(process.env.QA_EVIDENCE_DIR || "test-results/qa-resilience");
const ready = async (page: Page, url = "/projectile") => { await page.goto(url); await expect(page.locator("main")).toHaveAttribute("data-interactive", "true"); };
const cursor = (page: Page) => page.locator('input[aria-label="時間游標"]').inputValue();

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("does not autoplay; 播放 still works", async ({ page }) => {
    await ready(page);
    const a = await cursor(page);
    await page.waitForTimeout(1000);
    expect(await cursor(page)).toBe(a);
    await expect(page.getByRole("button", { name: "播放", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "播放", exact: true }).click();
    await page.waitForTimeout(700);
    expect(await cursor(page)).not.toBe(a);
  });
});
test("no reduced-motion preference: the animation still starts on its own (regression guard)", async ({ page }) => {
  await ready(page);
  const a = await cursor(page);
  await page.waitForTimeout(900);
  expect(await cursor(page)).not.toBe(a);
});

test("share failure modes fall back to defaults, paused, with an explanation", async ({ page }) => {
  const base = { v: 1, mode: "free", launch: { x: 0, height: 0, speed: 24, angle: 45, gravity: 9.80665, dragFactor: 0, scenario: "field" }, stairs: { width: 0.3, rise: 0.18, count: 24 }, comparisons: { showComplementary: false, showEnvelope: false, showAcceleration: true, showDrag: false }, layers: { trajectory: true, velocity: true, components: true, guides: true, grid: true, labels: true, markers: true }, preset: null };
  const cases: Record<string, string> = {
    "unsupported version": JSON.stringify({ ...base, v: 2 }),
    "guided-mode payload": JSON.stringify({ ...base, mode: "guided" }),
    "out-of-range speed": JSON.stringify({ ...base, launch: { ...base.launch, speed: 9999 } }),
    "not JSON": "{{{",
    "oversized": "x".repeat(2500),
  };
  for (const [name, payload] of Object.entries(cases)) {
    await ready(page, "/projectile?s=" + encodeURIComponent(payload));
    await expect(page.locator(".projectile-share-notice").first(), name).toContainText("分享設定無法讀取");
    await expect(page.getByRole("button", { name: "播放", exact: true }), `${name}: paused`).toBeVisible();
    await page.getByRole("button", { name: "參數", exact: true }).click();
    await expect(page.locator('label:has-text("發射速度") input[type=range]:visible').first(), name).toHaveValue("24"); // default speed, not the payload's
    await page.getByRole("button", { name: "參數", exact: true }).click();
  }
});

test("export failure is reported and a retry succeeds (no stuck state)", async ({ page }) => {
  await page.addInitScript(() => {
    const real = URL.createObjectURL.bind(URL);
    (window as unknown as { __failExport: boolean }).__failExport = true;
    URL.createObjectURL = (b: Blob | MediaSource) => { if ((window as unknown as { __failExport: boolean }).__failExport) throw new Error("disk full"); return real(b); };
  });
  await ready(page);
  await page.getByRole("button", { name: "工具", exact: true }).click();
  await page.getByRole("button", { name: "匯出軌跡圖 SVG / Export figure", exact: true }).click();
  const notice = page.locator(".projectile-share-notice").first();
  await expect(notice).toContainText("匯出失敗");
  await mkdir(OUT, { recursive: true });
  await writeFile(resolve(OUT, "export-failure-message.txt"), (await notice.innerText()) + "\n");
  // The message must describe the real problem, not blame the guided activity when none is active.
  await expect(notice).not.toContainText("離開探索任務");
  await page.evaluate(() => { (window as unknown as { __failExport: boolean }).__failExport = false; });
  await page.getByRole("button", { name: "工具", exact: true }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "匯出軌跡圖 SVG / Export figure", exact: true }).click();
  expect((await dl).suggestedFilename()).toBe("kakau-projectile.svg");
  await expect(notice).toContainText("已匯出");
});

for (const mode of ["rejects", "missing"] as const) {
  test(`fullscreen ${mode}: in-window enlarge remains usable, notice shown, exit returns focus`, async ({ page }) => {
    await page.addInitScript((m) => {
      if (m === "missing") (Element.prototype as unknown as Record<string, unknown>).requestFullscreen = undefined;
      else Element.prototype.requestFullscreen = () => Promise.reject(new Error("denied"));
    }, mode);
    await ready(page);
    const trigger = page.getByRole("button", { name: "放大視圖", exact: true });
    await trigger.click();
    await page.getByRole("button", { name: "全螢幕", exact: true }).click();
    await expect(page.getByText("全螢幕不可用；視窗內放大仍可使用。")).toBeVisible();
    await expect(page.getByRole("button", { name: /退出放大/ })).toBeVisible();
    // state preserved while enlarged: cursor slider still present and operable
    await expect(page.locator('input[aria-label="時間游標"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });
}

test("non-colour encoding: simultaneously shown series differ in dash pattern, not hue alone", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "參數", exact: true }).click();
  await page.getByRole("button", { name: "教學預設", exact: true }).click();
  await page.getByRole("button", { name: "羽球阻力", exact: true }).click();
  await page.getByRole("button", { name: "參數", exact: true }).click();
  await page.getByRole("button", { name: "圖層", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "視圖圖層" });
  await drawer.getByRole("checkbox", { name: "互補角對照軌跡" }).check();
  await page.getByRole("button", { name: "關閉圖層", exact: true }).click();
  const series = await page.evaluate(() => [...document.querySelectorAll(".canvas-host svg path")].filter(p => { const s = getComputedStyle(p); return s.fill === "none" && parseFloat(s.strokeWidth) >= 2 && (p as SVGPathElement).getTotalLength() > 100; }).map(p => ({ stroke: getComputedStyle(p).stroke, dash: getComputedStyle(p).strokeDasharray })));
  await mkdir(OUT, { recursive: true });
  await writeFile(resolve(OUT, "series-encoding.json"), JSON.stringify(series, null, 2));
  await expect(page.locator(".legend")).toContainText("互補角對照");
  await expect(page.locator(".legend")).toContainText("阻力對照");
  await expect(page.locator(".legend .legend-key")).toHaveCount(2); // each comparison has a keyed legend entry
  expect(series.length).toBeGreaterThanOrEqual(3);
  expect(new Set(series.map(s => s.dash)).size, "distinct dash patterns across ≥3 series").toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: resolve(OUT, "series-encoding.png") });
});

for (const vp of [{ name: "zoom200-equiv-640x360", width: 640, height: 360 }, { name: "zoom400-equiv-320x180", width: 320, height: 180 }]) {
  test(`reflow at ${vp.name} (browser-zoom equivalent): no horizontal scroll, controls reachable by scrolling`, async ({ page }) => {
    await page.setViewportSize(vp);
    await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    for (const name of ["工具", "參數", "圖層", "探索任務"]) {
      const b = page.getByRole("button", { name, exact: true });
      await b.scrollIntoViewIfNeeded();
      await expect(b).toBeVisible();
    }
    await mkdir(OUT, { recursive: true });
    await page.screenshot({ path: resolve(OUT, `${vp.name}.png`) });
  });
}

test("axe: free / params / layers / guided / theory — blocking (serious|critical) violations recorded", async ({ page }) => {
  await mkdir(OUT, { recursive: true });
  const report: Record<string, { id: string; impact: string | null | undefined; help: string; nodes: number; sample: string }[]> = {};
  const scan = async (label: string) => {
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    report[label] = r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes[0]?.html.slice(0, 140) ?? "" }));
  };
  for (const vp of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    await ready(page);
    await scan(`${vp.width}:free`);
    await page.getByRole("button", { name: "參數", exact: true }).click(); await page.waitForTimeout(300);
    await scan(`${vp.width}:params`);
    await page.getByRole("button", { name: "參數", exact: true }).click();
    await page.getByRole("button", { name: "圖層", exact: true }).click(); await page.waitForTimeout(300);
    await scan(`${vp.width}:layers`);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "探索任務", exact: true }).click(); await page.waitForTimeout(300);
    await scan(`${vp.width}:guided-predict`);
    await page.getByRole("button", { name: "自由探索", exact: true }).click();
    await page.getByRole("button", { name: "理論與計算", exact: true }).click(); await page.waitForTimeout(500);
    await scan(`${vp.width}:theory`);
    await page.keyboard.press("Escape");
  }
  await writeFile(resolve(OUT, "axe-report.json"), JSON.stringify(report, null, 2));
  const blocking = Object.entries(report).flatMap(([k, vs]) => vs.filter(v => v.impact === "serious" || v.impact === "critical").map(v => `${k}: ${v.id} (${v.nodes})`));
  expect(blocking, blocking.join("\n")).toEqual([]);
});
