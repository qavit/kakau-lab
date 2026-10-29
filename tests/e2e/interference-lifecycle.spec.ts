import { expect, test } from "@playwright/test";

test("development harness survives StrictMode replay, unmount, and remount", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeObserver = window.ResizeObserver;
    (window as Window & { recordedResizeCallbacks?: ResizeObserverCallback[] }).recordedResizeCallbacks = [];
    window.ResizeObserver = class extends NativeObserver {
      constructor(callback: ResizeObserverCallback) {
        super(callback);
        (window as Window & { recordedResizeCallbacks?: ResizeObserverCallback[] }).recordedResizeCallbacks?.push(callback);
      }
    };
  });
  await page.goto("/interference-lifecycle");
  const host = page.getByTestId("interference-host");
  const runtime = host.locator("[data-interference-runtime]");

  await expect(host).toHaveCount(1);
  await expect(runtime).toHaveCount(1);
  await expect.poll(() => runtime.getAttribute("data-interference-frame")).not.toBeNull();

  await runtime.evaluate((element) => {
    (window as Window & { staleInterferenceRuntime?: HTMLElement }).staleInterferenceRuntime = element as HTMLElement;
  });
  await page.getByTestId("interference-host").locator('[data-action="play-pause"]').click();
  const plot = page.getByTestId("interference-host").locator("[data-interference-plot]");
  const bounds = await plot.boundingBox();
  if (!bounds) throw new Error("Plot has no visible bounds");
  await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .5);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .55, bounds.y + bounds.height * .55);
  await page.getByTestId("toggle-interference").evaluate((button) => (button as HTMLButtonElement).click());
  await expect(runtime).toHaveCount(0);
  await page.evaluate(() => {
    const testWindow = window as Window & { staleInterferenceRuntime?: HTMLElement; staleInterferenceFrame?: string; recordedResizeCallbacks?: ResizeObserverCallback[] };
    testWindow.staleInterferenceFrame = testWindow.staleInterferenceRuntime?.dataset.interferenceFrame;
    testWindow.recordedResizeCallbacks?.forEach((callback) => callback([], {} as ResizeObserver));
  });
  await page.mouse.up();
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
