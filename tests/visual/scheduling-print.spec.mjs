/* Print-media snapshots of the scheduling components (HAR-1541, U7 AC1): the Month, the Week
 * time grid and the Timeline as a browser lays them out for paper (A4 at 96 dpi). Paper is
 * light in either theme, so the snapshots are taken once, in the light project. What the
 * snapshots cannot show (that nothing depends on a background) is asserted in
 * tests/a11y/scheduling-print.spec.mjs. */
import { test, expect } from '@playwright/test';

const HARNESS = '../../tests/scheduling-calendar/harness.html';
const PAGES = [
  { name: 'print-scheduling-month', query: 'case=encodings' },
  { name: 'print-scheduling-month-controlled', query: 'case=controlled&windows=3' },
  { name: 'print-scheduling-week', query: 'case=timegrid' },
];

for (const pg of PAGES) {
  test(pg.name, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'light', 'paper is light: one snapshot');
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.goto(`${HARNESS}?${pg.query}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.uix-scheduling-calendar')).toHaveScreenshot(`${pg.name}.png`, { animations: 'disabled' });
  });
}
