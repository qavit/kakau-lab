import { expect, test } from "@playwright/test";

test("development harness survives StrictMode replay, unmount, and remount", async ({ page }) => {
  await page.goto("/interference-lifecycle");
  const host = page.getByTestId("interference-host");
  const runtime = host.locator("[data-interference-runtime]");

  await expect(host).toHaveCount(1);
  await expect(runtime).toHaveCount(1);
  await expect.poll(() => runtime.getAttribute("data-interference-frame")).not.toBeNull();

  await runtime.evaluate((element) => {
    (window as Window & { staleInterferenceRuntime?: HTMLElement }).staleInterferenceRuntime = element as HTMLElement;
  });
  await page.getByTestId("toggle-interference").click();
  await expect(runtime).toHaveCount(0);
  await page.evaluate(() => {
    const testWindow = window as Window & { staleInterferenceRuntime?: HTMLElement; staleInterferenceFrame?: string };
    testWindow.staleInterferenceFrame = testWindow.staleInterferenceRuntime?.dataset.interferenceFrame;
  });
  await page.waitForTimeout(60);

  const disposedState = await page.evaluate(() => {
    const testWindow = window as Window & { staleInterferenceRuntime?: HTMLElement; staleInterferenceFrame?: string };
    return {
      detached: testWindow.staleInterferenceRuntime?.isConnected === false,
      frameUnchanged: testWindow.staleInterferenceRuntime?.dataset.interferenceFrame === testWindow.staleInterferenceFrame,
    };
  });
  expect(disposedState).toEqual({ detached: true, frameUnchanged: true });

  await page.getByTestId("toggle-interference").click();
  await expect(host.locator("[data-interference-runtime]")).toHaveCount(1);
  await expect.poll(() => host.locator("[data-interference-runtime]").getAttribute("data-interference-frame")).not.toBeNull();
});
