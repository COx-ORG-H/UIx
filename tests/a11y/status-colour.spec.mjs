/* The status colour policy page (HAR-1564, explorer.html#status-colour), light and dark:
 *   - the rules, the mapping matrix and both queues render; the page is axe-clean;
 *   - in the do-queue the only filled hue is the SEV-1 pill, and the rows' dots carry the colour;
 *   - at 320 px the page does not scroll sideways (the queues scroll inside their own region);
 *   - the policy is one click away from Status pill, Alert, Stat tile, SchedulingCalendar and
 *     SchedulingTimeline. Markup rules are pinned in packages/tokens/docs/docs.test.js. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function open(page, theme, hash = 'status-colour') {
  await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* private */ } }, theme);
  await page.goto(`docs/explorer.html#${hash}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.evaluate(() => document.fonts.ready);
}

test('the page: rules, matrix, both queues, axe-clean', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name);
  await expect(page.getByRole('heading', { level: 1, name: 'Status colour' })).toBeVisible();
  await expect(page.locator('[data-status-rules] > li')).toHaveCount(10);
  await expect(page.locator('[data-status-matrix] tbody tr')).toHaveCount(10);
  await expect(page.getByRole('region', { name: 'Queue with colour as the state' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Queue with the policy' })).toBeVisible();
  const fills = await page.locator('[data-status-queue="do"] .uix-pill').evaluateAll((pills) => pills
    .filter((p) => getComputedStyle(p).backgroundColor !== 'rgba(0, 0, 0, 0)')
    .map((p) => p.textContent.trim()));
  expect(fills).toEqual(['SEV-1']);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
});

test('at 320 px nothing scrolls sideways but the queues themselves', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await open(page, testInfo.project.name);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

for (const slug of ['status-pill', 'alert', 'stat-tile', 'scheduling-calendar', 'scheduling-timeline']) {
  test(`#${slug} links to the policy`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'light', 'a link is the same in both themes');
    await open(page, 'light', slug);
    const link = page.locator('.uix-docs__page a[href="#status-colour"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page.getByRole('heading', { level: 1, name: 'Status colour' })).toBeVisible();
  });
}
