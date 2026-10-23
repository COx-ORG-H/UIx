/* DataWorkspace (HAR-1388; UIx ADR-0005) in Chromium on a German incident list with a fake server
 * (tests/data-workspace/harness.tsx): Ctrl + / to the search, a filter chosen with the keyboard, a
 * refetch that keeps the rows (busy at once, the bar after 300 ms, no skeleton), selection kept
 * across pages and Shift-click ranges, the id cell, maximize and Escape, 320 px and axe. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/data-workspace/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#incidents tbody tr')).toHaveCount(10);
};
const ws = (page) => page.locator('#incidents');

test('Ctrl + / reaches the search; typing refetches with the rows kept: busy at once, the bar only after 300 ms', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('h1').click();
  await page.keyboard.press('Control+/');
  const search = ws(page).getByRole('searchbox', { name: 'Vorfälle durchsuchen' });
  await expect(search).toBeFocused();
  await search.fill('drucker'); // one change: the busy timing is measured from it
  const wrap = ws(page).locator('.uix-table-wrap');
  await expect(wrap).toHaveAttribute('aria-busy', 'true');
  const early = await page.evaluate(() => new Promise((resolve) => setTimeout(() => resolve({
    bar: document.querySelector('#incidents .uix-busy-bar')?.hasAttribute('data-shown') ?? false,
    rows: document.querySelectorAll('#incidents tbody tr').length,
    skeleton: document.querySelectorAll('#incidents .uix-skeleton').length,
  }), 120)));
  expect(early).toEqual({ bar: false, rows: 10, skeleton: 0 });
  await expect(ws(page).locator('.uix-busy-bar')).toHaveAttribute('data-shown', 'true');
  await expect(ws(page).locator('.uix-data-workspace__range')).toHaveText('1–10 von 14');
  await expect(wrap).not.toHaveAttribute('aria-busy', 'true');
  for (const row of await ws(page).locator('tbody tr').all()) await expect(row).toContainText(/drucker/i);
});

test('a filter with the keyboard: "+ Filter" menu, the editor, Enter applies, the chip and Save changes appear', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await ws(page).locator('button.uix-chip--add').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: 'Status' })).toBeFocused();
  await page.keyboard.press('Enter');
  const editor = page.locator('#incidents [popover]:popover-open .uix-filter-editor');
  await expect(editor).toBeVisible();
  await editor.getByRole('checkbox', { name: 'Gelöst' }).check();
  await editor.getByRole('checkbox', { name: 'Gelöst' }).press('Enter');
  await expect(editor).toHaveCount(0);
  await expect(ws(page).locator('.uix-data-workspace__chip')).toContainText('Status: Gelöst');
  await expect(ws(page).getByRole('button', { name: 'Änderungen speichern' })).toBeVisible();
  await expect(ws(page).locator('tbody tr').first()).toContainText('Gelöst');
  await expect(ws(page).locator('.uix-data-workspace__range')).toHaveText('1–10 von 15');
});

test('selection is kept by id across pages; Shift-click selects a range; the bulk bar counts it', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const boxes = ws(page).locator('tbody input[type="checkbox"]');
  await boxes.nth(1).click();
  await boxes.nth(3).click({ modifiers: ['Shift'] });
  await expect(ws(page).locator('.uix-bulkbar__count')).toHaveText('3 ausgewählt');
  await ws(page).getByRole('button', { name: '2', exact: true }).click();
  await expect(ws(page).locator('tbody tr').first()).toContainText('INC-20410');
  await expect(ws(page).locator('.uix-bulkbar__count')).toHaveText('3 ausgewählt');
  await ws(page).getByRole('button', { name: '1', exact: true }).click();
  await expect(ws(page).locator('tbody tr').first()).toContainText('INC-20400');
  await expect(ws(page).locator('tbody tr[data-selected]')).toHaveCount(3);
  await ws(page).locator('.uix-bulkbar').getByRole('button', { name: 'Mir zuweisen' }).click();
  expect(await page.evaluate(() => window.__ws.bulk)).toEqual(['assign:INC-20401,INC-20402,INC-20403']);
});

test('the id opens a peek; ↗ is a link to the record, named by the id', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await ws(page).getByRole('button', { name: 'INC-20400', exact: true }).click();
  expect(await page.evaluate(() => window.__ws.peeks)).toEqual(['INC-20400']);
  await expect(ws(page).getByRole('link', { name: 'INC-20400 öffnen' })).toHaveAttribute('href', '#/incidents/INC-20400');
});

test('maximize takes the window; Escape restores it', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const toggle = ws(page).getByRole('button', { name: 'Maximieren' });
  await toggle.click();
  const box = await ws(page).boundingBox();
  const vp = page.viewportSize();
  expect(Math.round(box.width)).toBe(vp.width);
  await page.keyboard.press('Escape');
  await expect(ws(page)).not.toHaveClass(/uix-data-workspace--maximized/);
});

test('Escape in the View popover closes it, not the maximized workspace (PR #168 review)', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await ws(page).getByRole('button', { name: 'Maximieren' }).click();
  await ws(page).getByRole('button', { name: 'Ansicht' }).click();
  await expect(ws(page).locator('.uix-view-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(ws(page).locator('.uix-view-menu')).toBeHidden();
  await expect(ws(page)).toHaveClass(/uix-data-workspace--maximized/);
  await page.keyboard.press('Escape');
  await expect(ws(page)).not.toHaveClass(/uix-data-workspace--maximized/);
});

test('with selection the checkbox and the id stay frozen with no gap; dividers only while the table overflows (PR #168 review)', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 390, height: 844 });
  const wrap = ws(page).locator('.uix-table-wrap');
  await expect(wrap).toHaveAttribute('data-overflow', 'true');
  await wrap.evaluate((el) => { el.scrollLeft = 200; });
  const cells = await ws(page).locator('tbody tr').first().evaluate((tr) => [...tr.children].slice(0, 2).map((td) => { const r = td.getBoundingClientRect(); return { left: r.left, right: r.right }; }));
  expect(Math.abs(cells[0].right - cells[1].left), 'the id starts where the checkbox column ends').toBeLessThan(1);
  await page.setViewportSize({ width: 1600, height: 900 });
  await expect(wrap).toHaveAttribute('data-overflow', 'false');
  expect(await ws(page).locator('tbody td.uix-id-cell').first().evaluate((td) => getComputedStyle(td).boxShadow)).toBe('none');
});

test('at 320 px the page never scrolls sideways (the table scrolls in its wrap); axe', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && !a.effect?.target?.closest?.('.uix-skeleton')).length)).toBe(0);
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});

// Operator review 2026-10-23 (the demo's "Prijave", dark, ~540 px, every row selected): the frozen
// id cells kept the zebra stripe on even rows while the rest of the row showed the selected tint.
// Every row state now sets --uix-row-bg on the row; frozen cells paint it over the surface.
const paintOf = (page, selector) => page.locator(selector).evaluate((cell) => {
  const parse = (value) => {
    const m = value.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [r, g, b, a];
  };
  const layers = [];
  for (let node = cell; node && layers.every((l) => l[3] < 1); node = node.parentElement) {
    const style = getComputedStyle(node);
    const image = style.backgroundImage.startsWith('linear-gradient') ? parse(style.backgroundImage) : null;
    if (image) layers.push(image);
    const colour = parse(style.backgroundColor);
    if (colour && colour[3] > 0) layers.push(colour);
  }
  let out = [255, 255, 255];
  for (const [r, g, b, a] of layers.reverse()) out = [r * a + out[0] * (1 - a), g * a + out[1] * (1 - a), b * a + out[2] * (1 - a)];
  return { rgb: out.map(Math.round), opaque: layers.length > 0 };
});

for (const width of [540, 1280]) {
  test(`at ${width} px, every row selected: the frozen checkbox, id and actions cells paint the row's state, on even and odd rows`, async ({ page }, testInfo) => {
    await open(page, testInfo, { width, height: 900 });
    await ws(page).locator('thead input[type="checkbox"]').check();
    await expect(ws(page).locator('.uix-bulkbar')).toBeVisible();
    await page.mouse.move(0, 0);
    const settled = () => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished.catch(() => {}))));
    await settled(); // the row eases to its new state; compare where it lands
    for (const row of [1, 2]) { // :nth-child(1) is odd, (2) even (zebra)
      const cell = (n) => `#incidents tbody tr:nth-child(${row}) > td:nth-child(${n})`;
      const plain = await paintOf(page, cell(3));
      for (const [name, selector] of [['checkbox', cell(1)], ['id', cell(2)], ['actions', `#incidents tbody tr:nth-child(${row}) > td:last-child`]]) {
        const frozen = await paintOf(page, selector);
        const pinned = await page.locator(selector).evaluate((el) => getComputedStyle(el).position);
        expect(pinned, `${name} is frozen`).toBe('sticky');
        frozen.rgb.forEach((v, i) => expect(Math.abs(v - plain.rgb[i]), `row ${row} ${name}: ${frozen.rgb} vs ${plain.rgb}`).toBeLessThanOrEqual(2));
      }
    }
    // hover is a row state too (on a device that can hover)
    await ws(page).locator('tbody tr:nth-child(2) > td:nth-child(3)').hover();
    await settled();
    const hovered = await paintOf(page, '#incidents tbody tr:nth-child(2) > td:nth-child(3)');
    const hoveredId = await paintOf(page, '#incidents tbody tr:nth-child(2) > td:nth-child(2)');
    hoveredId.rgb.forEach((v, i) => expect(Math.abs(v - hovered.rgb[i])).toBeLessThanOrEqual(2));
  });
}

for (const width of [320, 390]) {
  test(`at ${width} px the bulk bar shows its count and every action inside the screen`, async ({ page }, testInfo) => {
    await open(page, testInfo, { width, height: 800 });
    await ws(page).locator('thead input[type="checkbox"]').check();
    const bar = ws(page).getByRole('toolbar', { name: 'Aktionen für die Auswahl' });
    await expect(bar).toBeVisible();
    const boxes = await bar.evaluate((el) => {
      const r = (node) => node.getBoundingClientRect();
      const b = r(el);
      return {
        bar: { left: b.left, right: b.right, top: b.top, bottom: b.bottom },
        parts: [...el.querySelectorAll('.uix-bulkbar__count, button')].map((node) => ({ text: node.textContent, ...JSON.parse(JSON.stringify(r(node))) })),
        vw: document.documentElement.clientWidth,
      };
    });
    expect(boxes.parts.map((p) => p.text)).toEqual(expect.arrayContaining(['10 ausgewählt', 'Mir zuweisen', 'Mehr']));
    for (const part of boxes.parts) {
      expect(part.width, `${part.text} is drawn`).toBeGreaterThan(0);
      expect(part.left, `${part.text} inside the bar`).toBeGreaterThanOrEqual(boxes.bar.left);
      expect(part.right, `${part.text} inside the bar`).toBeLessThanOrEqual(boxes.bar.right + 0.5);
      expect(part.right, `${part.text} on screen`).toBeLessThanOrEqual(boxes.vw);
      expect(part.height, `${part.text} on one line`).toBeLessThan(part.text.includes('ausgewählt') ? 24 : 48);
    }
    await expect(bar.getByRole('button', { name: 'Mehr' })).toBeInViewport();
  });
}
