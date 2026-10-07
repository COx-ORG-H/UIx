/* Select (HAR-1572) in a real browser: the APG select-only combobox keyboard model, focus,
 * the form proxy (submit, reset, required), react-hook-form, placement (never clipped inside a
 * Drawer, a Popover or an overflow:hidden cell; flips near the bottom), the phone bottom sheet,
 * async states, and axe in every state. jsdom has no layout or top layer, so this is where
 * geometry and focus are measured. Harness: tests/select/harness.tsx (bundled in globalSetup).
 *
 * Runs in the light/dark Chromium projects, and in Chromium, Firefox and WebKit with
 * UIX_CROSS_BROWSER=1 (see playwright.config.mjs).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleAnimations } from './settle.mjs';

const HARNESS = '/tests/select/harness.html';
const themeOf = (name) => (name === 'dark' ? 'dark' : 'light');

test.beforeEach(async ({ page }, testInfo) => {
  const theme = themeOf(testInfo.project.name);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#status')).toBeVisible();
});

/** The label of the option aria-activedescendant points at. */
const active = (page, id) => page.evaluate((triggerId) => {
  const t = document.getElementById(triggerId);
  const owner = t.getAttribute('aria-activedescendant') ? t : document.querySelector(`#${CSS.escape(t.getAttribute('aria-controls'))}`)?.closest('[data-uix-select-popup]')?.querySelector('input[role="combobox"]');
  const ref = owner?.getAttribute('aria-activedescendant');
  return ref ? document.getElementById(ref)?.querySelector('.uix-listbox__label')?.textContent ?? null : null;
}, id);
const expanded = (page, id) => page.locator(`#${id}`).getAttribute('aria-expanded');
const focusedId = (page) => page.evaluate(() => document.activeElement?.id ?? null);
const popupOf = (page, id) => page.locator(`#${id} ~ [data-uix-select-popup]`).first();

test('APG keys: open, skip disabled, Home/End/PageDown, typeahead ("s" twice cycles, "re" keeps), Escape restores value and focus', async ({ page }) => {
  await page.locator('#status').focus();
  await page.keyboard.press('ArrowDown');
  expect(await expanded(page, 'status')).toBe('true');
  expect(await active(page, 'status')).toBe('Open');
  await page.keyboard.press('ArrowDown');
  expect(await active(page, 'status')).toBe('In progress'); // Blocked is disabled
  await page.keyboard.press('ArrowDown');
  expect(await active(page, 'status')).toBe('Reopened'); // the disabled "Archived" group is skipped
  await page.keyboard.press('Home');
  expect(await active(page, 'status')).toBe('New');
  await page.keyboard.press('End');
  expect(await active(page, 'status')).toBe('Spam');
  await page.keyboard.press('PageUp');
  expect(await active(page, 'status')).toBe('New');
  await page.keyboard.press('PageDown');
  expect(await active(page, 'status')).toBe('Spam');
  await page.keyboard.press('Home');
  await page.keyboard.press('s');
  expect(await active(page, 'status')).toBe('Solved');
  await page.keyboard.press('s');
  expect(await active(page, 'status')).toBe('Spam');
  await page.keyboard.press('Escape');
  expect(await expanded(page, 'status')).toBe('false');
  await expect(page.locator('#status')).toHaveText('Open');
  expect(await focusedId(page)).toBe('status');
  await page.waitForTimeout(600); // let the typeahead buffer lapse
  await page.keyboard.type('re');
  expect(await expanded(page, 'status')).toBe('true');
  expect(await active(page, 'status')).toBe('Reopened');
  await page.keyboard.type('s');
  expect(await active(page, 'status')).toBe('Resolved');
  await page.keyboard.press('Enter');
  expect(await expanded(page, 'status')).toBe('false');
  await expect(page.locator('#status')).toHaveText('Resolved');
  expect(await focusedId(page)).toBe('status');
});

test('Space and Alt+ArrowDown open; Alt+ArrowUp selects and closes; Tab selects and moves on', async ({ page }) => {
  await page.locator('#status').focus();
  await page.keyboard.press('Alt+ArrowDown');
  expect(await expanded(page, 'status')).toBe('true');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Alt+ArrowUp');
  expect(await expanded(page, 'status')).toBe('false');
  await expect(page.locator('#status')).toHaveText('In progress');
  await page.keyboard.press(' ');
  expect(await expanded(page, 'status')).toBe('true');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Tab');
  expect(await expanded(page, 'status')).toBe('false');
  await expect(page.locator('#status')).toHaveText('Open');
  expect(await focusedId(page)).toBe('queue');
});

test('mouse: hover and the selected option look different; a click selects; a press outside closes', async ({ page }) => {
  await page.locator('#status').click();
  const popup = popupOf(page, 'status');
  await expect(popup).toBeVisible();
  const selected = popup.locator('[role="option"][aria-selected="true"]');
  await expect(selected).toHaveText('Open');
  const hovered = popup.locator('[role="option"]', { hasText: 'Resolved' });
  await hovered.hover();
  await expect(hovered).toHaveAttribute('data-active', 'true');
  const look = (loc) => loc.evaluate((el) => { const s = getComputedStyle(el); return `${s.backgroundColor}|${s.color}|${s.fontWeight}`; });
  expect(await look(hovered)).not.toBe(await look(selected));
  await hovered.click();
  await expect(popup).toBeHidden();
  await expect(page.locator('#status')).toHaveText('Resolved');
  await page.locator('#status').click();
  await expect(popup).toBeVisible();
  await page.mouse.click(900, 20);
  await expect(popup).toBeHidden();
});

test('form: posts the value, required blocks submit and focuses the trigger, reset restores the default', async ({ page }) => {
  await page.locator('#submit').click();
  await expect.poll(() => focusedId(page)).toBe('queue');
  await expect(page.locator('#queue')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#queue')).toHaveAttribute('data-invalid', 'true');
  expect(await page.evaluate(() => window.__posted.form ?? null)).toBeNull();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('#queue')).toHaveText('Queue 02');
  await expect(page.locator('#queue')).not.toHaveAttribute('aria-invalid', 'true');
  await page.locator('#status').click();
  await popupOf(page, 'status').locator('[role="option"]', { hasText: 'Spam' }).click();
  await page.locator('#submit').click();
  await expect.poll(() => page.evaluate(() => window.__posted.form)).toEqual(['status=spam', 'queue=q2']);
  await page.locator('#reset').click();
  await expect(page.locator('#status')).toHaveText('Open');
  await expect(page.locator('#queue')).toHaveText('Pick a queue');
});

test('multiple: every value posts, Space toggles, "+N" has an accessible count', async ({ page }) => {
  const t = page.locator('#labels');
  await expect(t.locator('.uix-select__more [aria-hidden="true"]')).toHaveText('+1');
  await expect(t.locator('.uix-select__more .uix-visually-hidden')).toHaveText(', 2 selected');
  await t.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' ');
  expect(await expanded(page, 'labels')).toBe('true');
  await page.keyboard.press('Tab');
  expect(await expanded(page, 'labels')).toBe('false');
  await page.locator('#submit-multi').click();
  await expect.poll(() => page.evaluate(() => window.__posted.multi)).toEqual(['labels=network', 'labels=hardware', 'labels=access']);
  await expect(t.locator('.uix-select__more .uix-visually-hidden')).toHaveText(', 3 selected');
});

test('a wrapping <label>: a click on an option selects once, the label text toggles the list', async ({ page }) => {
  await page.getByText('Priority', { exact: true }).click();
  const popup = popupOf(page, 'priority');
  await expect(popup).toBeVisible();
  await popup.locator('[role="option"]', { hasText: 'P3' }).click();
  await expect(popup).toBeHidden();
  await expect(page.locator('#priority')).toHaveText('P3 · Normal');
  expect(await focusedId(page)).toBe('priority');
});

test('long labels end in an ellipsis on the trigger', async ({ page }) => {
  const m = await page.locator('#s-long .uix-select__text').evaluate((el) => ({ over: el.scrollWidth > el.clientWidth, ellipsis: getComputedStyle(el).textOverflow }));
  expect(m).toEqual({ over: true, ellipsis: 'ellipsis' });
});

/** The list is fully on screen and its options are hit-testable (not clipped by an ancestor). */
const assertUnclipped = async (page, id) => {
  const popup = popupOf(page, id);
  await expect(popup).toBeVisible();
  await settleAnimations(page);
  const m = await page.evaluate((triggerId) => {
    const t = document.getElementById(triggerId);
    const p = document.getElementById(t.getAttribute('aria-controls')).closest('[data-uix-select-popup]');
    const tr = t.getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    const opts = [...p.querySelectorAll('[role="option"]')].slice(0, 3);
    const hits = opts.map((o) => { const r = o.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!at && o.contains(at); });
    return {
      inViewport: pr.top >= 0 && pr.left >= 0 && pr.bottom <= innerHeight && pr.right <= innerWidth,
      widthAtLeastTrigger: pr.width >= tr.width - 0.5,
      maxHeight: pr.height <= 320.5,
      hits,
      below: pr.top >= tr.bottom,
      above: pr.bottom <= tr.top,
      topLayer: p.matches(':popover-open'),
      gap: Math.round(pr.top >= tr.bottom ? pr.top - tr.bottom : tr.top - pr.bottom),
    };
  }, id);
  expect(m.topLayer).toBe(true);
  expect(m.inViewport).toBe(true);
  expect(m.widthAtLeastTrigger).toBe(true);
  expect(m.maxHeight).toBe(true);
  expect(m.hits).toEqual([true, true, true]);
  expect(m.gap).toBeLessThanOrEqual(8);
  return m;
};

test('placement: not clipped inside a modal Drawer; Escape closes the list, not the drawer', async ({ page }) => {
  await page.locator('#open-drawer').click();
  await expect(page.locator('dialog#drawer')).toHaveJSProperty('open', true);
  await page.locator('#in-drawer').click();
  await assertUnclipped(page, 'in-drawer');
  await page.keyboard.press('Escape');
  await expect(popupOf(page, 'in-drawer')).toBeHidden();
  await expect(page.locator('dialog#drawer')).toHaveJSProperty('open', true);
  expect(await focusedId(page)).toBe('in-drawer');
  await page.locator('#in-drawer').click();
  await popupOf(page, 'in-drawer').locator('[role="option"]', { hasText: 'Resolved' }).click();
  await expect(page.locator('#in-drawer')).toHaveText('Resolved');
  await expect(page.locator('dialog#drawer')).toHaveJSProperty('open', true);
});

test('placement: not clipped inside a Popover with overflow:hidden; choosing keeps the popover open', async ({ page }) => {
  await page.locator('#open-popover').click();
  await expect(page.locator('#filter-pop')).toBeVisible();
  await page.locator('#in-popover').click();
  await assertUnclipped(page, 'in-popover');
  await popupOf(page, 'in-popover').locator('[role="option"]', { hasText: 'Spam' }).click();
  await expect(page.locator('#in-popover')).toHaveText('Spam');
  await expect(page.locator('#filter-pop')).toBeVisible();
  await page.locator('#in-popover').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(popupOf(page, 'in-popover')).toBeHidden();
  await expect(page.locator('#filter-pop')).toBeVisible();
});

test('placement: not clipped inside an overflow:hidden table cell', async ({ page }) => {
  await page.locator('#in-cell').scrollIntoViewIfNeeded();
  await page.locator('#in-cell').click();
  await assertUnclipped(page, 'in-cell');
});

test('placement: flips above the trigger near the bottom of the viewport', async ({ page }) => {
  await page.locator('#near-bottom').click();
  const m = await assertUnclipped(page, 'near-bottom');
  expect(m.above).toBe(true);
  await page.keyboard.press('Escape');
  await page.locator('#status').click();
  const n = await assertUnclipped(page, 'status');
  expect(n.below).toBe(true);
});

test('searchable: the filter field takes focus, narrows the list, Enter chooses, Escape returns focus', async ({ page }) => {
  await page.locator('#s-search').click();
  const input = popupOf(page, 's-search').locator('input[role="combobox"]');
  await expect(input).toBeFocused();
  await page.keyboard.type('queue 1');
  await expect(popupOf(page, 's-search').locator('[role="option"]')).toHaveCount(10);
  await expect(popupOf(page, 's-search').locator('[aria-live="polite"]')).toHaveText('10 options');
  expect(await active(page, 's-search')).toBe('Queue 10'); // the first match is active
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('#s-search')).toHaveText('Queue 11');
  expect(await focusedId(page)).toBe('s-search');
  await page.keyboard.press('Enter');
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  expect(await focusedId(page)).toBe('s-search');
});

test('async: loading, options, a stale request is aborted, error with retry, empty', async ({ page }) => {
  await page.locator('#owner').click();
  const popup = popupOf(page, 'owner');
  await expect(popup.locator('.uix-select__state')).toHaveText(/Loading/);
  await expect(popup.locator('[role="option"]')).toHaveCount(3);
  await page.keyboard.type('a');
  await expect.poll(() => page.evaluate(() => window.__async.calls.at(-1))).toBe('a');
  await page.keyboard.type('d'); // the request for "a" is still in flight
  await expect(popup.locator('[role="option"]')).toHaveText(['Ada Lovelace']);
  expect(await page.evaluate(() => window.__async.aborted)).toContain('a');
  await page.evaluate(() => { window.__async.mode = 'fail'; });
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await expect(popup.locator('.uix-select__state')).toContainText('Could not load');
  await expect(popup.locator('.uix-select__state')).toHaveAttribute('role', 'alert');
  await page.evaluate(() => { window.__async.mode = 'ok'; });
  await page.keyboard.press('Enter'); // Enter on the error state retries
  await expect(popup.locator('[role="option"]')).toHaveCount(3);
  await page.evaluate(() => { window.__async.mode = 'empty'; });
  await page.keyboard.type('x');
  await expect(popup.locator('.uix-select__state')).toHaveText('No matching options');
});

test('react-hook-form: register and Controller round-trip', async ({ page }) => {
  await expect(page.locator('#rhf-team')).toHaveText('Operations');
  await expect(page.locator('#rhf-tags')).toHaveText('Bravo');
  await expect(page.locator('#rhf-site')).toHaveText('Sarajevo');
  await page.locator('#rhf-team').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.locator('#rhf-tags').click();
  await popupOf(page, 'rhf-tags').locator('[role="option"]', { hasText: 'Charlie' }).click();
  await page.keyboard.press('Escape'); // multi: Escape restores — so close with Tab instead below
  await expect(page.locator('#rhf-tags')).toHaveText('Bravo');
  await page.locator('#rhf-tags').click();
  await popupOf(page, 'rhf-tags').locator('[role="option"]', { hasText: 'Charlie' }).click();
  await page.keyboard.press('Tab');
  await page.locator('#rhf-site').click();
  await popupOf(page, 'rhf-site').locator('[role="option"]', { hasText: 'Tuzla' }).click();
  await page.locator('#rhf-submit').click();
  await expect.poll(() => page.evaluate(() => window.__rhf)).toEqual({ team: 'sec', tags: ['b', 'c'], site: 'tz' });
});

test('phone: at 375×812 with touch a bottom sheet opens with rows ≥ 44 px, and no native picker', async ({ browser, browserName }, testInfo) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile/touch emulation in Playwright');
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const theme = themeOf(testInfo.project.name);
  await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* */ } }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  expect(await page.evaluate(() => matchMedia('(pointer: coarse) and (max-width: 640px)').matches)).toBe(true);
  await page.locator('#status').tap();
  const sheet = page.locator('dialog.uix-select__sheet');
  await expect(sheet).toHaveJSProperty('open', true);
  await expect.poll(() => sheet.evaluate((d) => getComputedStyle(d).transform)).toBe('none');
  const m = await sheet.evaluate((d) => {
    const r = d.getBoundingClientRect();
    const rows = [...d.querySelectorAll('[role="option"]')].map((o) => o.getBoundingClientRect().height);
    const natives = [...document.querySelectorAll('select:not([data-uix-select-proxy])')].length;
    const visibleProxies = [...document.querySelectorAll('select[data-uix-select-proxy]')].filter((s) => { const b = s.getBoundingClientRect(); return b.width > 1 || b.height > 1 || getComputedStyle(s).opacity !== '0'; }).length;
    return { gapBelow: Math.round(innerHeight - r.bottom), width: Math.round(r.width), viewport: innerWidth, minRow: Math.min(...rows), natives, visibleProxies, focusInSheet: d.contains(document.activeElement) };
  });
  expect(m.gapBelow).toBe(0); // docked to the bottom edge
  expect(m.width).toBe(m.viewport);
  expect(m.minRow).toBeGreaterThanOrEqual(44);
  expect(m).toMatchObject({ natives: 0, visibleProxies: 0, focusInSheet: true });
  await sheet.locator('[role="option"]', { hasText: 'Resolved' }).tap();
  await expect(sheet).toHaveCount(1);
  await expect.poll(() => sheet.evaluate((d) => d.open)).toBe(false);
  await expect(page.locator('#status')).toHaveText('Resolved');
  await context.close();
});

const axeScan = async (page, testInfo, label) => {
  await settleAnimations(page);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  await testInfo.attach(`axe-${label}`, { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });
  expect(results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`), label).toEqual([]);
};

test('axe: 0 violations closed, open, open with groups, multi open, searchable open, invalid', async ({ page }, testInfo) => {
  await axeScan(page, testInfo, 'closed');
  await page.locator('#status').click();
  await axeScan(page, testInfo, 'open-groups');
  await page.keyboard.press('Escape');
  await page.locator('#labels').click();
  await axeScan(page, testInfo, 'multi-open');
  await page.keyboard.press('Escape');
  await page.locator('#s-search').click();
  await axeScan(page, testInfo, 'searchable-open');
  await page.keyboard.press('Escape');
  await page.locator('#submit').click();
  await axeScan(page, testInfo, 'invalid');
});
