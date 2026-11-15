import { test, expect } from '@playwright/test';

for (const width of [1440, 320]) {
  test(`public ChartMetric retains default and logical alignment at ${width}px`, async ({ page }, info) => {
    const theme = info.project.name === 'dark' ? 'dark' : 'light';
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript((value) => localStorage.setItem('uix-theme', value), theme);
    await page.goto('docs/explorer.html#examples-insight-charts', { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const region = page.locator('[data-chart-metric-root]');
    await region.scrollIntoViewIfNeeded();
    const start = region.locator('[data-metric-specimen="start"]');
    const end = region.locator('[data-metric-specimen="end"]');
    const original = region.locator('[data-metric-specimen="default"]');
    await expect(start.locator('.uix-chart__metric-value')).toHaveText('0');
    await expect(start.locator('.uix-chart__delta')).toHaveAttribute('data-tone', 'positive');
    await expect(original.locator('.uix-chart__delta')).toHaveAttribute('data-tone', 'negative');
    await expect(start).toHaveCSS('text-align', 'start');
    await expect(end).toHaveCSS('text-align', 'end');
    await expect(original).toHaveCSS('text-align', width <= 520 ? 'left' : 'right');
    for (const metric of [start, end, original]) {
      expect(await metric.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    await region.evaluate((element) => { element.dir = 'rtl'; });
    await expect(start).toHaveCSS('text-align', 'start');
    await expect(end).toHaveCSS('text-align', 'end');
    await region.evaluate((element) => { element.dir = 'ltr'; });
    await region.screenshot({ path: info.outputPath(`metrics-${theme}-${width}.png`) });
  });
}
