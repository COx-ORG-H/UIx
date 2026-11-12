import { test, expect } from '@playwright/test';

/* The 4 px grid (HAR-2985, HAR-3092, HAR-3098). Every field with an icon uses one geometry: the icon
 * sits 12 px in (16 px at lg), is 20 px wide (24 px at lg), and the text starts 8 px after it, at
 * 40 px (48 px at lg), so fields stacked in a form line their text up; a trailing icon mirrors it.
 * A button's icon-to-label gap is 8 px at every size but xs (4 px). The sidebar favourites heading's
 * gap and the empty state's inset are 8 px. Each value is measured as rendered. */

const HARNESS = '/tests/field-grid/harness.html';
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

async function open(page, theme) {
  await page.addInitScript((t) => localStorage.setItem('uix-theme', t), theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
}

const GEOMETRY = {
  md: { inset: 12, icon: 20, text: 40 },
  lg: { inset: 16, icon: 24, text: 48 },
};

test('every field with a leading icon places the icon and the text the same way, at both sizes (HAR-3098)', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const fields = await page.evaluate(() => [...document.querySelectorAll('[data-field]')].map((box) => {
    const input = box.querySelector('input');
    const icon = box.querySelector('svg');
    const i = input.getBoundingClientRect();
    const g = icon.getBoundingClientRect();
    const s = getComputedStyle(input);
    return {
      name: box.dataset.field,
      leftInset: Math.round(g.left - i.left), rightInset: Math.round(i.right - g.right),
      icon: Math.round(g.width), padLeft: parseFloat(s.paddingLeft), padRight: parseFloat(s.paddingRight),
      iconMiddle: Math.round(g.top + g.height / 2 - (i.top + i.height / 2)),
    };
  }));
  expect(fields.map((f) => f.name)).toEqual(['group-md', 'suggest-md', 'bar-md', 'trailing-md', 'group-lg', 'suggest-lg', 'bar-lg', 'trailing-lg']);
  for (const f of fields) {
    const size = f.name.endsWith('-lg') ? 'lg' : 'md';
    const want = GEOMETRY[size];
    expect(f.icon, `${f.name} icon size`).toBe(want.icon);
    expect(Math.abs(f.iconMiddle), `${f.name} icon centred`).toBeLessThanOrEqual(1);
    if (f.name.startsWith('trailing')) {
      expect(f.rightInset, `${f.name} icon inset from the end`).toBe(want.inset);
      expect(f.padRight, `${f.name} text clears the icon`).toBe(want.text);
    } else {
      expect(f.leftInset, `${f.name} icon inset`).toBe(want.inset);
      expect(f.padLeft, `${f.name} text start`).toBe(want.text);
    }
  }
  // stacked, the leading fields of a size start their text at the same x
  const starts = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-field]:not([data-field^="trailing"])')].map((box) => {
    const input = box.querySelector('input');
    return [box.dataset.field, Math.round(input.getBoundingClientRect().left + parseFloat(getComputedStyle(input).paddingLeft))];
  })));
  expect(new Set([starts['group-md'], starts['suggest-md'], starts['bar-md']]).size).toBe(1);
  expect(new Set([starts['group-lg'], starts['suggest-lg'], starts['bar-lg']]).size).toBe(1);
  await testInfo.attach('fields', { body: await page.locator('section[aria-label="Felder"]').screenshot(), contentType: 'image/png' });
});

test('a button\'s icon-to-label gap is a spacing step: 8 px, 4 px on xs (HAR-2985)', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const gaps = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-button]')].map((b) => {
    const svg = b.querySelector('svg').getBoundingClientRect();
    const range = document.createRange();
    const text = [...b.querySelectorAll('*'), b].flatMap((n) => [...n.childNodes]).find((n) => n.nodeType === 3 && n.nodeValue.trim());
    range.selectNodeContents(text);
    const label = range.getBoundingClientRect();
    return [b.dataset.button, { measured: Math.round((label.left - svg.right) * 4) / 4, gap: getComputedStyle(b).columnGap }];
  })));
  for (const [size, { measured, gap }] of Object.entries(gaps)) {
    const want = size === 'xs' ? 4 : 8;
    expect(gap, `${size} column-gap`).toBe(`${want}px`);
    expect(measured, `${size} drawn gap`).toBe(want);
  }
  await testInfo.attach('buttons', { body: await page.locator('section[aria-label="Schaltflächen"]').screenshot(), contentType: 'image/png' });
});

test('the favourites heading gap and the empty state inset are 8 px (HAR-3092)', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const fav = await page.evaluate(() => {
    const heading = document.querySelector('.uix-favourites__heading');
    const empty = document.querySelector('.uix-favourites__empty');
    const e = getComputedStyle(empty);
    return { gap: getComputedStyle(heading).columnGap, empty: [e.paddingTop, e.paddingRight, e.paddingBottom, e.paddingLeft] };
  });
  expect(fav.gap).toBe('8px');
  expect(fav.empty).toEqual(['8px', '8px', '8px', '8px']);
  // nothing in the sidebar's kit classes is off the 4 px grid
  const offGrid = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('nav [class*="uix-"], nav [class*="uix-"] *')) {
      const s = getComputedStyle(el);
      for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'columnGap', 'rowGap']) {
        const v = parseFloat(s[p]);
        if (Number.isFinite(v) && v > 0 && v % 4 !== 0 && v !== 1 && v !== 2) bad.push(`${el.className} ${p} ${v}`);
      }
    }
    return bad;
  });
  expect(offGrid).toEqual([]);
  await testInfo.attach('favourites', { body: await page.locator('section[aria-label="Favoriten"]').screenshot(), contentType: 'image/png' });
});
