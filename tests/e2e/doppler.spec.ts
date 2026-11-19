import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { evidencePath } from "./evidence";

const DOPPLER = "/doppler";
const ANSWERS = /\b(0\.80|1\.00|1\.20|1\.25|0\.83)\b/;

async function open(page: Page, path = DOPPLER) {
  await page.goto(path);
  await expect(page.locator("main")).toHaveAttribute("data-interactive", "true");
}
const preset = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).click();
const readout = (page: Page, label: string) => page.getByTestId("pair-readout").locator("dl > div", { hasText: label }).locator("dd");
const toReception = (page: Page) => page.getByRole("button", { name: /^(播放到接收|Play to reception)$/ }).first().click();
const mode = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

test.describe("Doppler — free exploration", () => {
  test("two figures read from one event list: spacing and reception interval give 0.80 and 1.25", async ({ page }) => {
    await open(page);
    await preset(page, "波源靠近");
    await expect(page.getByTestId("clock")).toContainText("0.00 /");
    // Before the pair is received there is a spacing but no reception interval yet.
    await expect(readout(page, "接收間隔")).toHaveText("等待相鄰兩次接收");
    await expect(page.getByTestId("live-readout")).toContainText("等待相鄰兩次接收");
    await toReception(page);
    await expect(readout(page, "波前間距")).toHaveText("0.80");
    await expect(readout(page, "接收間隔")).toHaveText("0.80");
    await expect(readout(page, "接收頻率")).toHaveText("1.25");
    await expect(readout(page, "發射間隔")).toHaveText("1.00");
    await expect(page.getByTestId("spacing-bracket")).toContainText("0.80");
    await expect(page.getByTestId("emission-bracket")).toContainText("1.00");
    await expect(page.getByTestId("reception-bracket")).toContainText("0.80");
    await expect(page.getByTestId("live-readout")).toContainText("1.25");
    await page.getByText("公式核對").click();
    await expect(page.getByText("公式 與事件量測一致")).toBeVisible();
  });

  test("keep a reference, change who moves, compare 1.25 with 1.20 on the same scale", async ({ page }) => {
    await open(page);
    await preset(page, "波源靠近");
    await toReception(page);
    await page.getByRole("button", { name: "保留為參考" }).click();
    await expect(page.getByRole("button", { name: "已保留參考" })).toBeVisible();
    const frontsBefore = await page.getByTestId("wavefront-view").getAttribute("viewBox");
    await preset(page, "觀察者靠近");
    await expect(page.getByTestId("clock")).toContainText("0.00 /"); // a new setup regenerates the experiment at t = 0
    await toReception(page);
    const table = page.getByRole("table", { name: "與參考比較" });
    await expect(table.getByRole("row", { name: /f \/ f₀/ })).toContainText("1.20");
    await expect(table.getByRole("row", { name: /f \/ f₀/ })).toContainText("1.25");
    await expect(table.getByRole("row", { name: /λ \/ λ₀/ })).toContainText("1.00");
    await expect(table.getByRole("row", { name: /λ \/ λ₀/ })).toContainText("0.80");
    expect(await page.getByTestId("wavefront-view").getAttribute("viewBox")).toBe(frontsBefore);
    await preset(page, "同向同速");
    await toReception(page);
    await expect(readout(page, "接收頻率")).toHaveText("1.00");
    await expect(readout(page, "波前間距")).toHaveText("0.80");
  });

  test("a pair is selected from the time band, the stepper or a front, and every view follows", async ({ page }) => {
    await open(page);
    await preset(page, "波源靠近");
    await page.getByRole("button", { name: "跳到結束" }).click();
    await page.getByRole("button", { name: "上一對" }).click();
    await expect(page.getByTestId("pair-readout").locator("output")).toHaveText("#1 ↔ #2");
    // Clicking a reception marker on the band selects the pair that starts at that front.
    await page.locator('g[data-event="reception"][data-n="5"] circle').click({ force: true });
    await expect(page.getByTestId("pair-readout").locator("output")).toHaveText("#5 ↔ #6");
    await expect(page.locator('circle[data-front="5"]')).toHaveAttribute("stroke", "#5ed8c3");
    await expect(page.locator('circle[data-front="6"]')).toHaveAttribute("stroke", "#5ed8c3");
    await expect(page.locator('circle[data-front="2"]')).not.toHaveAttribute("stroke", "#5ed8c3");
    await expect(page.getByTestId("spacing-bracket")).toContainText("#5");
    await expect(page.getByTestId("spacing-bracket")).toContainText("#6");
    // The same pair carries the same number on both tracks.
    await expect(page.locator('g[data-event="emission"][data-n="5"] path')).toHaveAttribute("stroke", "#5ed8c3");
    await expect(page.locator('g[data-event="reception"][data-n="5"] rect')).toHaveAttribute("stroke", "#5ed8c3");
    // Any pair reads the same frequency for uniform motion.
    await expect(readout(page, "接收頻率")).toHaveText("1.25");
  });

  test("stepping, playing and rewinding never duplicate or lose an event", async ({ page }) => {
    await open(page);
    await preset(page, "觀察者靠近");
    const band = page.getByTestId("time-band");
    const counts = async () => ({
      emitted: Number(await band.getAttribute("data-emitted")),
      received: Number(await band.getAttribute("data-received")),
      emissionMarks: await page.locator('g[data-event="emission"]').count(),
      receptionMarks: await page.locator('g[data-event="reception"]').count(),
    });
    const forward: Awaited<ReturnType<typeof counts>>[] = [];
    for (let i = 0; i < 40; i += 1) {
      await page.getByRole("button", { name: "下一個事件" }).click();
      forward.push(await counts());
      if (await page.getByRole("button", { name: "下一個事件" }).isDisabled()) break;
    }
    for (const c of forward) { expect(c.emissionMarks).toBe(c.emitted); expect(c.receptionMarks).toBe(c.received); }
    for (let i = 1; i < forward.length; i += 1) {
      expect(forward[i].emitted - forward[i - 1].emitted).toBeLessThanOrEqual(1);
      expect(forward[i].received - forward[i - 1].received).toBeLessThanOrEqual(1);
      expect(forward[i].emitted + forward[i].received).toBeGreaterThan(forward[i - 1].emitted + forward[i - 1].received - 1);
    }
    const last = forward.at(-1)!;
    expect(last.emitted).toBe(17);
    // Rewind step by step: counts retrace the forward path exactly.
    const backward: Awaited<ReturnType<typeof counts>>[] = [];
    for (let i = 0; i < forward.length - 1; i += 1) {
      await page.getByRole("button", { name: "上一個事件" }).click();
      backward.push(await counts());
    }
    expect(backward).toEqual(forward.slice(0, -1).reverse());
    // And forward again over the same ground.
    for (let i = 0; i < forward.length - 1; i += 1) await page.getByRole("button", { name: "下一個事件" }).click();
    expect(await counts()).toEqual(last);
    // Scrubbing back to the start clears everything but front 0.
    await page.getByRole("button", { name: "回到起點" }).click();
    expect(await counts()).toEqual({ emitted: 1, received: 0, emissionMarks: 1, receptionMarks: 0 });
  });

  test("playback advances the model clock and stops at the end with a reason; speed only changes the feel", async ({ page }) => {
    await open(page);
    await preset(page, "波源靠近");
    await page.getByRole("button", { name: "2×" }).click();
    await page.getByRole("button", { name: "播放", exact: true }).click();
    await expect(page.getByRole("button", { name: "暫停" })).toBeVisible();
    await page.waitForTimeout(700);
    await page.getByRole("button", { name: "暫停" }).click();
    const clock = await page.getByTestId("clock").innerText();
    expect(Number(clock.split(" ")[0])).toBeGreaterThan(0.3);
    await page.waitForTimeout(300);
    expect(await page.getByTestId("clock").innerText()).toBe(clock);
    await page.getByRole("button", { name: "跳到結束" }).click();
    await expect(page.getByTestId("end-note")).toContainText("t = 16");
    // Both closing at 0.5c: the run ends before S and O coincide, and says so.
    await page.getByLabel("波源 S · 波源速度", { exact: false }).fill("0.5");
    await page.getByLabel("觀察者 O · 觀察者速度", { exact: false }).fill("-0.5");
    await expect(page.getByTestId("end-note")).toContainText("重合");
    await expect(page.getByTestId("band-ended")).toBeVisible();
    await page.getByRole("button", { name: "跳到結束" }).click();
    const gap = await page.evaluate(() => {
      const s = document.querySelector('[data-testid="source-marker"]')!.getBoundingClientRect();
      const o = document.querySelector('[data-testid="observer-marker"]')!.getBoundingClientRect();
      return o.left - s.right;
    });
    expect(gap).toBeGreaterThan(0);
  });

  test("keyboard alone drives presets, speed, clock and pair selection", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "觀察者靠近" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "觀察者靠近" })).toHaveAttribute("aria-pressed", "true");
    const slider = page.getByLabel("波源 S · 波源速度", { exact: false });
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveValue("0.1");
    await expect(page.getByRole("button", { name: "觀察者靠近" })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "反向", exact: false }).first().focus();
    await page.keyboard.press("Enter");
    await expect(slider).toHaveValue("-0.1");
    await page.getByLabel("時間 t").focus();
    await page.keyboard.press("End");
    await expect(page.getByTestId("clock")).toContainText("16.00 / 16.00");
    await page.getByRole("button", { name: "下一對" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("pair-readout").locator("output")).toHaveText("#3 ↔ #4");
  });

  test("a view expands on its own, keeps state, and Escape returns focus to its trigger", async ({ page }) => {
    await open(page);
    await preset(page, "波源靠近");
    await page.getByRole("button", { name: "跳到結束" }).click();
    const trigger = page.getByRole("button", { name: /放大視圖：空氣參考系的波前/ });
    await trigger.click();
    await expect(page.locator(".doppler-stage")).toHaveAttribute("data-expanded", "wave");
    await expect(page.locator('[data-card="band"]')).toBeHidden();
    await expect(page.getByRole("button", { name: "退出放大" })).toBeFocused();
    await expect(page.getByTestId("clock")).toContainText("16.00");
    await page.keyboard.press("Escape");
    await expect(page.locator(".doppler-stage")).toHaveAttribute("data-expanded", "none");
    await expect(trigger).toBeFocused();
    await page.getByRole("button", { name: /放大視圖：發射與接收時間帶/ }).click();
    await expect(page.locator(".doppler-stage")).toHaveAttribute("data-expanded", "band");
    await expect(page.locator('[data-card="wave"]')).toBeHidden();
    // The setup survived both round trips.
    await page.getByRole("button", { name: "退出放大" }).click();
    await expect(page.getByRole("button", { name: "波源靠近" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("clock")).toContainText("16.00");
  });

  test("reduced motion: playback steps from event to event and stays readable and controllable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await preset(page, "都靜止");
    await expect(page.getByText("已減少動態")).toBeVisible();
    await page.getByRole("button", { name: "2×" }).click();
    await page.getByRole("button", { name: "播放", exact: true }).click();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "暫停" }).click();
    const t = Number((await page.getByTestId("clock").innerText()).split(" ")[0]);
    expect(t).toBeGreaterThan(0);
    expect(Number.isInteger(t)).toBe(true); // an event time, not a mid-frame value
    await expect(page.getByRole("button", { name: "播放", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "跳到結束" }).click();
    await expect(readout(page, "接收頻率")).toHaveText("1.00");
  });
});

test.describe("Doppler — guided tasks", () => {
  test("Activity 1: prediction first, nothing leaks, then measure the rest baseline", async ({ page }) => {
    await open(page);
    await mode(page, "探索任務").click();
    const panel = page.getByTestId("guided-panel");
    await expect(panel).toHaveAttribute("data-phase", "predict");
    // S, O and their motion are identifiable before any prediction.
    await expect(page.getByTestId("source-marker")).toBeVisible();
    await expect(page.getByTestId("observer-marker")).toBeVisible();
    await expect(page.locator("svg[data-testid=wavefront-view] text", { hasText: "S 靜止" })).toBeVisible();
    await expect(page.locator("svg[data-testid=wavefront-view] text", { hasText: "O 靜止" })).toBeVisible();
    // No numbers, in the visible text or in the accessibility tree.
    expect(await page.locator("main").innerText()).not.toMatch(ANSWERS);
    expect(await page.locator("main").ariaSnapshot()).not.toMatch(ANSWERS);
    await expect(page.getByTestId("clock")).toHaveText("預測後可調整時間");
    await expect(page.getByLabel("時間 t")).toBeDisabled();
    await expect(page.getByRole("button", { name: "播放", exact: true })).toBeDisabled();
    await expect(mode(page, "理論與計算")).toBeDisabled();
    await expect(page.getByRole("button", { name: "模型資訊" })).toBeDisabled();
    await expect(page.locator("svg[data-testid=wavefront-view]")).toHaveAttribute("aria-label", /送出預測後才顯示讀值/);
    await expect(page.getByTestId("spacing-bracket")).toHaveCount(0);
    await page.getByRole("button", { name: "工具", exact: true }).click();
    await expect(page.getByRole("button", { name: /分享起始設定/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /匯出教學圖/ })).toHaveCount(0);
    await expect(page.locator(".doppler-menu-note")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /^間距是 1 λ₀，接收間隔也是 1 T₀/ }).click();
    await expect(panel).toHaveAttribute("data-phase", "measure");
    await expect(page.getByRole("button", { name: "我看到了，繼續" })).toBeDisabled();
    await toReception(page);
    const measures = panel.locator("dl.guided-measures");
    await expect(measures).toContainText("1.00 T₀");
    await expect(measures).toContainText("1.00 λ₀");
    await expect(page.getByRole("button", { name: "我看到了，繼續" })).toBeEnabled();
    await expect(mode(page, "理論與計算")).toBeEnabled();
    await page.getByRole("button", { name: "我看到了，繼續" }).click();
    await expect(panel).toHaveAttribute("data-phase", "explain");
    await page.getByRole("button", { name: /^靜止時每個波前都以同一速率 c/ }).click();
    await expect(panel).toHaveAttribute("data-phase", "complete");
    await expect(panel).toContainText("靜止基準");
    // Share and export stay closed inside a task, and open again on return.
    await page.getByRole("button", { name: "工具", exact: true }).click();
    await expect(page.locator(".doppler-menu-note")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("Activity 2: S moves, O moves, compare 1.25 vs 1.20, explain, then check by receding", async ({ page }) => {
    await open(page);
    await preset(page, "波源遠離"); // a free-exploration setup that must come back afterwards
    await mode(page, "探索任務").click();
    await page.getByRole("button", { name: /^2\s*誰在動？/ }).click();
    const panel = page.getByTestId("guided-panel");
    expect(await page.locator("main").innerText()).not.toMatch(ANSWERS);
    await expect(page.locator("svg[data-testid=wavefront-view] text", { hasText: "S +0.20c" })).toBeVisible();
    await page.getByRole("button", { name: /^情況二（觀察者靠近）的接收頻率較高/ }).click();
    await expect(panel).toHaveAttribute("data-phase", "measure");
    await toReception(page);
    const card = panel.getByRole("table", { name: "比較卡" });
    await expect(card).toContainText("0.80");
    await expect(card.getByRole("row", { name: /接收頻率/ })).toHaveCount(0); // the frequency waits for the comparison
    await expect(page.getByTestId("live-readout")).not.toContainText("1.25");
    await expect(page.getByTestId("pair-readout")).toHaveCount(0);
    await page.getByRole("button", { name: "保留這組結果，換 O 移動" }).click();
    await expect(panel).toHaveAttribute("data-phase", "observer");
    await expect(page.locator("svg[data-testid=wavefront-view] text", { hasText: "S 靜止" })).toBeVisible();
    await expect(page.locator("svg[data-testid=wavefront-view] text", { hasText: "O −0.20c" })).toBeVisible();
    await expect(page.getByTestId("clock")).toContainText("0.00 /");
    await expect(page.getByRole("button", { name: "保留這組結果，比較兩組" })).toBeDisabled();
    await toReception(page);
    await page.getByRole("button", { name: "保留這組結果，比較兩組" }).click();
    await expect(panel).toHaveAttribute("data-phase", "compare");
    const compare = panel.getByRole("table", { name: "比較卡" });
    await expect(compare.getByRole("row", { name: /波前間距/ })).toContainText("0.80");
    await expect(compare.getByRole("row", { name: /波前間距/ })).toContainText("1.00");
    await expect(compare.getByRole("row", { name: /接收間隔/ })).toContainText("0.80");
    await expect(compare.getByRole("row", { name: /接收間隔/ })).toContainText("0.83");
    await expect(compare.getByRole("row", { name: /接收頻率/ })).toContainText("1.25 · 較高");
    await expect(compare.getByRole("row", { name: /接收頻率/ })).toContainText("1.20");
    await page.getByRole("button", { name: "我想解釋原因" }).click();
    await page.getByRole("button", { name: /^波源靠近時，前方波前被壓縮到 0\.8 λ₀/ }).click();
    await expect(panel).toHaveAttribute("data-phase", "verify");
    await expect(page.getByRole("button", { name: "完成驗證" })).toBeDisabled();
    await toReception(page);
    await page.getByRole("button", { name: "保留這組結果", exact: true }).click();
    await page.getByRole("button", { name: /^觀察者遠離/ }).click();
    await toReception(page);
    await page.getByRole("button", { name: "保留這組結果", exact: true }).click();
    await page.getByRole("button", { name: "完成驗證" }).click();
    await expect(panel).toHaveAttribute("data-phase", "complete");
    const all = panel.getByRole("table", { name: "比較卡" });
    await expect(all.getByRole("row", { name: /接收頻率/ })).toContainText("0.83");
    await expect(all.getByRole("row", { name: /接收頻率/ })).toContainText("0.80");
    await expect(all.getByRole("row", { name: /波前間距/ })).toContainText("1.20");
    await expect(panel).toContainText("同向同速");
    await page.getByRole("button", { name: "回到自由探索" }).click();
    await expect(page.getByTestId("pair-readout")).toBeVisible();
    await expect(page.getByRole("button", { name: "波源遠離" })).toHaveAttribute("aria-pressed", "true"); // free setup restored
  });

  test("leaving mid-task asks first; restart and activity switch clear task progress; changing task never carries answers", async ({ page }) => {
    await open(page);
    await preset(page, "觀察者遠離");
    await mode(page, "探索任務").click();
    await mode(page, "自由探索").click(); // no prediction yet: nothing to lose
    await expect(page.getByTestId("guided-panel")).toHaveCount(0);
    await mode(page, "探索任務").click();
    await page.getByRole("button", { name: /^間距是 1 λ₀，接收間隔也是 1 T₀/ }).click();
    await toReception(page);
    await mode(page, "自由探索").click();
    const confirm = page.getByRole("alertdialog", { name: "離開探索任務" });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "繼續任務" }).click();
    await expect(page.getByTestId("guided-panel")).toHaveAttribute("data-phase", "measure");
    await page.getByRole("button", { name: "重新開始此任務" }).click();
    await expect(page.getByTestId("guided-panel")).toHaveAttribute("data-phase", "predict");
    expect(await page.locator("main").innerText()).not.toMatch(ANSWERS);
    await page.getByRole("button", { name: /^間距是 1 λ₀，接收間隔也是 1 T₀/ }).click();
    await mode(page, "自由探索").click();
    await page.getByRole("alertdialog", { name: "離開探索任務" }).getByRole("button", { name: "離開任務" }).click();
    await expect(page.getByRole("button", { name: "觀察者遠離" })).toHaveAttribute("aria-pressed", "true");
    // The reference kept in free exploration also survives a visit to a task.
    await toReception(page);
    await page.getByRole("button", { name: "保留為參考" }).click();
    await mode(page, "探索任務").click();
    await mode(page, "自由探索").click();
    await expect(page.getByRole("button", { name: "已保留參考" })).toBeVisible();
  });
});

test.describe("Doppler — share, export, language", () => {
  test("a share is a paused starting setup that round-trips in a clean browser; bad ones fall back with a reason", async ({ page, browser }) => {
    await open(page);
    await preset(page, "觀察者靠近");
    await page.getByRole("button", { name: "跳到結束" }).click();
    await page.getByRole("button", { name: "下一對" }).click();
    await page.getByRole("button", { name: "工具", exact: true }).click();
    await page.getByRole("button", { name: /分享起始設定/ }).click();
    const url = await page.getByLabel("分享連結").inputValue();
    expect(url).toContain("/doppler?s=");
    expect(url).not.toMatch(/prediction|explanation|session/);
    const clean = await browser.newContext();
    const fresh = await clean.newPage();
    await open(fresh, new URL(url).pathname + new URL(url).search);
    await expect(fresh.getByRole("button", { name: "觀察者靠近" })).toHaveAttribute("aria-pressed", "true");
    await expect(fresh.getByTestId("clock")).toContainText("0.00 /"); // opens paused at the start, not at the sender's time
    await expect(fresh.getByRole("button", { name: "播放", exact: true })).toBeVisible();
    await expect(fresh.getByTestId("pair-readout").locator("output")).toHaveText("#3 ↔ #4");
    await expect(fresh.getByTestId("notice")).toHaveCount(0);
    await toReception(fresh);
    await expect(readout(fresh, "接收頻率")).toHaveText("1.20");
    const good = JSON.parse(new URL(url).searchParams.get("s")!);
    const bad = async (payload: unknown, text: RegExp) => {
      await open(fresh, `${DOPPLER}?s=${encodeURIComponent(typeof payload === "string" ? payload : JSON.stringify(payload))}`);
      await expect(fresh.getByTestId("notice")).toContainText(text);
      await expect(fresh.getByRole("button", { name: "都靜止" })).toHaveAttribute("aria-pressed", "true");
      await expect(fresh.getByTestId("clock")).toContainText("0.00 /");
    };
    await bad("{not json", /無法讀取/);
    await bad({ ...good, v: 2 }, /格式版本不相容/);
    await bad({ ...good, model: "doppler-wavefront-0" }, /不同版本的模型/);
    await bad({ ...good, setup: { ...good.setup, us: 5 } }, /無法讀取/);
    await clean.close();
  });

  test("exports a figure and event data; the opened SVG shows conditions, units, model version, both figures and the comparison", async ({ page, browser }, testInfo) => {
    test.setTimeout(90_000);
    await open(page);
    await preset(page, "波源靠近");
    await toReception(page);
    await page.getByRole("button", { name: "保留為參考" }).click();
    await preset(page, "觀察者靠近");
    await toReception(page);
    await page.getByRole("button", { name: "工具", exact: true }).click();
    const svgDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: /匯出教學圖/ }).click();
    const svgFile = await svgDownload;
    expect(svgFile.suggestedFilename()).toBe("kakau-doppler.svg");
    const svg = await readFile((await svgFile.path())!, "utf8");
    await page.getByRole("button", { name: "工具", exact: true }).click();
    const jsonDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: /匯出事件資料/ }).click();
    const jsonFile = await jsonDownload;
    expect(jsonFile.suggestedFilename()).toBe("kakau-doppler.json");
    const json = JSON.parse(await readFile((await jsonFile.path())!, "utf8"));
    await expect(page.getByTestId("notice")).toContainText("已匯出");
    expect(json.schema).toBe("doppler-result-1");
    expect(json.modelVersion).toBe("doppler-wavefront-1");
    expect(json.setup).toMatchObject({ sourceVelocity: 0, observerVelocity: -0.2 });
    expect(json.ratios.frequency).toBeCloseTo(1.2, 9);
    expect(json.reference.ratios.frequency).toBeCloseTo(1.25, 9);
    expect(json.receptions.length).toBeGreaterThan(5);
    for (const text of ["聲音的都普勒效應 / Doppler effect of sound", "doppler-wavefront-1", "λ₀ = cT₀ = 1", "公式核對 / Formula"]) expect(svg).toContain(text);
    const file = evidencePath("export-observer-approach.svg");
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, svg);
    await writeFile(evidencePath("export-observer-approach.json"), JSON.stringify(json, null, 2));
    // Open the actual file the way a teacher would, and look at it.
    const viewer = await browser.newPage({ viewport: { width: 1040, height: 900 } });
    await viewer.goto(`file://${file}`);
    await expect(viewer.locator("svg")).toBeVisible();
    const box = await viewer.locator("svg").boundingBox();
    expect(box!.width).toBeGreaterThan(900);
    // Every text element sits inside the drawing: nothing cropped by the viewBox.
    const overflow = await viewer.evaluate(() => {
      const root = document.querySelector("svg")!.getBoundingClientRect();
      return [...document.querySelectorAll("svg text")].filter((el) => { const r = el.getBoundingClientRect(); return r.right > root.right + 1 || r.left < root.left - 1 || r.bottom > root.bottom + 1; }).map((el) => el.textContent);
    });
    expect(overflow).toEqual([]);
    // A bare SVG document cannot be screenshotted reliably; embed the real exported file as an image instead.
    const wrapper = testInfo.outputPath("view.html");
    await mkdir(dirname(wrapper), { recursive: true });
    await writeFile(wrapper, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff"><img id="f" src="file://${file}" width="1000"></body>`);
    await viewer.goto(`file://${wrapper}`);
    await expect(viewer.locator("#f")).toBeVisible();
    await viewer.waitForFunction(() => (document.getElementById("f") as HTMLImageElement).complete && (document.getElementById("f") as HTMLImageElement).naturalWidth > 0);
    await viewer.locator("#f").screenshot({ path: evidencePath("export-observer-approach.png") });
    await viewer.close();
    await testInfo.attach("export-svg", { path: file });
    // Not exportable from inside a task.
    await mode(page, "探索任務").click();
    await page.getByRole("button", { name: "工具", exact: true }).click();
    await expect(page.getByRole("button", { name: /匯出/ })).toHaveCount(0);
  });

  test("English route is complete and switching language keeps the experiment", async ({ page }) => {
    await open(page, "/en/doppler");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Doppler Effect of Sound");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.getByRole("button", { name: "Source approaches" }).click();
    await page.getByRole("button", { name: "Play to reception" }).first().click();
    await expect(page.getByTestId("pair-readout").locator("dl > div", { hasText: "Received frequency" }).locator("dd")).toHaveText("1.25");
    await page.getByRole("link", { name: /繁體中文/ }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/doppler");
    await expect(page.getByRole("button", { name: "波源靠近" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("link", { name: /English/ }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/en/doppler");
    await expect(page.getByRole("button", { name: "Source approaches" })).toHaveAttribute("aria-pressed", "true");
    // Guided English copy and theory.
    await page.getByRole("button", { name: "Guided tasks", exact: true }).click();
    await expect(page.getByTestId("guided-panel")).toContainText("How does the source make sound?");
    expect(await page.locator("main").innerText()).not.toMatch(ANSWERS);
    await page.getByRole("button", { name: /^Spacing is 1 λ₀ and the reception interval is 1 T₀/ }).click();
    await page.getByRole("button", { name: "Theory & calculation" }).click();
    await expect(page.getByRole("dialog", { name: /Doppler effect of sound/ })).toContainText("Pitch and loudness");
    await expect(page.getByRole("dialog")).toContainText("Frequency sets pitch");
    await page.keyboard.press("Escape");
    await page.goto("/doppler");
    await open(page);
    await mode(page, "理論與計算").click();
    await expect(page.getByRole("dialog")).toContainText("頻率決定音調");
    await expect(page.getByRole("dialog")).toContainText("振幅決定音量");
  });
});

const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
  { width: 320, height: 640 },
] as const;

test.describe("Doppler — viewports", () => {
  for (const viewport of VIEWPORTS) {
    test(`core operation, no overflow and visible focus at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      await preset(page, "波源靠近");
      const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
      expect(await fits()).toBe(true);
      // Both figures, the clock and the key controls are rendered inside the viewport width.
      for (const id of ["wavefront-view", "time-band", "live-readout"]) {
        const box = await page.getByTestId(id).boundingBox();
        expect(box, id).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(-1);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(box!.width).toBeGreaterThan(viewport.width * 0.6);
      }
      // Touch targets of the main entries are at least 44 CSS px.
      for (const name of ["自由探索", "探索任務", "播放", "回到起點", "下一個事件", "都靜止", "波源靠近", "觀察者靠近"]) {
        const box = await page.getByRole("button", { name, exact: true }).first().boundingBox();
        expect(box!.height, name).toBeGreaterThanOrEqual(43.5);
        expect(box!.width, name).toBeGreaterThanOrEqual(43.5);
      }
      // Play, then read the pair without leaving the page.
      await page.getByRole("button", { name: "播放到接收" }).first().scrollIntoViewIfNeeded();
      await toReception(page);
      await expect(readout(page, "接收頻率")).toHaveText("1.25");
      await expect(page.getByTestId("time-band")).toBeVisible();
      expect(await fits()).toBe(true);
      // Tab order: every stop shows a focus ring and stays inside the viewport width.
      await page.evaluate(() => { window.scrollTo(0, 0); (document.activeElement as HTMLElement | null)?.blur(); });
      const stops: string[] = [];
      for (let i = 0; i < 16; i += 1) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const style = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return { name: el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 24) || el.tagName, ring: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2, inside: r.left >= -1 && r.right <= innerWidth + 1 };
        });
        if (info) { stops.push(info.name ?? ""); expect(info.ring, `focus ring on ${info.name}`).toBe(true); expect(info.inside, `inside viewport: ${info.name}`).toBe(true); }
      }
      expect(stops.length).toBeGreaterThan(8);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: evidencePath(`free-${viewport.width}x${viewport.height}.png`) });
    });
  }

  test("320px: the guided task and the theory dialog reflow without horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await open(page);
    await mode(page, "探索任務").click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: evidencePath("guided-predict-320x640.png") });
    await page.getByRole("button", { name: /^間距是 1 λ₀，接收間隔也是 1 T₀/ }).click();
    await toReception(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await mode(page, "理論與計算").click();
    const dialogFits = await page.evaluate(() => { const d = document.querySelector('[role="dialog"]')!; return d.scrollWidth <= d.clientWidth + 1 || getComputedStyle(d.querySelector(".theory-scroll")!).overflowX !== "visible"; });
    expect(dialogFits).toBe(true);
    await page.keyboard.press("Escape");
  });

  for (const width of [320, 390]) {
    test(`English copy at ${width}px: long labels reflow without horizontal scroll, free and guided`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await open(page, "/en/doppler");
      await page.getByRole("button", { name: "Observer approaches" }).click();
      await page.getByRole("button", { name: "Play to reception" }).first().click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: evidencePath(`en-free-${width}x700.png`) });
      await page.getByRole("button", { name: "Guided tasks", exact: true }).click();
      await page.getByRole("button", { name: /Who is moving/ }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: evidencePath(`en-guided-predict-${width}x700.png`) });
      const clipped = await page.evaluate(() => [...document.querySelectorAll(".guided-choices button, .doppler-modebar button, .doppler-presets button")].filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent));
      expect(clipped).toEqual([]);
    });
  }

  test("390x844 guided flow screenshots for evidence", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await mode(page, "探索任務").click();
    await page.getByRole("button", { name: /誰在動/ }).click();
    await page.screenshot({ path: evidencePath("guided-b-predict-390x844.png") });
    await page.getByRole("button", { name: /^情況一（波源靠近）/ }).click();
    await toReception(page);
    await page.screenshot({ path: evidencePath("guided-b-measure-390x844.png") });
  });
});

test("@a11y Doppler free exploration and guided states have no serious or critical axe violations", async ({ page }) => {
  await open(page);
  const scan = async (label: string) => {
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking, `${label}: ${blocking.map((v) => `${v.id}: ${v.help} ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`).join("\n")}`).toEqual([]);
  };
  await scan("initial");
  await preset(page, "波源靠近");
  await toReception(page);
  await scan("after reception");
  await mode(page, "探索任務").click();
  await scan("guided predict");
  await page.getByRole("button", { name: /^間距是 1 λ₀，接收間隔也是 1 T₀/ }).click();
  await toReception(page);
  await scan("guided measure");
  await mode(page, "理論與計算").click();
  await scan("theory dialog");
});

test.describe("Doppler — dark appearance", () => {
  test("@a11y dark UI: free, guided comparison and theory have no serious or critical axe violations; evidence screenshots", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 1280, height: 720 });
    await open(page);
    const scan = async (label: string) => {
      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(blocking, `${label}: ${blocking.map((v) => `${v.id}: ${v.help} ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`).join("\n")}`).toEqual([]);
    };
    await preset(page, "波源靠近");
    await toReception(page);
    await scan("dark free");
    await page.screenshot({ path: evidencePath("free-dark-1280x720.png") });
    await mode(page, "探索任務").click();
    await page.getByRole("button", { name: /^2\s*誰在動？/ }).click();
    await page.getByRole("button", { name: /^情況一（波源靠近）/ }).click();
    await toReception(page);
    await page.getByRole("button", { name: "保留這組結果，換 O 移動" }).click();
    await toReception(page);
    await page.getByRole("button", { name: "保留這組結果，比較兩組" }).click();
    await scan("dark guided compare");
    await page.screenshot({ path: evidencePath("guided-b-compare-dark-1280x720.png") });
    await mode(page, "理論與計算").click();
    await expect(page.getByRole("dialog")).toContainText("1.25");
    await scan("dark theory");
    await page.screenshot({ path: evidencePath("theory-dark-1280x720.png") });
  });
});
