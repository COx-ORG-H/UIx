import { chromium } from 'playwright';
const b = await chromium.launch();
const run = async (label, steps) => {
  const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://localhost:4178/tests/rich-text/harness.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#field.ProseMirror');
  for (const s of steps) {
    if (s === 'clickp') await page.locator('#field p').first().click();
    else if (s === 'hint') await page.locator('#field-hint').click();
    else await page.keyboard.press(s);
  }
  await page.keyboard.press('Control+b');
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => ({ stored: document.querySelector('#field').editor.state.storedMarks?.map((m) => m.type.name) ?? null, active: document.activeElement?.id || document.activeElement?.getAttribute('data-tool') }));
  console.log(label.padEnd(28), JSON.stringify(r));
  await page.close();
};
await run('click+End', ['clickp', 'End']);
await run('hint Tab Tab click End', ['hint', 'Tab', 'Tab', 'clickp', 'End']);
await run('hint Tab End Tab click End', ['hint', 'Tab', 'End', 'Tab', 'clickp', 'End']);
await run('hint Tab ArrowRight Tab clk', ['hint', 'Tab', 'ArrowRight', 'Tab', 'clickp', 'End']);
await run('hint Tab Tab (no click)', ['hint', 'Tab', 'Tab']);
await b.close();
