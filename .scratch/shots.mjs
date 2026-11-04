import { chromium } from 'playwright';
const b = await chromium.launch();
for (const theme of ['light', 'dark']) {
  const page = await b.newPage({ viewport: { width: 900, height: 900 }, colorScheme: theme });
  await page.addInitScript((t) => localStorage.setItem('uix-theme', t), theme);
  await page.goto('http://localhost:4178/tests/rich-text/harness.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#field.ProseMirror');
  await page.locator('#field p').first().click();
  await page.locator('main section').first().screenshot({ path: `.scratch/field-${theme}.png` });
  await page.locator('#note').click();
  await page.keyboard.type('Rolled back :tad');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `.scratch/note-${theme}.png`, clip: { x: 0, y: 380, width: 900, height: 420 } });
  await page.keyboard.press('Escape');
  await page.locator('.uix-reaction-add').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `.scratch/picker-${theme}.png` });
  await page.keyboard.press('Escape');
  await page.locator('article[data-fixture="aligned table"]').scrollIntoViewIfNeeded();
  await page.locator('main section').nth(4).screenshot({ path: `.scratch/viewer-${theme}.png` });
  await page.close();
}
await b.close();
