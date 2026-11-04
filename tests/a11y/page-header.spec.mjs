/* HAR-2823: measure the heading, not only the page. A clipped ancestor can hide
 * a 990 px title inside a 288 px column while document.scrollWidth still passes. */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name === 'dark' ? 'dark' : 'light';
  await page.addInitScript(value => localStorage.setItem('uix-theme', value), theme);
  await page.goto('/tests/page-header/harness.html', { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#display-help')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
});

async function assertTitlesFit(page) {
  const samples = await page.locator('.uix-page-header__title').evaluateAll(titles => titles.map(title => {
    const box = title.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(title);
    const rects = [...range.getClientRects()];
    const lines = new Set(rects.filter(rect => rect.width > 0).map(rect => Math.round(rect.top))).size;
    return {
      id: title.closest('header').id, text: title.textContent,
      width: title.clientWidth, scrollWidth: title.scrollWidth,
      outside: rects.filter(rect => rect.left < box.left - 1 || rect.right > box.right + 1).length,
      charsPerLine: title.textContent.trim().length / Math.max(1, lines),
    };
  }));
  expect(samples).toHaveLength(5);
  for (const sample of samples) {
    expect(sample.scrollWidth, `${sample.id}: title is not silently clipped`).toBeLessThanOrEqual(sample.width + 1);
    expect(sample.outside, `${sample.id}: every rendered text fragment fits`).toBe(0);
    if (sample.id !== 'short') {
      expect(sample.charsPerLine, `${sample.id}: readable lines, not one letter per line`).toBeGreaterThanOrEqual(12);
    }
  }
  const widths = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
}

for (const width of [320, 1280]) {
  test(`long nested titles fit at ${width}px, with help/actions and both size presets`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await assertTitlesFit(page);
  });
}

test('short titles remain on one line at their natural width', async ({ page }) => {
  const title = page.locator('#short .uix-page-header__title');
  const metric = await title.evaluate(el => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return { lines: range.getClientRects().length, height: el.getBoundingClientRect().height, fontSize: parseFloat(getComputedStyle(el).fontSize) };
  });
  expect(metric.lines).toBe(1);
  expect(metric.height).toBeLessThan(metric.fontSize * 2);
});

test('help and actions stay operable after narrow reflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 950 });
  const help = page.locator('#default-help').getByRole('button', { name: 'Hilfe zum CI' });
  await help.focus();
  const panel = page.locator(`[id="${await help.getAttribute('aria-describedby')}"]`);
  await expect(panel).toBeVisible();
  await expect(panel).toHaveText('Das archivierte CI bleibt bis zur Wiederherstellung unverändert.');
  await page.keyboard.press('Escape');
  await expect(help).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('#default-help').getByRole('button', { name: 'Wiederherstellen' }).click();
  await expect(page.getByRole('status')).toHaveText('CI wiederhergestellt.');
});

test('enlarged text and reduced motion preserve readable titles', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 950 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await assertTitlesFit(page);
});
