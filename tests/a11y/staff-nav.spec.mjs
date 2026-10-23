/* Sidebar actions and search, AccountMenu, the nav-tier hotkey and the phone nav tier (HAR-1371),
 * in Chromium, light and dark. Harness: tests/staff-shell/harness.tsx (?view=nav, nav-topbar).
 *   - the head holds the brand, the action buttons and the toggle on one row; the search row
 *     opens the search and announces its shortcut (aria-keyshortcuts);
 *   - AccountMenu: a button named by the person, a menu named "Račun" that opens with Enter,
 *     focuses its first row, runs a row and returns focus to the trigger;
 *   - "[" switches full <-> rail at once (no transition on the shell), not while typing in a
 *     field, and a reload keeps the rail (localStorage);
 *   - the rail keeps the search row and the account trigger named, as centred icon buttons;
 *   - at 320 and 390 px the sidebar column is gone, the menu button opens the sidebar in a
 *     start-side drawer, Escape closes it and returns focus, following a link closes it;
 *   - axe is clean in each state. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleOverlay } from './settle.mjs';

const HARNESS = '/tests/staff-shell/harness.html';

async function open(page, theme, view = 'nav', viewport = { width: 1280, height: 800 }) {
  await page.setViewportSize(viewport);
  await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* private */ } }, theme);
  await page.goto(`${HARNESS}?view=${view}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#shell')).toBeVisible();
}

const axe = async (page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes[0]?.target}`);
};

test('the head row and the search row', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name);
  const head = await page.locator('#sidebar .uix-sidebar__head').evaluate((el) => {
    const r = (s) => el.querySelector(s).getBoundingClientRect();
    return { brand: r('.uix-sidebar__brand'), actions: r('.uix-sidebar__actions'), width: el.getBoundingClientRect().width };
  });
  expect(Math.abs((head.brand.top + head.brand.height / 2) - (head.actions.top + head.actions.height / 2))).toBeLessThanOrEqual(1);
  expect(head.actions.left).toBeGreaterThan(head.brand.left);
  const search = page.getByRole('button', { name: 'Pretraga' });
  await expect(search).toHaveAttribute('aria-keyshortcuts', /^(Control|Meta)\+K$/);
  await search.click();
  expect(await page.evaluate(() => window.__shell.searches)).toBe(1);
  // the actions are real controls: the "…" opens its menu
  await page.locator('#more').click();
  await expect(page.getByRole('menu', { name: 'Alati' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#more')).toBeFocused();
  expect(await axe(page)).toEqual([]);
});

test('AccountMenu opens with the keyboard, runs a row and gives focus back', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name);
  const trigger = page.getByRole('button', { name: /Dževad Hodžić/ });
  await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  // the initials are not part of the name
  expect(await trigger.evaluate((el) => el.textContent.includes('DH'))).toBe(true);
  expect((await trigger.getAttribute('aria-label')) ?? '').not.toMatch(/DH/);
  await trigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu', { name: 'Račun' });
  await expect(menu).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Profil' })).toBeFocused();
  // the menu opens above the trigger at the bottom of the sidebar, inside the viewport (measured
  // once it has settled: its held first frame sits one --uix-lift off its place)
  await settleOverlay(menu);
  const box = await menu.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(800);
  expect(await axe(page)).toEqual([]);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.__shell.selected)).toEqual(['preferences']);
  await expect(trigger).toBeFocused();
});

test('"[" switches the rail at once, not while typing, and a reload keeps it', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name);
  const shell = page.locator('#shell');
  expect(await shell.evaluate((el) => getComputedStyle(el).transitionDuration.split(',').every((d) => parseFloat(d) === 0))).toBe(true);
  await page.locator('#note').focus();
  await page.keyboard.type('[');
  await expect(shell).not.toHaveAttribute('data-nav', /.+/);
  await expect(page.locator('#note')).toHaveValue('[');
  await page.locator('h2, h1').first().click();
  await page.keyboard.press('[');
  await expect(shell).toHaveAttribute('data-nav', 'rail');
  await expect(page.locator('#sidebar')).toHaveAttribute('data-nav', 'rail');
  // the rail: the search row and the account trigger keep their names and centre their icon
  const rail = await page.evaluate(() => {
    const centre = (sel) => { const b = document.querySelector(sel); const i = b.querySelector('svg, .uix-avatar'); const r = b.getBoundingClientRect(); const s = i.getBoundingClientRect(); return Math.abs((s.left + s.width / 2) - (r.left + r.width / 2)); };
    return { search: centre('.uix-sidebar__search'), account: centre('.uix-account-menu') };
  });
  expect(rail.search).toBeLessThanOrEqual(1);
  expect(rail.account).toBeLessThanOrEqual(1);
  await expect(page.getByRole('button', { name: 'Pretraga' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Dževad Hodžić/ })).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(shell).toHaveAttribute('data-nav', 'rail');
  await expect(page.locator('#sidebar')).toHaveAttribute('data-nav', 'rail');
  await page.keyboard.press('[');
  await expect(shell).not.toHaveAttribute('data-nav', /.+/);
  expect(await page.evaluate(() => localStorage.getItem('uix-harness-nav'))).toBe('full');
});

for (const [view, width] of [['nav', 320], ['nav-topbar', 390]]) {
  test(`phone tier (${view}, ${width} px): the drawer holds the sidebar; Escape and a link close it`, async ({ page }, testInfo) => {
    await open(page, testInfo.project.name, view, { width, height: 760 });
    const grid = await page.evaluate(() => ({
      side: getComputedStyle(document.querySelector('#shell > .uix-shell__sidebar')).display,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(grid).toEqual({ side: 'none', overflow: 0 });
    const button = page.getByRole('button', { name: 'Otvori navigaciju' });
    await expect(button).toBeVisible();
    const size = await button.boundingBox();
    expect(Math.min(size.width, size.height)).toBeGreaterThanOrEqual(24);
    if (view === 'nav-topbar') expect(await button.evaluate((b) => !!b.closest('.uix-shell__topbar'))).toBe(true);
    await button.click();
    const drawer = page.getByRole('dialog', { name: 'Navigacija' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Katalog' })).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const box = await drawer.boundingBox();
    expect(box.x).toBeLessThanOrEqual(1);
    expect(await axe(page)).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(button).toBeFocused();
    await button.click();
    await drawer.getByRole('link', { name: 'Katalog' }).click();
    await expect(drawer).toBeHidden();
    await expect(page).toHaveURL(/#katalog$/);
  });
}

test('above the phone width there is no menu button and no drawer', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name, 'nav', { width: 768, height: 800 });
  await expect(page.getByRole('button', { name: 'Otvori navigaciju' })).toBeHidden();
  await expect(page.locator('#shell > .uix-shell__sidebar')).toBeVisible();
});

// Review of #165: the drawer is a full sidebar even after the rail was chosen on a wide screen,
// and it does not slide out empty.
test('a rail chosen on desktop: the phone drawer still shows the full sidebar, and keeps it while it closes', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name);
  await page.locator('h1, h2').first().click();
  await page.keyboard.press('[');
  await expect(page.locator('#shell')).toHaveAttribute('data-nav', 'rail');
  await page.setViewportSize({ width: 390, height: 760 });
  await page.getByRole('button', { name: 'Otvori navigaciju' }).click();
  const drawer = page.getByRole('dialog', { name: 'Navigacija' });
  await expect(drawer).toBeVisible();
  const inDrawer = drawer.locator('.uix-sidebar');
  await expect(inDrawer).not.toHaveAttribute('data-nav', 'rail');
  const label = drawer.locator('.uix-navitem__label', { hasText: 'Katalog' });
  expect((await label.boundingBox()).width, 'the label is shown, not clipped to the rail').toBeGreaterThan(20);
  await expect(drawer.locator('.uix-account-menu')).not.toHaveClass(/uix-account-menu--collapsed/);
  // the moment the close starts, the content is still in the drawer that slides out
  const during = await page.evaluate(() => new Promise((resolve) => {
    const dialog = document.querySelector('dialog.uix-shell__nav-drawer');
    // following a link closes the drawer; read the next frame of the closing drawer
    dialog.querySelector('a[href="#katalog"]').click();
    requestAnimationFrame(() => resolve(dialog.querySelectorAll('.uix-navitem').length));
  }));
  expect(during).toBeGreaterThan(0);
  await expect(drawer).toBeHidden();
  await expect.poll(() => page.locator('dialog.uix-shell__nav-drawer .uix-navitem').count()).toBe(0);
});
