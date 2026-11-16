import { expect, test, type Page } from "@playwright/test";

/* Screenshots are written only on request, so an ordinary run never touches tracked files. */
const evidenceDir = process.env.GATE_B_EVIDENCE_DIR;
const shot = async (page: Page, name: string) => { if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/${name}` }); };

const lab = (page: Page) => page.locator("main.hydrogen-lab");
const card = (page: Page, view: "orbit" | "energy" | "spectrum") => page.locator(`.viewport-card[data-view="${view}"]`);

async function open(page: Page, mode: "free" | "guided") {
  await page.goto("/hydrogen");
  await expect(page.getByTestId("intent-choice")).toBeVisible();
  await expect(async () => {
    await page.getByTestId(`choose-${mode}`).click({ timeout: 1000 });
    await expect(lab(page)).toHaveAttribute("data-mode", mode, { timeout: 1000 });
  }).toPass();
  await page.evaluate(() => window.scrollTo(0, 0));
}

const viewports = [
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];

for (const viewport of viewports) {
  const phone = viewport.width < 900;

  test(`causal workspace: choose, execute and read one transition ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, "free");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

    await expect(page.getByTestId("transition-flow")).toBeVisible();
    await expect(card(page, "energy")).toBeVisible();
    await expect(card(page, "spectrum")).toBeVisible();
    await expect(page.getByTestId("execute-transition")).toBeEnabled();
    const spectrumBox = await card(page, "spectrum").boundingBox();
    // Phones may need a short scroll, but never a round trip to a detached control panel.
    if (phone) expect(spectrumBox && spectrumBox.y < viewport.height + 280).toBeTruthy();
    await shot(page, `ux-reset-hydrogen-${viewport.width}x${viewport.height}.png`);

    // Hβ is one direct choice. It also prepares the stated initial level, so firing is the second
    // and final operation rather than requiring a separate slider adjustment.
    await page.getByTestId("event-4-2").click();
    const arrow = card(page, "energy").getByRole("button", { name: /選擇躍遷 4 到 2/ });
    await expect(arrow).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".hydrogen-metrics")).toContainText("486.0 nm");
    await expect(card(page, "spectrum").getByRole("button", { name: /選擇躍遷 4 到 2/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("transition-flow")).toContainText("電子已在 n=4");
    await expect(page.getByTestId("execute-transition")).toBeEnabled();
    // The wavelength is written in ink; its colour is a chip beside it.
    const wavelength = page.locator(".hydrogen-metrics strong", { hasText: "486.0 nm" });
    expect(await wavelength.evaluate((el) => getComputedStyle(el).color)).not.toMatch(/rgb\(0, 2\d\d, 255\)/);
    await expect(wavelength.locator(".hydrogen-swatch")).toHaveAttribute("data-visible", "true");

    await page.getByTestId("execute-transition").click();
    await expect(page.getByTestId("execute-transition")).toBeDisabled();

    // A per-view setting, to prove it survives enlargement.
    await page.getByRole("button", { name: "可見光 380–750" }).click();
    for (const view of ["energy", "spectrum"] as const) {
      const trigger = page.getByTestId(`expand-${view}`);
      await trigger.click();
      const target = card(page, view);
      await expect(target).toHaveAttribute("data-expanded", "true");
      await expect(target.getByRole("button", { name: "退出放大" })).toBeFocused();
      const box = await target.boundingBox();
      expect(box && box.width >= viewport.width - 1 && box.height >= viewport.height - 20).toBeTruthy();
      await expect(page.getByTestId("expand-caption")).toContainText("486.0 nm");
      for (let press = 0; press < 10; press += 1) {
        await page.keyboard.press("Tab");
        expect(await target.evaluate((el) => el.contains(document.activeElement))).toBe(true);
      }
      // Native fullscreen refused: the enlarged view stays and says so.
      await page.evaluate(() => { Element.prototype.requestFullscreen = () => Promise.reject(new Error("blocked")); });
      await target.getByRole("button", { name: "全螢幕" }).click();
      await expect(target.locator(".hydrogen-expand-notice")).toContainText("視窗內放大仍可使用");
      await expect(target).toHaveAttribute("data-expanded", "true");
      if (viewport.width === 360) await shot(page, `ux-reset-hydrogen-expanded-${view}-360x800.png`);
      await page.keyboard.press("Escape");
      await expect(target).toHaveAttribute("data-expanded", "false");
      await expect(trigger).toBeFocused();
    }

    // Selection and the per-view range are exactly what they were.
    await expect(page.locator(".hydrogen-metrics")).toContainText("486.0 nm");
    await expect(page.getByRole("button", { name: "可見光 380–750" })).toHaveAttribute("aria-pressed", "true");

    // Absorption reverses the direction but keeps the same selected energy gap and direct action.
    await page.getByRole("button", { name: "吸收 低→高" }).click();
    await page.getByTestId("event-3-2").click();
    await expect(page.getByTestId("transition-flow")).toContainText("3 ← 2");
    await expect(page.getByTestId("execute-transition")).toHaveText("吸收光子");
    await expect(page.getByTestId("execute-transition")).toBeEnabled();
    // Orbit remains available, but cannot compete with the causal workspace as a primary task.
    await page.getByText("查看玻耳軌道輔助表徵", { exact: true }).click();
    await expect(card(page, "orbit")).toBeVisible();
  });
}

test("guided: an enlarged spectrum before the prediction reveals nothing more", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await open(page, "guided");
  await page.getByTestId("begin-predict").click();
  await page.getByTestId("expand-spectrum").click();
  const spectrum = card(page, "spectrum");
  await expect(spectrum).toHaveAttribute("data-expanded", "true");
  await expect(page.getByTestId("expand-caption")).toHaveCount(0);
  await expect(spectrum).not.toContainText("Hβ");
  await expect(spectrum).not.toContainText("→");
  await expect(page.locator("svg g[role=button]")).toHaveCount(0);
  await expect(page.getByTestId("expand-energy")).toHaveCount(0);
  await expect(page.getByTestId("expand-orbit")).toHaveCount(0);
  await shot(page, "gate-b-hydrogen-guided-expanded-360x800.png");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("guided-card")).toHaveAttribute("data-phase", "predict");
});

test("guided: evidence views enlarge one at a time and carry the linked transition", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "guided");
  await page.getByTestId("begin-predict").click();
  await page.getByTestId("guess-4").click();
  await page.getByTestId("submit-guess").click();
  await page.getByTestId("show-evidence").first().click();
  await expect(page.getByTestId("guided-evidence")).toBeVisible();
  await page.getByTestId("expand-energy").click();
  await expect(card(page, "energy")).toHaveAttribute("data-expanded", "true");
  await expect(card(page, "orbit")).toHaveAttribute("data-expanded", "false");
  await expect(page.getByTestId("expand-caption")).toContainText("4 → 2");
  await page.getByRole("button", { name: "退出放大" }).click();
  await expect(page.getByTestId("guided-card")).toHaveAttribute("data-phase", "evidence");
});
