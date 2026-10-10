/* Print-media snapshots of the scheduling components (HAR-1541, U7 AC1): the Month, the Week
 * time grid and the Timeline as a browser lays them out for paper (A4 at 96 dpi). Paper is
 * light in either theme, so the snapshots are taken once, in the light project. What the
 * snapshots cannot show (that nothing depends on a background) is asserted in
 * tests/a11y/scheduling-print.spec.mjs. */
import { test, expect } from '@playwright/test';

const CALENDAR = '../../tests/scheduling-calendar/harness.html';
const TIMELINE = '../../tests/scheduling-timeline/harness.html';
const PAGES = [
  { name: 'print-scheduling-month', harness: CALENDAR, query: 'case=encodings', root: '.uix-scheduling-calendar' },
  { name: 'print-scheduling-month-controlled', harness: CALENDAR, query: 'case=controlled&windows=3', root: '.uix-scheduling-calendar' },
  { name: 'print-scheduling-week', harness: CALENDAR, query: 'case=timegrid', root: '.uix-scheduling-calendar' },
  { name: 'print-scheduling-timeline', harness: TIMELINE, query: 'case=lanes', root: '.uix-scheduling-timeline' },
];

for (const pg of PAGES) {
  test(pg.name, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'light', 'paper is light: one snapshot');
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.goto(`${pg.harness}?${pg.query}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator(pg.root)).toHaveScreenshot(`${pg.name}.png`, { animations: 'disabled' });
  });
}
