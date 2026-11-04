import { chromium } from 'playwright';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
await page.addInitScript(() => localStorage.setItem('uix-theme', 'light'));
await page.goto('http://localhost:4178/tests/rich-text/harness.html', { waitUntil: 'networkidle' });
await page.waitForSelector('#field.ProseMirror');
// flow 1
await page.locator('#standalone-picker').click();
for (const t of [0, 100, 400, 1000]) {
  await page.waitForTimeout(t);
  console.log(t, await page.evaluate(() => {
    const d = document.querySelector('.uix-emoji-picker-popover:popover-open');
    return { open: !!d, headings: [...(d?.querySelectorAll('h3') ?? [])].slice(0, 3).map((h) => h.textContent), status: d?.querySelector('[role=status]')?.textContent, active: document.activeElement?.className };
  }));
}
await page.keyboard.press('Escape');
// flow 2
await page.locator('#field-hint').click();
await page.keyboard.press('Tab');
await page.keyboard.press('End');
await page.keyboard.press('Tab');
console.log('after tab', await page.evaluate(() => document.activeElement?.id));
await page.locator('#field p').first().click();
await page.keyboard.press('End');
await page.keyboard.press('Control+b');
await page.waitForTimeout(300);
console.log('bold', await page.locator('[data-tool="bold"]').first().getAttribute('aria-pressed'), await page.evaluate(() => ({ a: document.activeElement?.id, sel: getSelection()?.toString(), stored: document.querySelector('#field').editor.state.storedMarks?.map(m => m.type.name) })));
await b.close();
