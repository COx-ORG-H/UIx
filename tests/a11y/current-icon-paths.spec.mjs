import { test, expect } from '@playwright/test';
for (const width of [1440, 320]) {
  test(`current icon paths retain geometry and accessible names at ${width}px`, async ({ page }, info) => {
    const theme = info.project.name === 'dark' ? 'dark' : 'light';
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript((value) => localStorage.setItem('uix-theme', value), theme);
    await page.goto('docs/explorer.html#examples-icons', { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const region = page.locator('[data-current-icon-paths]');
    await region.scrollIntoViewIfNeeded();
    for (const label of ['Tür öffnen', 'Ausweis', 'Zahlungskarte']) {
      const icon = region.getByRole('img', { name: label, exact: true });
      await expect(icon).toHaveCSS('width', '24px');
      await expect(icon).toHaveCSS('height', '24px');
    }
    await expect(region.locator('[data-current-glyph="door-open"] svg').first().locator('path').first()).toHaveAttribute('d', 'M10 21H2');
    await expect(region.locator('[data-current-glyph="id-card"] svg').first().locator('circle')).toHaveAttribute('cy', '12');
    await expect(region.locator('[data-current-glyph="id-card"] svg').first().locator('circle')).toHaveAttribute('r', '3');
    const decorative = region.locator('svg[aria-hidden="true"]');
    await expect(decorative).toHaveCount(3);
    for (const icon of await decorative.all()) {
      await expect(icon).toHaveCSS('width', '16px');
      await expect(icon).not.toHaveAttribute('aria-label');
    }
    expect(await region.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await region.screenshot({ path: info.outputPath(`glyphs-${theme}-${width}.png`) });
  });
}
