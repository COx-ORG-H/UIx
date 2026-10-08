/* The gaps TENSOR found while moving its hand-built UI onto the kit, in a real browser
 * (HAR-1346 follow-ups, 2026-10-08). jsdom covers roles, state and markup in
 * packages/react/src/*-dom.test.mjs; this covers what jsdom cannot: the real Tab order, real
 * focus, real <details>, layout, and an axe scan of every section in light and dark.
 * Harness: tests/tensor-gaps/harness.tsx, bundled from source in globalSetup. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleAnimations } from './settle.mjs';

const HARNESS = '/tests/tensor-gaps/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, query = '') => {
  await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ } }, testInfo.project.name);
  await page.goto(`${HARNESS}${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('#segmented')).toBeVisible();
};

const axe = async (page, scope) => {
  await settleAnimations(page);
  const { violations } = await new AxeBuilder({ page }).include(scope).analyze();
  return violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
};

const focusedText = (page) => page.evaluate(() => document.activeElement?.textContent ?? '');
const focusedId = (page) => page.evaluate(() => document.activeElement?.id ?? '');

// ── Segmented (HAR-1604) ─────────────────────────────────────────────────────
test.describe('Segmented: one tab stop with arrow-key roving', () => {
  test('Tab enters the group once, on the selected option, and the next Tab leaves it', async ({ page }, testInfo) => {
    await open(page, testInfo);
    await page.locator('#before-segmented').focus();
    await page.keyboard.press('Tab');
    expect(await focusedText(page), 'lands on the selected option, not the first').toBe('Default');
    await page.keyboard.press('Tab');
    expect(await focusedId(page), 'one Tab stop for three options').toBe('between-segmented');
    await page.keyboard.press('Shift+Tab');
    expect(await focusedText(page)).toBe('Default');
    await page.keyboard.press('Shift+Tab');
    expect(await focusedId(page)).toBe('before-segmented');
  });

  test('arrows move and select, Home and End jump, and the tab stop follows the choice', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const group = page.getByRole('group', { name: 'Row density' });
    await group.getByRole('button', { name: 'Default' }).focus();
    await page.keyboard.press('ArrowRight');
    expect(await focusedText(page)).toBe('Relaxed');
    await expect(group.getByRole('button', { name: 'Relaxed' })).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.__gaps.density)).toBe('relaxed');
    await page.keyboard.press('ArrowRight');
    expect(await focusedText(page), 'wraps').toBe('Compact');
    await page.keyboard.press('End');
    expect(await focusedText(page)).toBe('Relaxed');
    await page.keyboard.press('Home');
    expect(await focusedText(page)).toBe('Compact');
    await page.keyboard.press('ArrowDown');
    expect(await focusedText(page)).toBe('Default');
    expect(await page.evaluate(() => window.__gaps.density)).toBe('default');
    // leave and come back: the tab stop is where the choice is
    await page.keyboard.press('Home');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    expect(await focusedText(page)).toBe('Compact');
    expect(await group.locator('button[tabindex="0"]').count()).toBe(1);
  });

  test('radiogroup mode: radiogroup / radio / aria-checked, named, same keys, disabled skipped', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const group = page.getByRole('radiogroup', { name: 'Theme' });
    await expect(group).toBeVisible();
    await expect(group.getByRole('radio')).toHaveCount(4);
    await expect(group.getByRole('radio', { name: 'System' })).toBeChecked();
    await page.locator('#between-segmented').focus();
    await page.keyboard.press('Tab');
    expect(await focusedText(page)).toBe('System');
    await page.keyboard.press('ArrowRight');
    expect(await focusedText(page), 'the disabled option is skipped').toBe('Dark');
    await expect(group.getByRole('radio', { name: 'Dark' })).toBeChecked();
    await expect(group.getByRole('radio', { name: 'System' })).not.toBeChecked();
    expect(await page.evaluate(() => window.__gaps.theme)).toBe('dark');
    // the checked option has the lifted look the pressed one has in the default mode
    const lifted = await group.getByRole('radio', { name: 'Dark' }).evaluate((el) => getComputedStyle(el).boxShadow);
    const flat = await group.getByRole('radio', { name: 'Light' }).evaluate((el) => getComputedStyle(el).boxShadow);
    expect(lifted).not.toBe('none');
    expect(flat).toBe('none');
    await page.keyboard.press('Tab');
    expect(await focusedText(page), 'Tab leaves the radiogroup').not.toBe('Dark');
  });

  test('right-to-left swaps Left and Right; a group with no selection is reachable on its first option', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const rtl = page.getByRole('group', { name: 'View' });
    await rtl.getByRole('button', { name: 'List' }).focus();
    await page.keyboard.press('ArrowLeft');
    expect(await focusedText(page)).toBe('Board');
    await page.keyboard.press('ArrowRight');
    expect(await focusedText(page)).toBe('List');

    await page.locator('#view-rtl button[tabindex="0"]').focus();
    await page.keyboard.press('Tab');
    expect(await focusedText(page), 'nothing selected: the first option is the tab stop').toBe('Alpha');
    await page.keyboard.press('Tab');
    expect(await focusedId(page)).toBe('after-segmented');
  });

  test('axe', async ({ page }, testInfo) => {
    await open(page, testInfo);
    expect(await axe(page, '#segmented')).toEqual([]);
  });
});

// ── Tabs (HAR-1600) ──────────────────────────────────────────────────────────
test.describe('Tabs: an accessible name reaches the tablist', () => {
  test('aria-label and aria-labelledby name the tablist, also in overflow="scroll"', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const inbox = page.getByRole('tablist', { name: 'Inbox filters' });
    await expect(inbox).toBeVisible();
    await expect(inbox.getByRole('tab')).toHaveCount(2);
    const news = page.getByRole('tablist', { name: 'Portal news' });
    await expect(news).toBeVisible();
    expect(await news.evaluate((el) => el.parentElement.className)).toBe('uix-tabs-scroller');
    expect(await news.evaluate((el) => el.parentElement.hasAttribute('aria-labelledby')), 'the name is on the tablist, not on the scroller').toBe(false);
    expect(await axe(page, '#tabs')).toEqual([]);
  });
});

// ── CollapsibleSection and Steps (HAR-1628) ──────────────────────────────────
test.describe('CollapsibleSection: remembered state, openRequest, compact rows', () => {
  test('defaultOpen applies on a first visit; the choice is kept in localStorage and wins on the next', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const details = page.locator('#sec-details');
    await expect(details).toHaveAttribute('open', '');
    await details.locator('summary').click();
    await expect(details).not.toHaveAttribute('open', '');
    expect(await page.evaluate(() => localStorage.getItem('uix:collapsible:gaps-details'))).toBe('0');
    expect(await page.evaluate(() => sessionStorage.getItem('uix:collapsible:gaps-details'))).toBe(null);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#sec-details'), 'defaultOpen does not undo what the person chose').not.toHaveAttribute('open', '');
  });

  test('an openRequest already set at mount opens the section, mounts its lazy body and focuses the summary', async ({ page }, testInfo) => {
    await open(page, testInfo, '?open=sla');
    const sla = page.locator('#sec-sla');
    await expect(sla).toHaveAttribute('open', '');
    await expect(page.locator('#sla-body')).toBeVisible();
    await expect(sla.locator('summary')).toBeFocused();
  });

  test('a later openRequest opens a section the person closed, scrolls it into view and moves focus to it', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const sla = page.locator('#sec-sla');
    await expect(sla).not.toHaveAttribute('open', '');
    await expect(page.locator('#sla-body'), 'lazy: not mounted while closed').toHaveCount(0);
    // scroll the card out of view, then ask for the section from a control that stays reachable
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.locator('#jump-sla').evaluate((el) => el.click());
    await expect(sla).toHaveAttribute('open', '');
    await expect(sla.locator('summary')).toBeFocused();
    await expect(sla.locator('summary')).toBeInViewport();
    await expect(page.locator('#sla-body')).toBeVisible();
  });

  test('compact rows: no box of their own, a rule between neighbours, a heading and a named region each', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const card = page.locator('#record-card');
    await expect(card.getByRole('heading', { level: 4 })).toHaveCount(3);
    await expect(card.getByRole('heading', { level: 4, name: /Details/ })).toBeVisible();
    await expect(card.getByRole('region', { name: 'Details' })).toBeVisible();
    const styles = await card.locator('.uix-collapsible--compact').evaluateAll((els) => els.map((el) => {
      const s = getComputedStyle(el);
      return { left: s.borderLeftWidth, top: s.borderTopWidth, radius: s.borderTopLeftRadius, bg: s.backgroundColor };
    }));
    expect(styles.map((s) => s.left)).toEqual(['0px', '0px', '0px']);
    expect(styles.map((s) => s.top), 'only a rule between a row and the row before it').toEqual(['0px', '1px', '1px']);
    expect(new Set(styles.map((s) => s.bg))).toEqual(new Set(['rgba(0, 0, 0, 0)']));
    // the heading looks like the plain title: same size and weight as a section without one
    const sizes = await card.locator('.uix-collapsible__title').evaluateAll((els) => els.map((el) => `${getComputedStyle(el).fontSize} ${getComputedStyle(el).fontWeight}`));
    expect(new Set(sizes).size).toBe(1);
    const base = await page.evaluate(() => getComputedStyle(document.body).fontSize);
    expect(sizes[0]).toBe(`${base} 600`);
    expect(await axe(page, '#collapsible')).toEqual([]);
  });
});

test.describe('Steps that hold content', () => {
  test('four numbered sections, each a heading with its fields in a group named by it, and no progress state', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const list = page.getByRole('list', { name: 'New change' });
    await expect(list.getByRole('listitem')).toHaveCount(4);
    await expect(list.getByRole('heading', { level: 3 })).toHaveText(['What is changing', 'When', 'Risk and rollback', 'Review']);
    await expect(list.getByRole('group', { name: 'When' }).getByLabel('Window')).toBeVisible();
    expect(await list.locator('[aria-current]').count()).toBe(0);
    expect(await list.locator('.uix-visually-hidden').count(), 'no state word is announced').toBe(0);
    await expect(list.locator('.uix-step__marker')).toHaveText(['1', '2', '3', '4']);

    // the content fills the row beside the marker, and nothing overflows at 320 px
    const widths = await list.evaluate((el) => {
      const item = el.querySelector('.uix-step');
      return { list: el.clientWidth, content: item.querySelector('.uix-step__content').getBoundingClientRect().width };
    });
    expect(widths.content).toBeGreaterThan(widths.list - 60);
    await page.setViewportSize({ width: 320, height: 700 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(await axe(page, '#steps')).toEqual([]);
  });
});
