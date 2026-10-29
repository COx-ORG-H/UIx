/* HAR-2708: Radio, Checkbox and Switch hide their real <input> with `position: absolute`. Without a
 * positioned label its containing block is the nearest positioned ancestor, which in an AppShell
 * sits outside the scrolling main area, so after a scroll the input stays where it was and a click
 * or a focus scroll lands on whatever is there. The input must stay inside its own label at any
 * scroll position of any ancestor scroller. */
import { test, expect } from '@playwright/test';

const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/packages/tokens/build/css/styles.css"></head>
<body style="margin:0">
  <div style="position:relative; height:400px">
    <main id="scroller" style="overflow:auto; height:400px">
      <div style="height:900px"></div>
      <label class="uix-radio" id="radio"><input type="radio" name="r"><span class="uix-radio__dot"></span>Radio</label>
      <label class="uix-checkbox" id="checkbox"><input type="checkbox"><span class="uix-checkbox__box"></span>Checkbox</label>
      <label class="uix-switch" id="switch"><input type="checkbox" role="switch"><span class="uix-switch__track"></span>Switch</label>
      <div style="height:900px"></div>
    </main>
  </div>
</body></html>`;

test('HAR-2708: a scrolled Radio, Checkbox and Switch keep their hidden input inside their label', async ({ page }) => {
  await page.goto('/packages/tokens/docs/index.html');
  await page.setContent(PAGE, { waitUntil: 'load' });
  for (const scroll of [0, 700, 1200]) {
    await page.locator('#scroller').evaluate((el, top) => { el.scrollTop = top; }, scroll);
    for (const id of ['radio', 'checkbox', 'switch']) {
      const { label, input } = await page.locator(`#${id}`).evaluate((el) => {
        const box = (r) => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
        return { label: box(el.getBoundingClientRect()), input: box(el.querySelector('input').getBoundingClientRect()) };
      });
      const inside = input.top >= label.top - 0.5 && input.bottom <= label.bottom + 0.5 && input.left >= label.left - 0.5 && input.right <= label.right + 0.5;
      expect(inside, `${id} at scrollTop ${scroll}: input ${JSON.stringify(input)} outside label ${JSON.stringify(label)}`).toBe(true);
    }
  }
});
