import { chromium } from 'playwright';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 360, height: 780 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.type(), m.text().slice(0, 200)); });
await page.goto('http://localhost:4178/tests/rich-text/harness.html', { waitUntil: 'networkidle' });
await page.waitForSelector('#field.ProseMirror');
console.log(await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth + 1) out.push(`${el.tagName}.${el.className} right=${Math.round(r.right)}`);
  }
  return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, over: out.slice(0, 12) };
}));
await page.screenshot({ path: '.scratch/narrow.png', fullPage: false });
await page.setViewportSize({ width: 1100, height: 900 });
await page.locator('#field p').first().click();
await page.keyboard.press('End');
await page.keyboard.press('Control+b');
await page.waitForTimeout(200);
console.log('bold pressed', await page.locator('[data-tool="bold"]').first().getAttribute('aria-pressed'), 'focus', await page.evaluate(() => document.activeElement?.id || document.activeElement?.className));
await page.keyboard.type('loud');
await page.waitForTimeout(200);
console.log(await page.evaluate(() => window.__rte.changes.field?.at(-1)));
await page.screenshot({ path: '.scratch/wide.png' });
await b.close();
