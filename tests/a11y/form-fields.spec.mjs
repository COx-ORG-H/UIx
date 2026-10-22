/* The form-field batch in a real browser (harness: tests/form-fields/harness.tsx, bundled in
 * globalSetup): geometry, focus and keyboard that jsdom cannot measure, and axe on each section.
 * Runs in the light and dark Chromium projects. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/form-fields/harness.html';
const themeOf = (name) => (name === 'dark' ? 'dark' : 'light');

const open = async (page, testInfo, only) => {
  const theme = themeOf(testInfo.project.name);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(`${HARNESS}${only ? `?only=${only}` : ''}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
};

const box = (page, selector) => page.locator(selector).evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
});

const axe = async (page, include) => {
  const result = await new AxeBuilder({ page }).include(include).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
};

test.describe('sizes (HAR-1812)', () => {
  test('Input, Select and Button share a height per size: 28, 36 and 44 px', async ({ page }, testInfo) => {
    await open(page, testInfo, 'sizes');
    for (const [size, px] of [['sm', 28], ['md', 36], ['lg', 44]]) {
      const input = await box(page, `#in-${size}`);
      const select = await box(page, `#sel-${size}`);
      const button = await box(page, `#btn-${size}`);
      expect(input.height, `input ${size}`).toBe(px);
      expect(select.height, `select ${size}`).toBe(px);
      expect(button.height, `button ${size}`).toBe(px);
      expect(select.top).toBe(input.top);
      expect(button.top).toBe(input.top);
    }
  });

  test('lg text is larger than md, and an lg InputGroup keeps its text clear of both icons', async ({ page }, testInfo) => {
    await open(page, testInfo, 'sizes');
    const font = (sel) => page.locator(sel).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(await font('#in-lg')).toBeGreaterThan(await font('#in-md'));
    expect(await font('#ta-lg')).toBeGreaterThan(await font('#ta-md'));
    const field = await box(page, '#group-lg');
    expect(field.height).toBe(44);
    const icons = await page.locator('#group-lg').evaluate((input) => {
      const style = getComputedStyle(input);
      return [...input.parentElement.querySelectorAll('.uix-input-group__icon')].map((icon) => {
        const r = icon.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, padLeft: parseFloat(style.paddingLeft), padRight: parseFloat(style.paddingRight) };
      });
    });
    expect(icons).toHaveLength(2);
    const [lead, trail] = icons;
    // the text box starts after the leading icon and ends before the trailing one
    expect(field.left + lead.padLeft).toBeGreaterThanOrEqual(lead.right + 4);
    expect(field.right - trail.padRight).toBeLessThanOrEqual(trail.left - 4);
    // both icons are centred on the field
    for (const icon of icons) expect(Math.abs((icon.top + icon.bottom) / 2 - (field.top + field.bottom) / 2)).toBeLessThanOrEqual(1);
  });

  test('a one-row Textarea at lg is never under 44 px', async ({ page }, testInfo) => {
    await open(page, testInfo, 'sizes');
    expect((await box(page, '#ta-lg')).height).toBeGreaterThanOrEqual(44);
  });

  test('axe: the sizes section', async ({ page }, testInfo) => {
    await open(page, testInfo, 'sizes');
    await axe(page, '#sizes');
  });
});

test.describe('CheckboxGroup (HAR-1799)', () => {
  test('each box is announced inside the named group, with the hint as its description', async ({ page }, testInfo) => {
    await open(page, testInfo, 'checkbox-group');
    const group = page.getByRole('group', { name: 'Curated tags' });
    await expect(group).toBeVisible();
    await expect(group.getByRole('checkbox')).toHaveCount(8);
    await expect(group).toHaveAccessibleDescription("Shown on the book's public page.");
    await expect(page.getByRole('group', { name: 'Locked tags' }).getByRole('checkbox', { name: 'Staff picks' })).toBeDisabled();
  });

  test('unticking the last box shows the error, announced and tied to the group', async ({ page }, testInfo) => {
    await open(page, testInfo, 'checkbox-group');
    const group = page.getByRole('group', { name: 'Curated tags' });
    await group.getByRole('checkbox', { name: 'History' }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('alert')).toHaveText('Choose at least one tag.');
    await expect(group).toHaveAccessibleDescription('Choose at least one tag.');
    await axe(page, '#checkbox-group');
  });

  test('three columns in a wide card, one at 320 px; long words wrap inside their column', async ({ page }, testInfo) => {
    await open(page, testInfo, 'checkbox-group');
    const columns = () => page.locator('#tags .uix-checkbox-group__options').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(await columns()).toBe(3);
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await columns()).toBe(1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
    // the box stays on the first line of a label that wraps
    const label = page.locator('#tags .uix-checkbox', { hasText: 'Zeitgeschichte' });
    const [boxTop, labelTop, labelHeight] = await label.evaluate((el) => [el.querySelector('.uix-checkbox__box').getBoundingClientRect().top, el.getBoundingClientRect().top, el.getBoundingClientRect().height]);
    expect(labelHeight).toBeGreaterThan(30);
    expect(boxTop - labelTop).toBeLessThan(6);
  });

  test('axe: the groups at rest', async ({ page }, testInfo) => {
    await open(page, testInfo, 'checkbox-group');
    await axe(page, '#checkbox-group');
  });
});
