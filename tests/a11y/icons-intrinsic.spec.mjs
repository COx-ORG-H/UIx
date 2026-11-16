import { test, expect } from '@playwright/test';
for (const width of [1440, 320]) test(`intrinsic icons preserve the consumer SVG cascade and accessibility at ${width}px`, async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tests/icons-intrinsic/harness.html');
  await page.locator('html').evaluate((element, theme) => { element.dataset.theme = theme; }, info.project.name.includes('dark') ? 'dark' : 'light');
  await expect(page.locator('html')).toHaveAttribute('data-forwarded-ref', 'true');
  for (const section of await page.locator('[data-case]').all()) {
    const reference = section.locator('[data-reference] svg');
    const candidate = section.locator('[data-candidate] svg');
    for (const property of ['width', 'height', 'stroke-width', 'fill', 'stroke']) {
      await expect(candidate).toHaveCSS(property, await reference.evaluate((element, property) => getComputedStyle(element).getPropertyValue(property), property));
    }
    for (const attribute of ['aria-label', 'aria-hidden', 'aria-labelledby', 'width', 'height']) expect(await candidate.getAttribute(attribute), `${await section.getAttribute('data-case')}: ${attribute}`).toBe(await reference.getAttribute(attribute));
  }
  await expect(page.locator('[data-case="default"] [data-candidate] svg')).toHaveCSS('width', '24px');
  await expect(page.locator('[data-case="small"] [data-candidate] svg')).toHaveCSS('width', '14px');
  await expect(page.locator('[data-case="button"] [data-candidate] svg')).toHaveCSS('width', '20px');
  await expect(page.locator('[data-case="label"] [data-candidate]').getByLabel('Schließen')).toBeVisible();
  await expect(page.locator('[data-case="title"] [data-candidate] title')).toHaveText('Schließen');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.locator('main').screenshot({ path: info.outputPath(`intrinsic-${width}.png`) });
});
