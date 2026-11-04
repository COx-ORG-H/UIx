import { chromium } from 'playwright';
const b = await chromium.launch();
for (const theme of ['light','dark']) {
const page = await b.newPage({ viewport: { width: 900, height: 700 }, colorScheme: theme });
await page.addInitScript((t) => localStorage.setItem('uix-theme', t), theme);
await page.goto('http://localhost:4178/tests/rich-text/harness.html', { waitUntil: 'networkidle' });
await page.waitForSelector('#note.ProseMirror');
await page.locator('#note').scrollIntoViewIfNeeded();
await page.locator('#note').click();
await page.keyboard.type('Rolled back :tad');
await page.waitForTimeout(400);
const box = await page.locator('#note').boundingBox();
await page.screenshot({ path: `.scratch/suggest-${theme}.png`, clip: { x: 0, y: Math.max(0, box.y - 40), width: 900, height: 360 } });
}
await b.close();
