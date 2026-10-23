/* A dirty Drawer or Modal asks before it throws input away (HAR-2029; TENSOR audit UXC-01, D-10).
 *
 * TENSOR's form drawers passed dismissOnBackdrop={false}, so one Escape or × still discarded five
 * minutes of typing. With `dirty`, Escape, the ×, a backdrop click and a DialogClose (Cancel) open
 * an anchored "Discard changes?" step with focus on "Keep editing"; with `pending` they do
 * nothing; a clean dialog closes at once.
 *
 * jsdom has no top layer, no close watcher and no layout, so this runs the real thing on a React
 * harness (tests/discard-prompt/harness.tsx) in Chromium, in both themes. Chromium closes a modal
 * dialog by force when Escape is pressed again with no user activation in between (close-watcher
 * abuse protection), which only a real browser shows: the repeated-Escape test is that case.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleOverlay } from './settle.mjs';

const HARNESS = '/tests/discard-prompt/harness.html';
const GATED = new Set(['serious', 'critical']);
/** The theme of a project: `light` / `dark`, and light in the cross-browser projects (HAR-2417). */
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, themeOf(testInfo));
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', themeOf(testInfo));
  await expect(page.locator('#open-drawer')).toBeVisible();
});

const closes = (page) => page.evaluate(() => ({ ...window.__discard.closes }));

/** Open a dialog and wait until it is modal with a stable, non-empty box (see drawer.spec.mjs). */
const openDialog = async (page, button, id) => {
  await page.locator(`#${button}`).click();
  const dialog = page.locator(`dialog#${id}`);
  await expect(dialog).toHaveJSProperty('open', true);
  let last;
  await expect.poll(async () => {
    const { modal, animating, rect } = await dialog.evaluate((d) => {
      const { x, y, width, height } = d.getBoundingClientRect();
      return { modal: d.matches(':modal'), animating: d.getAnimations({ subtree: true }).length > 0, rect: { x, y, width, height } };
    });
    const key = JSON.stringify(rect);
    const settled = modal && !animating && rect.width > 0 && key === last;
    last = key;
    return settled;
  }, { message: `#${id} settles`, timeout: 15_000 }).toBe(true);
  return dialog;
};

const prompt = (page) => page.getByRole('alertdialog', { name: 'Discard changes?' });
const nameField = (page, id) => page.locator(`#${id}-name`);

for (const [button, id] of [['open-drawer', 'drawer'], ['open-modal', 'modal']]) {
  test(`${id}: clean, Escape closes at once`, async ({ page }) => {
    const dialog = await openDialog(page, button, id);
    await nameField(page, id).focus();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveJSProperty('open', false);
    await expect.poll(async () => (await closes(page))[id]).toBe(1);
    await expect(prompt(page)).toHaveCount(0);
  });

  test(`${id}: dirty, Escape asks with focus on Keep editing; Keep editing returns to the field`, async ({ page }) => {
    const dialog = await openDialog(page, button, id);
    await nameField(page, id).fill('Incident created v2');
    await page.keyboard.press('Escape');
    await expect(prompt(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keep editing' })).toBeFocused();
    await expect(dialog).toHaveJSProperty('open', true);

    await page.getByRole('button', { name: 'Keep editing' }).click();
    await expect(prompt(page)).toBeHidden();
    await expect(nameField(page, id)).toBeFocused();
    // Closed, the step is not laid out at all: a [popover] whose class sets `display` used to stay
    // an invisible fixed box at the viewport's top-left that took clicks.
    await expect.poll(() => page.locator(`dialog#${id} [data-uix-discard-prompt]`).evaluate((el) => getComputedStyle(el).display)).toBe('none');
    await expect(dialog).toHaveJSProperty('open', true);
    expect((await closes(page))[id]).toBe(0);
  });

  test(`${id}: dirty, × asks next to the ×; Discard closes`, async ({ page }) => {
    const dialog = await openDialog(page, button, id);
    await nameField(page, id).fill('Incident created v2');
    const close = dialog.getByRole('button', { name: id === 'drawer' ? 'Close drawer' : 'Close dialog' });
    await close.click();
    const step = prompt(page);
    await expect(step).toBeVisible();
    await settleOverlay(step);
    const [x, s] = [await close.boundingBox(), await step.boundingBox()];
    expect(Math.abs(s.x + s.width - (x.x + x.width)), 'the step lines up with the × it came from').toBeLessThan(2);
    expect(s.y, 'the step opens below the ×').toBeGreaterThan(x.y + x.height);

    await page.getByRole('button', { name: 'Discard' }).click();
    await expect(dialog).toHaveJSProperty('open', false);
    expect((await closes(page))[id]).toBe(1);
  });

  test(`${id}: dirty, Cancel (DialogClose) asks next to Cancel`, async ({ page }) => {
    const dialog = await openDialog(page, button, id);
    await nameField(page, id).fill('Incident created v2');
    const cancel = dialog.locator('#cancel');
    await cancel.click();
    const step = prompt(page);
    await expect(step).toBeVisible();
    await settleOverlay(step);
    const [c, s] = [await cancel.boundingBox(), await step.boundingBox()];
    const near = Math.min(Math.abs(s.y - (c.y + c.height)), Math.abs(s.y + s.height - c.y));
    expect(near, 'the step opens against Cancel').toBeLessThan(12);
    await page.keyboard.press('Escape');
    await expect(step).toBeHidden();
    await expect(cancel).toBeFocused();
    await expect(dialog).toHaveJSProperty('open', true);
  });

  test(`${id}: Escape again and again never closes a dirty dialog`, async ({ page }) => {
    const dialog = await openDialog(page, button, id);
    await nameField(page, id).fill('Incident created v2');
    // Count real closes: a dialog that closed and reopened would still read open=true.
    await dialog.evaluate((d) => { window.__closeEvents = 0; d.addEventListener('close', () => { window.__closeEvents += 1; }); });
    // No click or typing between the presses: no user activation for the browser's close watcher.
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('Escape');
    await expect(dialog).toHaveJSProperty('open', true);
    expect(await page.evaluate(() => window.__closeEvents), 'the dialog never closed, not even to reopen').toBe(0);
    expect((await closes(page))[id]).toBe(0);
    await expect(nameField(page, id)).toHaveValue('Incident created v2');
  });

  test(`${id}: pending, Escape, × and Cancel do nothing`, async ({ page }) => {
    const dialog = await openDialog(page, button, id);
    await nameField(page, id).fill('Incident created v2');
    await dialog.locator('#save').click();
    const close = dialog.getByRole('button', { name: id === 'drawer' ? 'Close drawer' : 'Close dialog' });
    await expect(close).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');
    await close.click({ force: true });
    await dialog.locator('#cancel').click({ force: true });
    await expect(prompt(page)).toHaveCount(0);
    await expect(dialog).toHaveJSProperty('open', true);
    expect((await closes(page))[id]).toBe(0);
    // Once the save settles, the guard is back.
    await page.evaluate(() => window.__discard.settle());
    await expect(close).not.toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');
    await expect(prompt(page)).toBeVisible();
  });
}

test('drawer: dirty, a backdrop click asks; a press outside the step only dismisses it', async ({ page }) => {
  const dialog = await openDialog(page, 'open-drawer', 'drawer');
  await nameField(page, 'drawer').fill('Incident created v2');
  const box = await dialog.boundingBox();
  const backdrop = [Math.max(4, box.x / 2), box.height / 2];
  await page.mouse.click(...backdrop);
  await expect(prompt(page)).toBeVisible();
  await expect(dialog).toHaveJSProperty('open', true);
  // A second backdrop click while it asks: keep editing, and do not ask again.
  await page.mouse.click(...backdrop);
  await expect(prompt(page)).toBeHidden();
  await expect(dialog).toHaveJSProperty('open', true);
  expect((await closes(page)).drawer).toBe(0);
});

test('drawer: Escape on an open Select closes its list, not the drawer, and does not ask', async ({ page }) => {
  const dialog = await openDialog(page, 'open-drawer', 'drawer');
  await nameField(page, 'drawer').fill('Incident created v2');
  const select = dialog.locator('#drawer-team');
  await select.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(prompt(page)).toHaveCount(0);
  await expect(dialog).toHaveJSProperty('open', true);
});

test('drawer: a Modal nested in a dirty drawer closes on Escape, and its first click counts', async ({ page }) => {
  const dialog = await openDialog(page, 'open-drawer', 'drawer');
  await nameField(page, 'drawer').fill('Incident created v2');
  await dialog.locator('#open-inner').click();
  const inner = page.locator('dialog#inner');
  await expect(inner).toHaveJSProperty('open', true);
  await page.keyboard.press('Escape');
  await expect(inner).toHaveJSProperty('open', false);
  await expect(prompt(page)).toHaveCount(0);
  await dialog.locator('#open-inner').click();
  await expect(inner).toHaveJSProperty('open', true);
  await inner.locator('#inner-ok').click();
  await expect(inner).toHaveJSProperty('open', false);
  expect(await page.evaluate(() => window.__discard.innerOk)).toBe(1);
  await expect(dialog).toHaveJSProperty('open', true);
});

test('drawer: clean, Escape closes an open popover and leaves the drawer open', async ({ page }) => {
  // WebKit handed this Escape to the drawer as well (a `cancel` after the popover closed): the
  // clean drawer closed with its popover (HAR-2417, found by running this spec in WebKit).
  const dialog = await openDialog(page, 'open-drawer', 'drawer');
  await dialog.locator('#help-trigger').click();
  const help = page.locator('#help-pop');
  await expect.poll(() => help.evaluate((el) => el.matches(':popover-open'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => help.evaluate((el) => el.matches(':popover-open'))).toBe(false);
  await page.waitForTimeout(100);
  await expect(dialog).toHaveJSProperty('open', true);
  expect((await closes(page)).drawer).toBe(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveJSProperty('open', false);
});

test('drawer: Escape closes an open popover first, and does not ask', async ({ page }) => {
  const dialog = await openDialog(page, 'open-drawer', 'drawer');
  await nameField(page, 'drawer').fill('Incident created v2');
  await dialog.locator('#help-trigger').click();
  const help = page.locator('#help-pop');
  await expect.poll(() => help.evaluate((el) => el.matches(':popover-open'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => help.evaluate((el) => el.matches(':popover-open'))).toBe(false);
  await expect(prompt(page)).toHaveCount(0);
  // The next Escape is the drawer's: it asks.
  await page.keyboard.press('Escape');
  await expect(prompt(page)).toBeVisible();
});

/** The three hover hints in the drawer (HAR-2415): what shows each one, and the hint itself. */
const HINTS = [
  ['a Tooltip', '#tip-copy', (page) => page.getByRole('tooltip', { name: 'Copy a link to this template' })],
  ['a Button shortcut hint', '#hint-preview', (page) => page.locator('.uix-tooltip__bubble--hint:popover-open')],
  ['an InfoTip', '#info-template button', (page) => page.locator('.uix-info-tip__panel:popover-open')],
];

for (const [what, trigger, hint] of HINTS) {
  test(`drawer: dirty, Escape on ${what} closes only the hint; the next one asks`, async ({ page }) => {
    const dialog = await openDialog(page, 'open-drawer', 'drawer');
    await nameField(page, 'drawer').fill('Incident created v2');
    await dialog.locator(trigger).hover();
    await expect(hint(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(hint(page)).toBeHidden();
    await expect(prompt(page), 'the hint\'s Escape does not reach the drawer').toHaveCount(0);
    await expect(dialog).toHaveJSProperty('open', true);
    await page.keyboard.press('Escape');
    await expect(prompt(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keep editing' })).toBeFocused();
  });

  test(`drawer: clean, Escape on ${what} closes only the hint; the next one closes the drawer`, async ({ page }) => {
    const dialog = await openDialog(page, 'open-drawer', 'drawer');
    await dialog.locator(trigger).hover();
    await expect(hint(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(hint(page)).toBeHidden();
    // A close would arrive as a queued `close` event: give it the time to.
    await page.waitForTimeout(100);
    await expect(dialog).toHaveJSProperty('open', true);
    expect((await closes(page)).drawer).toBe(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveJSProperty('open', false);
    await expect.poll(async () => (await closes(page)).drawer).toBe(1);
  });
}

test('drawer: Escape on a keyboard-focused Button hint closes the hint; focus stays on the button', async ({ page }) => {
  const dialog = await openDialog(page, 'open-drawer', 'drawer');
  await nameField(page, 'drawer').fill('Incident created v2');
  // Keyboard focus (focus-visible) shows the hint.
  await dialog.locator('#tip-copy').focus();
  await page.keyboard.press('Tab');
  await expect(dialog.locator('#hint-preview')).toBeFocused();
  const hint = page.locator('.uix-tooltip__bubble--hint:popover-open');
  await expect(hint).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(hint).toHaveCount(0);
  await expect(prompt(page)).toHaveCount(0);
  await expect(dialog.locator('#hint-preview')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(prompt(page)).toBeVisible();
});

test('drawer: a click on the step\'s own text keeps it open', async ({ page }) => {
  const dialog = await openDialog(page, 'open-drawer', 'drawer');
  await nameField(page, 'drawer').fill('Incident created v2');
  await page.keyboard.press('Escape');
  const step = prompt(page);
  await expect(step).toBeVisible();
  await settleOverlay(step);
  await step.locator('.uix-popconfirm__title').click();
  await expect(step).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(step).toBeHidden();
  await expect(dialog).toHaveJSProperty('open', true);
});

test('drawer: a close request while it asks backs out of the step; the next one asks again', async ({ page }) => {
  const dialog = await openDialog(page, 'open-drawer', 'drawer');
  await nameField(page, 'drawer').fill('Incident created v2');
  await page.keyboard.press('Escape');
  await expect(prompt(page)).toBeVisible();
  // requestClose() makes the close request a back gesture makes. A script's request is always
  // cancellable, so the forced close that follows an uncancellable one (a second gesture with no
  // user activation) is covered in discard-prompt-dom.test.mjs.
  const supported = await dialog.evaluate((d) => typeof d.requestClose === 'function');
  test.skip(!supported, 'HTMLDialogElement.requestClose() is not in this browser');
  await dialog.evaluate((d) => d.requestClose());
  await expect(prompt(page)).toBeHidden();
  await expect(nameField(page, 'drawer')).toBeFocused();
  await dialog.evaluate((d) => d.requestClose());
  await expect(prompt(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep editing' })).toBeFocused();
  await expect(dialog).toHaveJSProperty('open', true);
  expect((await closes(page)).drawer).toBe(0);
});

test('axe: the open discard step', async ({ page }) => {
  await openDialog(page, 'open-drawer', 'drawer');
  await nameField(page, 'drawer').fill('Incident created v2');
  await page.keyboard.press('Escape');
  const step = prompt(page);
  await expect(step).toBeVisible();
  await settleOverlay(step);
  const results = await new AxeBuilder({ page }).include('dialog#drawer').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.passes.length).toBeGreaterThan(0);
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
