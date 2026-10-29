import { expect, test, type Page } from "@playwright/test";

const lab = (page: Page) => page.locator("main.hydrogen-lab");

async function openGuided(page: Page) {
  await page.goto("/hydrogen");
  await expect(page.getByTestId("intent-choice")).toBeVisible();
  // The server-rendered button exists before React hydrates; retry the click until the handler is attached.
  await expect(async () => {
    await page.getByTestId("choose-guided").click({ timeout: 1000 });
    await expect(lab(page)).toHaveAttribute("data-mode", "guided", { timeout: 1000 });
  }).toPass();
}

/** Everything that would carry the answer: orbit and energy diagrams, level names, the transition readout. */
async function expectNoAnswerLeak(page: Page) {
  await expect(page.getByRole("group", { name: "氫原子能階圖" })).toHaveCount(0);
  await expect(page.locator('svg[aria-label*="軌道圖"]')).toHaveCount(0);
  await expect(page.locator("svg g[role=button]")).toHaveCount(0);
  await expect(page.getByTestId("guided-evidence")).toHaveCount(0);
  await expect(page.getByTestId("evidence-equation")).toHaveCount(0);
  const spectrum = page.locator(".hydrogen-guided-spectrum");
  await expect(spectrum).not.toContainText("Hβ");
  await expect(spectrum).not.toContainText("→");
  await expect(spectrum.getByRole("img", { name: /4 到 2|4→2|n=4/ })).toHaveCount(0);
  await expect(spectrum.getByRole("img", { name: /要解釋的那一條/ })).toHaveCount(1);
}

test("the entry offers both modes and either one starts clean", async ({ page }) => {
  await page.goto("/hydrogen");
  await expect(page.getByTestId("choose-guided")).toContainText("從氫原子的光譜出發");
  await expect(page.getByTestId("choose-free")).toContainText("自由改變能階");
  await expect(async () => {
    await page.getByTestId("choose-free").click({ timeout: 1000 });
    await expect(lab(page)).toHaveAttribute("data-mode", "free", { timeout: 1000 });
  }).toPass();
  await expect(page.getByText("玻耳軌道")).toBeVisible();
  await expect(page.getByRole("group", { name: "氫原子能階圖" })).toBeVisible();
  await expect(page.getByRole("button", { name: /放出光子|吸收光子/ })).toBeVisible();
});

test("free exploration keeps selecting, placing and firing", async ({ page }) => {
  await page.goto("/hydrogen");
  await expect(async () => {
    await page.getByTestId("choose-free").click({ timeout: 1000 });
    await expect(lab(page)).toHaveAttribute("data-mode", "free", { timeout: 1000 });
  }).toPass();
  await page.getByRole("button", { name: "Balmer Hβ（4→2）" }).click();
  await expect(page.getByRole("button", { name: /選擇躍遷 4 到 2/ }).first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#hydrogen-fire-status")).toContainText("需要電子先在 n=4");
  await page.getByRole("button", { name: "設定電子在 n=4" }).click();
  await page.getByRole("button", { name: "放出光子" }).click();
  await expect(page.locator("#hydrogen-fire-status")).toContainText(/光子飛行中|電子在 n=2/);
});

test("guided mode starts on the spectrum without the answer anywhere", async ({ page }) => {
  await openGuided(page);
  await expect(page.getByTestId("guided-card")).toHaveAttribute("data-phase", "observe");
  await expect(page.getByRole("heading", { name: /486 nm 從哪裡來/ })).toBeFocused();
  await expectNoAnswerLeak(page);
  await page.getByTestId("begin-predict").click();
  await expect(page.getByTestId("guided-card")).toHaveAttribute("data-phase", "predict");
  await expect(page.getByTestId("submit-guess")).toBeDisabled();
  await expectNoAnswerLeak(page);
});

test("wrong guess, retry, then the right one, then the evidence", async ({ page }) => {
  await openGuided(page);
  await page.getByTestId("begin-predict").click();

  await page.getByTestId("hint").click();
  await expect(page.getByRole("note")).toHaveCount(1);
  await page.getByTestId("hint").click();
  await expect(page.getByRole("note")).toHaveCount(2);
  await expect(page.getByTestId("hint")).toHaveCount(0);

  await page.getByTestId("guess-3").click();
  await page.getByTestId("submit-guess").click();
  await expect(page.getByTestId("comparison")).toContainText("656.1 nm");
  await expect(page.getByTestId("comparison-feedback")).toContainText("能量差更大");
  await expect(page.locator(".hydrogen-guided-spectrum")).toContainText("你的預測 656 nm");
  await expectNoAnswerLeak(page);

  await page.getByTestId("retry").click();
  await expect(page.getByTestId("guess-3")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("submit-guess")).toBeDisabled();
  await page.getByTestId("guess-4").click();
  await page.getByTestId("submit-guess").click();
  await expect(page.getByTestId("comparison-feedback")).toContainText("吻合");
  await expectNoAnswerLeak(page);

  await page.getByTestId("show-evidence").click();
  await expect(page.getByTestId("guided-card")).toHaveAttribute("data-phase", "evidence");
  await expect(page.getByTestId("evidence-equation")).toContainText("2.55 eV");
  await expect(page.getByTestId("evidence-equation")).toContainText("486.0 nm");
  await expect(page.getByRole("group", { name: "氫原子能階圖" })).toBeVisible();
  await expect(page.locator('svg[aria-label*="軌道圖"]')).toBeVisible();
  await expect(page.locator(".hydrogen-guided-spectrum")).toContainText("Hβ 4→2");

  // The photon goes out through the same blocked/ready rule as free exploration.
  await expect(page.locator("#hydrogen-guided-fire-status")).toContainText("電子在 n=4");
  await page.getByTestId("guided-fire").click();
  await expect(page.getByTestId("guided-fire")).toBeDisabled();
  await page.getByRole("button", { name: "電子回到 n=4" }).click();
  await expect(page.getByTestId("guided-fire")).toBeEnabled();
});

test("submitting a prediction leaves the electron on n=4 until the student fires", async ({ page }) => {
  await openGuided(page);
  await page.getByTestId("begin-predict").click();
  await page.getByTestId("guess-5").click();
  await page.getByTestId("submit-guess").click();
  await page.getByTestId("show-evidence").click();
  await expect(page.locator("#hydrogen-guided-fire-status")).toContainText("電子在 n=4，可以放出");
  await expect(page.getByTestId("guided-card")).toContainText("你先前選的是 n=5，真正的躍遷是 n=4");
  await expect(page.locator(".hydrogen-guided-spectrum")).toContainText("你的預測 434 nm");
});

test("switching modes resets both sides", async ({ page }) => {
  await openGuided(page);
  await page.getByTestId("begin-predict").click();
  await page.getByTestId("guess-3").click();
  await page.getByTestId("submit-guess").click();
  await page.getByTestId("mode-toggle").click();
  await expect(lab(page)).toHaveAttribute("data-mode", "free");
  // Free mode starts from its own initial atom (3→2, electron on n=3), not the guided one.
  await expect(page.locator("#hydrogen-fire-status")).toContainText("電子在 n=3，可以放出光子");
  await page.getByTestId("mode-toggle").click();
  await expect(page.getByTestId("guided-card")).toHaveAttribute("data-phase", "observe");
  await expectNoAnswerLeak(page);
});

test("the whole activity works from the keyboard", async ({ page }) => {
  await openGuided(page);
  await page.keyboard.press("Tab");
  await page.getByTestId("begin-predict").focus();
  await page.keyboard.press("Enter");
  await page.getByTestId("guess-4").focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("guess-4")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("submit-guess").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /n=4 → n=2：與觀察吻合/ })).toBeFocused();
  await page.getByTestId("show-evidence").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("guided-card")).toHaveAttribute("data-phase", "evidence");
});

test("@mobile guided activity fits a phone: no sideways scroll and the next step is reachable", async ({ page }) => {
  await openGuided(page);
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);
  // The spectrum is drawn at its real pixel size, so its tick text stays readable.
  const tick = page.locator(".hydrogen-guided-spectrum svg text").first();
  const fontPx = await tick.evaluate((el) => (el as SVGTextElement).getBoundingClientRect().height);
  expect(fontPx).toBeGreaterThan(9);

  await page.getByTestId("begin-predict").click();
  await page.getByTestId("guess-3").click();
  await page.getByTestId("submit-guess").click();
  await expect(page.getByTestId("retry")).toBeInViewport();
  await page.getByTestId("retry").click();
  await page.getByTestId("guess-4").click();
  await page.getByTestId("submit-guess").click();
  await page.getByTestId("show-evidence").click();
  await expect(page.getByTestId("guided-evidence")).toBeInViewport();
  expect(await overflow()).toBeLessThanOrEqual(0);
});
