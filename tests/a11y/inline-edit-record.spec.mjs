/* InlineEdit as a record field (HAR-1833; TENSOR HAR-1490 EditableRecord): save on blur and on
 * change, one field open at a time, the pending state only after 300 ms, Try again / Reload
 * latest, an icon trigger, a read-only reason, and the field inside a Drawer.
 *
 * Measured on a German React harness (tests/inline-edit-record/harness.tsx) in both themes.
 * Also the first browser check that `.uix-inline-edit` is in the bundle at all: it was not, from
 * HAR-1381 until this issue (packages/tokens/tests/component-list.test.mjs guards the list).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/inline-edit-record/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#record')).toBeVisible();
};
const record = (page) => page.evaluate(() => window.__record);
const titleView = (page) => page.locator('#record').getByRole('button', { name: /Titel bearbeiten$/ });
const axe = async (page, selector) => {
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  const results = await new AxeBuilder({ page }).include(selector).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
};

test('the kit stylesheet styles it: the value button looks like text, and a short value stays on one line', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const look = await page.locator('#record .uix-inline-edit__view').first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { border: s.borderTopWidth, bg: s.backgroundColor, minHeight: s.minHeight };
  });
  expect(look).toEqual({ border: '0px', bg: 'rgba(0, 0, 0, 0)', minHeight: '28px' });
  const owner = await page.locator('#record .uix-inline-edit__value').filter({ hasText: 'Amra Kovač' }).evaluate((el) => el.getClientRects().length);
  expect(owner, '"Amra Kovač" on one line').toBe(1);
  // The text keeps the column of the plain-text values (the button's padding is pulled back).
  const columns = await page.evaluate(() => {
    const view = document.querySelector('#record .uix-inline-edit__value').getBoundingClientRect().left;
    const plain = document.querySelector('#record .uix-inline-edit--readonly .uix-inline-edit__value').getBoundingClientRect().left;
    return Math.round(view - plain);
  });
  expect(columns).toBe(0);
});

test('commit="blur": leaving the field saves; the pending state shows only after 300 ms', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await titleView(page).click();
  const input = page.getByRole('textbox', { name: 'Titel' });
  await input.fill('Drucker langsam im 3. OG');
  // One read, timed from the blur in the page: no spinner and no read-only grey before 300 ms.
  const early = await page.evaluate(async () => {
    document.querySelector('#record h2').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    document.activeElement.blur();
    await new Promise((resolve) => setTimeout(resolve, 150));
    const save = [...document.querySelectorAll('#record .uix-inline-edit__actions button')].find((b) => b.textContent === 'Speichern');
    return { busy: save.querySelector('[data-uix-btn-busy]') ? 'spinner' : null, readOnly: document.querySelector('#record input').readOnly, editorBusy: document.querySelector('#record .uix-inline-edit__editor').getAttribute('aria-busy') };
  });
  expect(early).toEqual({ busy: null, readOnly: false, editorBusy: 'true' });
  const save = page.locator('#record').getByRole('button', { name: 'Speichern' });
  await expect(save.locator('[data-uix-btn-busy]')).toHaveCount(1);
  await expect(input).toHaveAttribute('readonly', '');
  await expect(page.locator('#record [role="status"]').first()).toHaveText('Wird gespeichert…');
  await expect(page.locator('#record .uix-inline-edit__value').first()).toHaveText('Drucker langsam im 3. OG');
  expect((await record(page)).saves).toEqual(['title:Drucker langsam im 3. OG']);
  expect((await record(page)).states.title).toEqual(['editing', 'saving', 'saved']);
});

test('a fast save never shows the pending state', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.evaluate(() => {
    window.__busySeen = false;
    new MutationObserver(() => { if (document.querySelector('#record .uix-btn [data-uix-btn-busy], #record input[readonly]')) window.__busySeen = true; })
      .observe(document.getElementById('record'), { subtree: true, attributes: true, childList: true });
  });
  await titleView(page).click();
  await page.getByRole('textbox', { name: 'Titel' }).fill('Drucker repariert');
  await page.keyboard.press('Enter');
  await expect(titleView(page)).toBeFocused();
  expect(await page.evaluate(() => window.__busySeen)).toBe(false);
});

test('a failed save keeps the draft with Try again; a conflict offers Reload latest instead', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await titleView(page).click();
  const input = page.getByRole('textbox', { name: 'Titel' });
  await input.fill('Drucker fehler');
  await input.press('Enter');
  const alert = page.locator('#record [role="alert"]');
  await expect(alert).toContainText('Zeitüberschreitung beim Speichern.');
  await expect(input).toHaveValue('Drucker fehler');
  await expect(input).toBeFocused();
  // Leaving a field whose last attempt failed with the same draft does not send it again.
  await page.locator('#record h2').click();
  await page.waitForTimeout(200);
  expect((await record(page)).saves).toEqual(['title:Drucker fehler']);
  await alert.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect.poll(async () => (await record(page)).saves.length).toBe(2);
  // The retry fails again; typing is ignored while it runs, so wait for it to settle.
  await expect(page.locator('#record .uix-inline-edit__editor')).not.toHaveAttribute('aria-busy', 'true');
  await expect(alert).toContainText('Zeitüberschreitung');
  await input.fill('Drucker konflikt');
  await input.press('Enter');
  await expect(alert.getByRole('button', { name: 'Neu laden' })).toBeVisible();
  await expect(alert.getByRole('button', { name: 'Erneut versuchen' })).toHaveCount(0);
  expect(await axe(page, '#record')).toEqual([]);
  await alert.getByRole('button', { name: 'Neu laden' }).click();
  await expect(titleView(page)).toBeFocused();
  await expect(page.locator('#record .uix-inline-edit__value').first()).toHaveText('Drucker im 3. OG druckt nicht');
});

test('one field open at a time; commit="change" saves the chosen person', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await titleView(page).click();
  await page.locator('#record').getByRole('button', { name: /Verantwortlich bearbeiten$/ }).click();
  await expect(page.getByRole('textbox', { name: 'Titel' })).toHaveCount(0);
  const select = page.getByRole('combobox', { name: 'Verantwortlich' });
  await expect(select).toBeFocused();
  await expect(page.locator('#record').getByRole('button', { name: 'Speichern' })).toHaveCount(0);
  await select.selectOption('u3');
  await expect(page.locator('#record .uix-inline-edit__value').filter({ hasText: 'Lejla Hadžić-Šehović' })).toBeVisible();
  expect((await record(page)).saves).toEqual(['owner:u3']);
});

test('the icon trigger is named only by what it edits; a read-only field says why', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const pencil = page.getByRole('button', { name: 'Ticket bearbeiten', exact: true });
  await expect(pencil).toBeVisible();
  await expect(page.getByRole('link', { name: 'INC-20417' })).toBeVisible();
  const box = await pencil.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(24);
  await pencil.click();
  await page.getByRole('textbox', { name: 'Ticket' }).press('Escape');
  await expect(pencil).toBeFocused();
  const source = page.locator('#record .uix-inline-edit--reason .uix-inline-edit__value');
  await expect(source).toHaveAccessibleDescription('Schreibgeschützt: Wird von der Integration gesetzt.');
  await expect(page.locator('#record .uix-inline-edit--reason button')).toHaveCount(0);
});

test('in a Drawer, Escape cancels the edit first and closes the drawer only after', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#open-drawer').click();
  await page.getByRole('button', { name: /Gerät bearbeiten$/ }).click();
  await page.getByRole('textbox', { name: 'Gerät' }).fill('Etwas anderes');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /Gerät bearbeiten$/ })).toBeFocused();
  await expect(page.locator('dialog#in-drawer')).toHaveJSProperty('open', true);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog#in-drawer')).toHaveJSProperty('open', false);
  expect((await record(page)).saves).toEqual([]);
});

test('at 320 px nothing scrolls sideways, editing or not; axe in each state', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 800 });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow()).toBe(0);
  expect(await axe(page, '#root')).toEqual([]);
  await page.locator('#narrow').getByRole('button').click();
  expect(await overflow()).toBe(0);
  await titleView(page).click();
  await page.getByRole('textbox', { name: 'Titel' }).fill('   ');
  await page.keyboard.press('Enter');
  await expect(page.locator('#record [role="alert"]')).toHaveText('Ein Titel ist erforderlich.');
  expect(await overflow()).toBe(0);
  expect(await axe(page, '#root')).toEqual([]);
});
