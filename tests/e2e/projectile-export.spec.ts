import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
  test(`trajectory downloads and Guided protection ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/projectile');
    await expect(page.locator('main')).toHaveAttribute('data-interactive', 'true');
    for (const [label, extension] of [['軌跡資料 JSON / Trajectory data', 'json'], ['軌跡圖 SVG / Trajectory figure', 'svg']]) {
      await page.getByRole('button', { name: '匯出 / Export', exact: true }).click();
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: label, exact: true }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(`kakau-projectile.${extension}`);
      const contents = await readFile((await download.path())!, 'utf8');
      if (extension === 'json') {
        const data = JSON.parse(contents);
        expect(data.schema).toBe('projectile-result-1');
        expect(data.units.position).toBe('m');
        expect(data.trajectories[0].samples.length).toBeGreaterThan(2);
      } else {
        expect(contents).toContain('<metadata>');
        expect(contents).toContain('拋體軌跡 / Projectile trajectories');
      }
    }
    await page.getByRole('button', { name: '探索任務', exact: true }).click();
    await expect(page.getByRole('button', { name: '匯出 / Export', exact: true })).toHaveCount(0);
    await page.locator('.header-actions').getByRole('button', { name: '離開探索任務', exact: true }).click();
    await expect(page.getByRole('button', { name: '匯出 / Export', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
