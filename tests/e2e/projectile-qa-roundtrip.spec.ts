// QA round 2 (2026-11-18): real files + clean-browser share round trip. Writes evidence to QA_EVIDENCE_DIR.
import { expect, test, type Page } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const OUT = resolve(process.env.QA_EVIDENCE_DIR || "test-results/qa-roundtrip");
async function ready(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator("main")).toHaveAttribute("data-interactive", "true");
}
async function download(page: Page, label: string, name: string) {
  await page.getByRole("button", { name: "工具", exact: true }).click();
  const p = page.waitForEvent("download");
  await page.getByRole("button", { name: label, exact: true }).click();
  const d = await p;
  const path = resolve(OUT, name);
  await d.saveAs(path);
  return readFile(path, "utf8");
}

test("share → clean browser reopen is paused at start; setup identical; export JSON/SVG share one snapshot", async ({ page, browser }) => {
  await mkdir(OUT, { recursive: true });
  await ready(page, "/projectile");
  await page.getByRole("button", { name: "參數", exact: true }).click();
  await page.getByRole("button", { name: "教學預設", exact: true }).click();
  await page.getByRole("button", { name: "羽球阻力", exact: true }).click();
  await page.getByRole("button", { name: "參數", exact: true }).click();
  await page.getByRole("slider", { name: "時間游標" }).fill("0.5");

  const jsonA = JSON.parse(await download(page, "匯出軌跡資料 JSON / Export data", "A-drag-cursor0.5.json"));
  const svgA = await download(page, "匯出軌跡圖 SVG / Export figure", "A-drag-cursor0.5.svg");
  expect(jsonA.cursorFraction).toBeCloseTo(0.5, 6);
  expect(svgA).toContain(`t=${jsonA.cursor.t.toFixed(3)} s`);
  expect(JSON.parse(svgA.match(/<metadata>(.*?)<\/metadata>/s)![1].replaceAll("&quot;", '"').replaceAll("&amp;", "&"))).toEqual(jsonA);

  await page.getByRole("button", { name: "工具", exact: true }).click();
  await page.getByRole("button", { name: /分享設定/ }).click();
  const url = await page.locator(".projectile-share-notice input").inputValue();
  expect(url).toContain("?s=");
  // Copy must not promise the cursor: share restores launch setup only (R04).
  await expect(page.locator(".projectile-share-notice").filter({ has: page.locator("input") })).toContainText("不含目前時間游標");
  await page.screenshot({ path: resolve(OUT, "A-before-share.png") });

  // Clean browser context: no storage, no clipboard, no prior state.
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const b = await ctx.newPage();
  await ready(b, url);
  await expect(b.getByRole("button", { name: "播放", exact: true })).toBeVisible(); // paused on load
  // Cursor is NOT restored: the receiver sees the module's default cursor (0.45), not the sender's 0.5.
  await expect(b.getByRole("slider", { name: "時間游標" })).toHaveValue("0.45");
  await b.screenshot({ path: resolve(OUT, "B-clean-reopen.png") });
  const jsonB = JSON.parse(await download(b, "匯出軌跡資料 JSON / Export data", "B-drag-cursor0.json"));
  expect(jsonB.setup).toEqual(jsonA.setup); // same launch setup
  expect(jsonB.cursorFraction).toBeCloseTo(0.45, 6); // cursor explicitly differs from sender (0.5)
  expect(jsonB.trajectories.map((t: { samples: unknown[] }) => t.samples.length)).toEqual(jsonA.trajectories.map((t: { samples: unknown[] }) => t.samples.length));
  await writeFile(resolve(OUT, "share-url.txt"), url + "\n");
  await ctx.close();
});

test("legacy golden v1 link opens in a clean browser, paused, with its preset state", async ({ browser }) => {
  await mkdir(OUT, { recursive: true });
  const golden = '{"v":1,"mode":"free","launch":{"x":0,"height":25,"speed":20,"angle":30,"gravity":9.80665,"dragFactor":0,"scenario":"field"},"stairs":{"width":0.3,"rise":0.18,"count":24},"comparisons":{"showComplementary":true,"showEnvelope":false,"showAcceleration":true,"showDrag":false},"layers":{"trajectory":true,"velocity":false,"components":true,"guides":false,"grid":true,"labels":true,"markers":false},"preset":"elevated"}';
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const p = await ctx.newPage();
  await ready(p, "/projectile?s=" + encodeURIComponent(golden));
  await expect(p.locator(".projectile-share-notice")).toHaveCount(0);
  await expect(p.getByRole("button", { name: "播放", exact: true })).toBeVisible();
  const json = JSON.parse(await download(p, "匯出軌跡資料 JSON / Export data", "legacy-golden.json"));
  expect(json.setup.launch.height).toBe(25);
  expect(json.setup.launch.angle).toBe(30);
  await p.screenshot({ path: resolve(OUT, "legacy-golden-reopen.png") });
  await ctx.close();
});
