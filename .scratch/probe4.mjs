import { chromium } from 'playwright';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
page.on('console', (m) => console.log('page:', m.text().slice(0, 300)));
await page.goto('http://localhost:4178/tests/rich-text/harness.html', { waitUntil: 'networkidle' });
await page.waitForSelector('#field.ProseMirror');
await page.evaluate(() => {
  const ed = document.querySelector('#field').editor;
  ed.on('transaction', ({ transaction: tr }) => console.log('tr', JSON.stringify({ steps: tr.steps.length, stored: tr.storedMarks?.map((m) => m.type.name) ?? null, storedSet: tr.storedMarksSet, sel: [tr.selection.from, tr.selection.to], meta: Object.keys(tr.meta ?? {}) })));
  document.addEventListener('keydown', (e) => console.log('keydown', e.key, e.ctrlKey, 'target', e.target.id || e.target.tagName, 'prevented', e.defaultPrevented), true);
});
await page.locator('#field p').first().click();
await page.keyboard.press('End');
console.log('--- ctrl+b');
await page.keyboard.press('Control+b');
await page.waitForTimeout(300);
console.log(await page.evaluate(() => { const ed = document.querySelector('#field').editor; return { sel: [ed.state.selection.from, ed.state.selection.to], stored: ed.state.storedMarks?.map((m) => m.type.name) ?? null, active: ed.isActive('bold'), pressed: document.querySelector('[data-tool=bold]').getAttribute('aria-pressed') }; }));
await b.close();
