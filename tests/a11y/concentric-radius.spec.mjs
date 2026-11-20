/* Concentric corners (experiment): a surface nested in a rounded container draws the container's
 * corner minus the gap between them (--uix-radius-inner), never below 0, and a pill stays a pill.
 * Pins the computed radius of every converted nesting, the fallback outside a container, the
 * clamp, the floor and a container retheme. Light and dark projects both run it; radius is
 * theme-independent, so they must agree. */
import { test, expect } from '@playwright/test';

const icon = '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="3"/></svg>';
const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/packages/tokens/build/css/styles.css"></head>
<body style="margin:0;padding:24px">
  <div class="uix-segmented" id="seg" role="group" aria-label="a"><button class="uix-segmented__option" type="button" aria-pressed="true">A</button><button class="uix-segmented__option" type="button" aria-pressed="false">B</button></div>
  <div class="uix-segmented" id="seg-pill" role="group" aria-label="b" style="--uix-radius-outer: var(--uix-radius-pill)"><button class="uix-segmented__option" type="button" aria-pressed="true">A</button></div>
  <div class="uix-tabs uix-tabs--pill" id="tabs" role="tablist"><button class="uix-tab" role="tab" type="button" aria-selected="true">A</button></div>
  <div class="uix-menu" id="menu" role="menu" style="position:static;display:block"><button class="uix-menu__item" role="menuitem" type="button">A</button></div>
  <div id="loose-item"><button class="uix-menu__item" type="button">outside a menu</button></div>
  <ul class="uix-listbox" id="listbox" role="listbox" aria-label="c"><li class="uix-listbox__option" role="option" aria-selected="false">A</li></ul>
  <div class="uix-select__popup" id="select-popup" style="position:static"><ul class="uix-listbox" role="listbox" aria-label="d"><li class="uix-listbox__option" role="option" aria-selected="false">A</li></ul></div>
  <div class="uix-rich-text__suggest" id="suggest" role="listbox" aria-label="e" style="position:static"><div class="uix-rich-text__suggest-item" role="option" aria-selected="true">A</div></div>
  <div class="uix-taginput" id="taginput"><span class="uix-tag">A</span><input class="uix-taginput__field" aria-label="f"></div>
  <div id="loose-tag"><span class="uix-tag">on its own</span></div>
  ${['sm', 'md', 'lg'].map((s) => `<div class="uix-input-group uix-input-group--has-action" id="action-${s}"><input class="uix-input${s === 'md' ? '' : ` uix-input--${s}`}" aria-label="g"><button class="uix-input-group__action" type="button" aria-label="h">${icon}</button></div>`).join('')}
  <div id="clamp" style="--uix-radius-outer: 6px; --uix-radius-inset: 10px"><span style="border-radius: var(--uix-radius-inner)">x</span></div>
  <div id="floor" style="--uix-radius-outer: 6px; --uix-radius-inset: 10px"><span style="--uix-radius-inner-min: var(--uix-radius-xs); border-radius: var(--uix-radius-inner)">x</span></div>
</body></html>`;

const radius = (page, sel) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius);

test('every converted nesting draws outer radius minus inset', async ({ page }) => {
  await page.goto('/packages/tokens/docs/index.html');
  await page.setContent(PAGE, { waitUntil: 'load' });
  const expected = {
    // 12 px corner, 1 px border + 4 px padding
    '#seg .uix-segmented__option': '7px',
    '#menu .uix-menu__item': '7px',
    '#listbox .uix-listbox__option': '7px',
    '#select-popup .uix-listbox__option': '7px',
    '#suggest .uix-rich-text__suggest-item': '7px',
    '#taginput .uix-tag': '7px',
    // 12 px corner, 4 px padding, no border
    '#tabs .uix-tab': '8px',
    // 12 px field corner, the button 4 px in at md and lg, 2 px at sm
    '#action-md .uix-input-group__action': '8px',
    '#action-lg .uix-input-group__action': '8px',
    '#action-sm .uix-input-group__action': '10px',
  };
  for (const [sel, value] of Object.entries(expected)) expect(await radius(page, sel), sel).toBe(value);
  for (const sel of ['#seg', '#menu', '#listbox', '#select-popup', '#suggest', '#taginput', '#tabs']) {
    expect(await radius(page, sel), `${sel} keeps the md corner`).toBe('12px');
  }
  // the flat listbox inside the Select popup draws no corner of its own
  expect(await radius(page, '#select-popup .uix-listbox')).toBe('0px');
});

test('outside a container a reader falls back; a scoped reader keeps its own radius', async ({ page }) => {
  await page.goto('/packages/tokens/docs/index.html');
  await page.setContent(PAGE, { waitUntil: 'load' });
  expect(await radius(page, '#loose-item .uix-menu__item'), 'a menu row outside a menu (TableControls)').toBe('8px');
  expect(await radius(page, '#loose-tag .uix-tag'), 'a chip outside a tag field').toBe('8px');
});

test('never below 0, an optional floor, and a pill container keeps pill segments', async ({ page }) => {
  await page.goto('/packages/tokens/docs/index.html');
  await page.setContent(PAGE, { waitUntil: 'load' });
  expect(await radius(page, '#clamp > span'), 'inset larger than the corner clamps to 0').toBe('0px');
  expect(await radius(page, '#floor > span'), '--uix-radius-inner-min holds a floor').toBe('4px');
  expect(await radius(page, '#seg-pill'), 'the container retheme lands on its own corner').toBe('999px');
  const option = await page.locator('#seg-pill .uix-segmented__option').evaluate((el) => ({ r: parseFloat(getComputedStyle(el).borderTopLeftRadius), h: el.getBoundingClientRect().height }));
  expect(option.r, 'a pill segment is still a pill').toBeGreaterThanOrEqual(option.h / 2);
});
