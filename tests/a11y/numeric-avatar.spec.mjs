import { test, expect } from '@playwright/test';

for (const width of [1440, 320]) {
  test(`numeric person geometry and named compatibility at ${width}px`, async ({ page }, info) => {
    const theme = info.project.name === 'dark' ? 'dark' : 'light';
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript((value) => localStorage.setItem('uix-theme', value), theme);
    await page.goto('docs/explorer.html#examples-data-display', { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const region = page.locator('[data-numeric-avatar-specimen]');
    await region.scrollIntoViewIfNeeded();
    for (const size of [24, 28, 32, 36, 40, 48]) {
      for (const kind of ['initials', 'image']) {
        const avatar = region.locator(`[data-numeric-avatar="${size}"] [data-kind="${kind}"]`);
        const bounds = await avatar.boundingBox();
        expect(bounds.width).toBe(size);
        expect(bounds.height).toBe(size);
        if (kind === 'initials') await expect(avatar).toHaveCSS('font-size', `${Math.max(9, Math.round(size * 0.42))}px`);
        else expect(await avatar.locator('img').evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
      }
    }
    for (const [name, size] of [['sm', 24], ['md', 32], ['lg', 44], ['xl', 64], ['2xl', 96]]) {
      const bounds = await region.locator(`[data-named-avatar="${name}"] .uix-avatar`).boundingBox();
      expect(bounds.width).toBe(size);
      expect(bounds.height).toBe(size);
    }
    for (const label of ['Verfügbar', 'Beschäftigt', 'Abwesend', 'Abgemeldet']) {
      const dot = region.getByRole('img', { name: label, exact: true });
      const bounds = await dot.boundingBox();
      expect(bounds.width).toBe(8);
      expect(bounds.height).toBe(8);
    }
    await expect(region.locator('[data-sized-decorative]')).toHaveAttribute('aria-hidden', 'true');
    expect(await region.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await region.screenshot({ path: info.outputPath(`people-${theme}-${width}.png`) });
  });
}
