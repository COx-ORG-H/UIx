/* InfoTip and the `help` slots in a real browser (HAR-737).
 *
 * The harness (tests/info-tip/harness.tsx) is bundled from source in globalSetup. What only exists
 * when rendered: the top-layer panel, hover intent, Tab focus, Esc with focus return, the outside
 * press, the label click in Field, and the panel's measure. The markup contract (empty content,
 * paragraphs, plain text, label.control) is in packages/react/src/info-tip-dom.test.mjs.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/info-tip/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#slots .uix-page-header')).toBeVisible();
});

const pageTip = (page) => page.getByRole('button', { name: 'About: Incidents' });
const panelOf = async (page, button) => page.locator(`[id="${await button.getAttribute('aria-describedby')}"]`);

test('no serious or critical axe violations, with a panel open', async ({ page }) => {
  await pageTip(page).click();
  await expect(await panelOf(page, pageTip(page))).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).analyze();
  const gated = violations.filter((v) => GATED.has(v.impact));
  expect(gated.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
});

test('the ? has a name, and its description is the panel text', async ({ page }) => {
  const button = pageTip(page);
  await expect(button).toHaveCount(1);
  const panel = await panelOf(page, button);
  await expect(panel).toHaveClass(/uix-info-tip__panel/);
  await expect(panel).toHaveAttribute('role', 'tooltip');
  await expect(button).toHaveAccessibleDescription(/unplanned interruption.*Work the list from the top/s);
});

test('Tab focus opens the panel; Esc closes it and focus stays on the ?', async ({ page }) => {
  const button = pageTip(page);
  const panel = await panelOf(page, button);
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('Tab');
  await expect(button).toBeFocused();
  await expect(panel).toBeVisible();
  await expect(panel.locator('p')).toHaveCount(2);

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(button).toBeFocused();

  // Enter reopens it; Tab away closes it
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(panel).toBeHidden();
});

test('hover opens after a short delay and closes when the pointer leaves', async ({ page }) => {
  const button = pageTip(page);
  const panel = await panelOf(page, button);
  await page.mouse.move(0, 0);
  await button.hover();
  await page.waitForTimeout(120);
  await expect(panel, 'not yet: hover intent is ~300 ms').toBeHidden();
  await expect(panel).toBeVisible();

  // the pointer can travel into the panel (WCAG 1.4.13 hoverable)
  await panel.hover();
  await page.waitForTimeout(250);
  await expect(panel).toBeVisible();

  await page.mouse.move(700, 800);
  await expect(panel).toBeHidden();
});

test('a click keeps it open until a press outside', async ({ page }) => {
  const button = pageTip(page);
  const panel = await panelOf(page, button);
  await button.click();
  await expect(panel).toBeVisible();
  await page.mouse.move(700, 800);
  await page.waitForTimeout(250);
  await expect(panel, 'pinned: leaving does not close it').toBeVisible();
  await page.mouse.click(700, 800);
  await expect(panel).toBeHidden();
});

test('Field: clicking the label focuses the input and leaves the ? closed (HAR-743)', async ({ page }) => {
  const field = page.locator('#slots .uix-field').first();
  const button = field.getByRole('button', { name: 'About: Impact' });
  const panel = await panelOf(page, button);
  await field.locator('label').click();
  await expect(field.locator('input')).toBeFocused();
  await expect(panel).toBeHidden();
  expect(await field.locator('label').evaluate((l) => l.control === l.parentElement.parentElement.querySelector('input'))).toBe(true);
  // exact: with the ? inside the label the input would be named "Impact About: Impact"
  await expect(field.getByRole('textbox', { name: 'Impact', exact: true })).toHaveCount(1);
});

test('the panel is plain text in a ~360 px measure that stays on screen', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 700 });
  const button = page.getByRole('button', { name: 'About: long help' });
  const panel = await panelOf(page, button);
  await button.click();
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box.width).toBeLessThanOrEqual(360);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(420);
});

test('the 7x9 px ? has a 25 px hit area (WCAG 2.5.8)', async ({ page }) => {
  const button = pageTip(page);
  const box = await button.boundingBox();
  expect(Math.round(box.width)).toBe(7);
  expect(Math.round(box.height)).toBe(9);
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.uix-info-tip__button') != null,
    { x: box.x + box.width + 8, y: box.y - 7 });
  expect(hit, '8 px right of and 7 px above the glyph still hits the button').toBe(true);
});

test('the ? is the same fixed size everywhere and sits at the top right of its text', async ({ page }) => {
  // For each slot (and inline in running text): the glyph box is 7x9 px whatever the text size,
  // its top overshoots the capitals by 0.2em (superscript, never centred on the word), its
  // bottom stays above the baseline, and it follows the text rather than overlapping it.
  const rows = await page.evaluate(() => [...document.querySelectorAll(
    '[class*="__title-row"], .uix-field__label-row, #long > p',
  )].map((row) => {
    const text = row.matches('p') ? row : row.firstElementChild;
    const probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:1cap;vertical-align:baseline';
    text.prepend(probe);
    const capTop = probe.getBoundingClientRect().top;
    const fontSize = getComputedStyle(text).fontSize;
    const baseline = capTop + probe.getBoundingClientRect().height;
    probe.remove();
    const glyph = row.querySelector('.uix-info-tip__button').getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(row.matches('p') ? row.firstChild : text);
    return { row: row.className || 'inline', fontSize, capTop, baseline, top: glyph.top, bottom: glyph.bottom, w: glyph.width, h: glyph.height,
      after: glyph.left >= range.getBoundingClientRect().right };
  }));
  expect(rows.length, 'page header, card, section head, field, inline').toBe(5);
  expect(new Set(rows.map((r) => r.fontSize)).size, 'the fixture spans several text sizes').toBeGreaterThan(2);
  for (const r of rows) {
    expect([r.w, r.h], `${r.row}: fixed 7x9 px`).toEqual([7, 9]);
    expect(Math.abs(r.capTop - r.top - 0.2 * parseFloat(r.fontSize)), `${r.row}: top 0.2em above cap height`).toBeLessThanOrEqual(1);
    expect(r.bottom, `${r.row}: raised off the baseline`).toBeLessThan(r.baseline - 1);
    expect(r.after, `${r.row}: after the text`).toBe(true);
  }
});

test('hover and open use the primary-button blue', async ({ page }) => {
  const button = pageTip(page);
  const rest = await button.evaluate((el) => getComputedStyle(el).color);
  const primary = await page.evaluate(() => {
    const el = Object.assign(document.createElement('button'), { className: 'uix-btn uix-btn--primary' });
    document.body.append(el);
    const bg = getComputedStyle(el).backgroundColor;
    el.remove();
    return bg;
  });
  await button.click();
  // polled: the colour eases in over --uix-dur-fast
  await expect.poll(() => button.evaluate((el) => getComputedStyle(el).color)).toBe(primary);
  expect(rest, 'muted at rest').not.toBe(primary);
});

test.describe('styleguide reference route (operator check)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const theme = testInfo.project.name;
    await page.addInitScript((t) => {
      try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
    }, theme);
    await page.goto('docs/explorer.html#info-tip', { waitUntil: 'networkidle' });
  });

  test('hover shows two paragraphs; Tab focus opens it; Esc closes it', async ({ page }) => {
    const stage = page.locator('[data-component-preview="info-tip"] .uix-docs__demo-stage');
    const button = stage.getByRole('button', { name: 'About: Incidents' });
    const panel = page.locator('#demo-info-tip-page-help');
    await button.hover();
    await expect(panel).toBeVisible();
    await expect(panel.locator('p')).toHaveCount(2);
    await page.mouse.move(0, 0);
    await expect(panel).toBeHidden();

    await button.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(button).toBeFocused();

    const { violations } = await new AxeBuilder({ page }).include('[data-component-preview="info-tip"]').analyze();
    expect(violations.filter((v) => GATED.has(v.impact)).map((v) => v.id)).toEqual([]);
  });
});
