/* The older kit gaps TENSOR's triage still found blocking, in a real browser (HAR-1346,
 * 2026-10-08): date fields (HAR-1383), InlineEdit (HAR-1381), RadioCard (HAR-1373), a lazy Tree
 * (HAR-1382), EntityPicker hints (HAR-1648), Avatar presence (HAR-1374). jsdom covers roles,
 * state and markup in packages/react/src/*-dom.test.mjs; this covers what jsdom cannot: the
 * native popover (light dismiss, top layer, where it lands), real focus and Tab order, native
 * radio arrow keys, layout at 320 px, and an axe scan of every section in light and dark.
 * Harness: tests/older-gaps/harness.tsx, bundled from source in globalSetup. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleAnimations, settleOverlay } from './settle.mjs';

const HARNESS = '/tests/older-gaps/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo) => {
  await page.addInitScript((t) => { try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ } }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('#dates')).toBeVisible();
};

const axe = async (page, scope) => {
  await settleAnimations(page);
  const { violations } = await new AxeBuilder({ page }).include(scope).analyze();
  return violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
};

const state = (page) => page.evaluate(() => window.__older);
const focusedId = (page) => page.evaluate(() => document.activeElement?.id ?? '');
const focusedDate = (page) => page.evaluate(() => document.activeElement?.getAttribute('data-date') ?? '');
/** The element's box against the viewport: everything must be reachable without scrolling the page. */
const insideViewport = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { top: Math.round(r.top) >= 0, left: Math.round(r.left) >= 0, bottom: Math.round(r.bottom) <= window.innerHeight, right: Math.round(r.right) <= document.documentElement.clientWidth };
});
const ALL_INSIDE = { top: true, left: true, bottom: true, right: true };
/** An InlineEdit value button: "<value>, Edit <label>" (the hidden part is its own box, so a space may precede the comma). */
const editName = (value, label) => new RegExp(`^${value}\\s*, Edit ${label}$`);
const noPageOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

// ── Date fields (HAR-1383) ───────────────────────────────────────────────────
test.describe('DatePicker: a typed date field with a calendar popover', () => {
  test('Tab order: each field is its input and then its calendar button', async ({ page }, testInfo) => {
    await open(page, testInfo);
    await page.locator('#before-dates').focus();
    const stops = [];
    // A native time input is several stops (hours, minutes): consecutive repeats count once.
    for (let i = 0; i < 12 && stops.at(-1) !== 'after-dates'; i += 1) {
      await page.keyboard.press('Tab');
      const stop = await page.evaluate(() => {
        const el = document.activeElement;
        return el.getAttribute('aria-label') ?? (el.labels?.[0]?.textContent || el.id || el.className);
      });
      if (stop !== stops.at(-1)) stops.push(stop);
    }
    expect(stops).toEqual([
      'Due date', 'Change date, Mittwoch, 18. November 2026',
      'Starts', 'Change date, Sonntag, 22. November 2026', 'Starts, time',
      'Period', 'after-dates',
    ]);
  });

  test('the button opens the month on the selected day; arrows move, Enter chooses, focus returns', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const field = page.locator('#dates .uix-field').filter({ hasText: 'Due date' });
    const input = field.getByRole('textbox', { name: 'Due date' });
    await expect(input).toHaveValue('18.11.2026');
    await field.getByRole('button', { name: /^Change date/ }).click();
    const calendar = page.getByRole('dialog', { name: 'Calendar' });
    await expect(calendar).toBeVisible();
    await settleOverlay(calendar);
    expect(await insideViewport(calendar)).toEqual(ALL_INSIDE);
    await expect.poll(() => focusedDate(page)).toBe('2026-11-18');
    await expect(calendar.locator('[data-date="2026-11-18"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(calendar.locator('[data-date="2026-11-10"]')).toHaveAttribute('aria-current', 'date');

    await page.keyboard.press('ArrowRight');
    expect(await focusedDate(page)).toBe('2026-11-19');
    await page.keyboard.press('ArrowDown');
    expect(await focusedDate(page)).toBe('2026-11-26');
    await page.keyboard.press('PageDown');
    expect(await focusedDate(page)).toBe('2026-12-26');
    await expect(calendar.locator('.uix-date-picker__month')).toHaveText('Dezember 2026');
    // 26 December 2026 is a Saturday: it can take focus, it cannot be chosen.
    await page.keyboard.press('Enter');
    await expect(calendar).toBeVisible();
    expect((await state(page)).due).toBe('2026-11-18');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await expect(calendar).toBeHidden();
    await expect(input).toHaveValue('25.12.2026');
    await expect(input).toBeFocused();
    expect((await state(page)).due).toBe('2026-12-25');
    await expect(page.locator('input[type="hidden"][name="due"]')).toHaveValue('2026-12-25');
  });

  test('typing a date: read on Tab, refused with a reason when it cannot be chosen', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const input = page.getByRole('textbox', { name: 'Due date' });
    await input.fill('3.12.2026');
    await page.keyboard.press('Tab');
    await expect(input).toHaveValue('03.12.2026');
    expect((await state(page)).due).toBe('2026-12-03');

    await input.fill('5.12.2026'); // a Saturday
    await input.press('Enter');
    const error = page.locator('#dates .uix-date-picker__error');
    await expect(error).toHaveText('That date is not available.');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toBeFocused();
    expect((await state(page)).due, 'the value is left alone').toBe('2026-12-03');
    await input.fill('morgen');
    await page.keyboard.press('Tab');
    await expect(error).toHaveText('Enter a date as DD.MM.YYYY.');
    expect(await axe(page, '#dates')).toEqual([]);
    await input.fill('');
    await page.keyboard.press('Tab');
    await expect(error).toHaveCount(0);
    expect((await state(page)).due).toBe(null);
  });

  test('ArrowDown opens it from the field; Escape closes it and nothing around the field hears it', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const input = page.getByRole('textbox', { name: 'Due date' });
    await input.focus();
    await page.keyboard.press('ArrowDown');
    const calendar = page.getByRole('dialog', { name: 'Calendar' });
    await expect(calendar).toBeVisible();
    await expect.poll(() => focusedDate(page)).toBe('2026-11-18');
    await page.keyboard.press('Escape');
    await expect(calendar).toBeHidden();
    await expect(input).toBeFocused();
    const after = await state(page);
    expect(after.outerEscape).toBe(0);
    expect(after.due).toBe('2026-11-18');
  });

  test('a press outside closes it, and the button closes it rather than reopening it', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const toggle = page.locator('#dates .uix-field').filter({ hasText: 'Due date' }).locator('.uix-date-picker__toggle');
    const calendar = page.getByRole('dialog', { name: 'Calendar' });
    await toggle.click();
    await expect(calendar).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(calendar).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(calendar).toBeVisible();
    await page.locator('#dates > h2').click();
    await expect(calendar).toBeHidden();
  });

  test('with no room below, the calendar stays on screen; Sunday-first weeks', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await open(page, testInfo);
    const low = page.locator('#low-date');
    await low.scrollIntoViewIfNeeded();
    await low.locator('.uix-date-picker__toggle').click();
    const calendar = page.getByRole('dialog', { name: 'Calendar' });
    await expect(calendar).toBeVisible();
    await settleOverlay(calendar);
    expect(await insideViewport(calendar)).toEqual(ALL_INSIDE);
    await expect(calendar.locator('.uix-date-range-picker__weekdays span').first()).toHaveText('Sun');
    // Every day is a real target, and the seven columns fit a phone.
    const cell = await calendar.locator('[data-date="2026-11-18"]').boundingBox();
    expect(cell.width).toBeGreaterThanOrEqual(32);
    expect(cell.height).toBeGreaterThanOrEqual(32);
    await page.keyboard.press('Home');
    expect(await focusedDate(page)).toBe('2026-11-15');
    expect(await axe(page, '#low-date')).toEqual([]);
  });

  test('axe: closed and with the calendar open', async ({ page }, testInfo) => {
    await open(page, testInfo);
    expect(await axe(page, '#dates')).toEqual([]);
    await page.locator('#dates .uix-field').filter({ hasText: 'Due date' }).locator('.uix-date-picker__toggle').click();
    const calendar = page.getByRole('dialog', { name: 'Calendar' });
    await settleOverlay(calendar);
    expect(await axe(page, '.uix-date-picker__popover:popover-open')).toEqual([]);
  });
});

test.describe('DateTimePicker and DateRangePicker mode="field"', () => {
  test('the time keeps its date, and the zone of that day is shown and described', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const group = page.locator('#dates .uix-date-time-picker');
    const time = group.locator('input[type="time"]');
    await expect(time).toHaveValue('14:30');
    await expect(time).toHaveAccessibleName('Starts, time');
    await expect(time).toHaveAccessibleDescription(/^Time zone: (MEZ|GMT\+1)$/);
    await expect(group.locator('.uix-date-time-picker__zone [aria-hidden="true"]')).toHaveText(/^(MEZ|GMT\+1)$/);
    await time.fill('09:15');
    expect((await state(page)).starts).toBe('2026-11-22T09:15');
    const date = group.getByRole('textbox', { name: 'Starts', exact: true });
    await date.fill('1.7.2026');
    await page.keyboard.press('Tab');
    expect((await state(page)).starts).toBe('2026-07-01T09:15');
    await expect(group.locator('.uix-date-time-picker__zone [aria-hidden="true"]'), 'summer time on the new day').toHaveText(/^(MESZ|GMT\+2)$/);
  });

  test('the range field opens two months, closes on the end date and shows the range', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const trigger = page.locator('#dates .uix-date-range-field__trigger');
    await expect(trigger).toHaveAccessibleName('Period');
    await expect(trigger).toContainText('Choose dates');
    await trigger.click();
    const months = page.getByRole('dialog', { name: 'Period' });
    await expect(months).toBeVisible();
    await settleOverlay(months);
    expect(await insideViewport(months)).toEqual(ALL_INSIDE);
    await expect(months.locator('.uix-date-range-picker__month')).toHaveCount(2);
    await expect.poll(() => focusedDate(page)).toBe('2026-11-01');
    await months.locator('[data-date="2026-11-22"]').click();
    await expect(months, 'a start alone keeps it open').toBeVisible();
    await months.locator('[data-date="2026-12-04"]').click();
    await expect(months).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toContainText('22.11.2026 – 04.12.2026');
    await expect(trigger).toHaveAccessibleDescription('22.11.2026 – 04.12.2026');
    expect((await state(page)).period).toEqual({ start: '2026-11-22', end: '2026-12-04' });
    // Escape leaves the range alone.
    await trigger.press('Enter');
    await expect(months).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(months).toBeHidden();
    await expect(trigger).toBeFocused();
    expect((await state(page)).outerEscape).toBe(0);
  });

  test('at 320 px the fields fit, and the range months stack inside the viewport', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await open(page, testInfo);
    expect(await noPageOverflow(page)).toBe(true);
    const trigger = page.locator('#dates .uix-date-range-field__trigger');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const months = page.getByRole('dialog', { name: 'Period' });
    await expect(months).toBeVisible();
    await settleOverlay(months);
    expect(await insideViewport(months), 'two stacked months are taller than a phone: capped, scrolling inside').toEqual(ALL_INSIDE);
    const [first, second] = await months.locator('.uix-date-range-picker__month').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
    expect(Math.round(first)).toBe(Math.round(second));
    expect(await months.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    expect(await axe(page, '.uix-date-range-field__popover:popover-open')).toEqual([]);
    expect(await noPageOverflow(page)).toBe(true);
  });
});

// ── InlineEdit (HAR-1381) ────────────────────────────────────────────────────
test.describe('InlineEdit: a value edited where it is shown', () => {
  test('click, type, Enter: saved, and focus is back on the value', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const view = page.getByRole('button', { name: editName('Payment API latency', 'Title') });
    await view.click();
    const input = page.getByRole('textbox', { name: 'Title' });
    await expect(input).toBeFocused();
    expect(await input.evaluate((el) => el.selectionEnd - el.selectionStart), 'the draft is selected').toBe('Payment API latency'.length);
    await page.keyboard.type('Checkout latency');
    await page.keyboard.press('Enter');
    const saved = page.getByRole('button', { name: editName('Checkout latency', 'Title') });
    await expect(saved).toBeFocused();
    expect((await state(page)).saved).toEqual(['Checkout latency']);
  });

  test('validate refuses, Escape cancels, and nothing is saved on blur', async ({ page }, testInfo) => {
    await open(page, testInfo);
    await page.getByRole('button', { name: editName('Payment API latency', 'Title') }).click();
    const input = page.getByRole('textbox', { name: 'Title' });
    await input.fill('   ');
    await page.keyboard.press('Enter');
    await expect(page.locator('#inline-edit [role="alert"]')).toHaveText('A title is required.');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(await axe(page, '#inline-edit')).toEqual([]);
    await input.fill('Something else');
    await page.locator('#inline-edit > h2').click();
    await expect(input, 'blur neither saves nor closes').toBeVisible();
    await input.press('Escape');
    await expect(page.getByRole('button', { name: editName('Payment API latency', 'Title') })).toBeFocused();
    expect((await state(page)).saved).toEqual([]);
  });

  test('a failed save keeps the draft and says why; an empty value shows its placeholder', async ({ page }, testInfo) => {
    await open(page, testInfo);
    await expect(page.getByRole('button', { name: editName('Not set', 'Owner') })).toBeVisible();
    await page.getByRole('button', { name: editName('Checkout requests time out', 'Summary') }).click();
    const area = page.getByRole('textbox', { name: 'Summary' });
    await area.fill('This will fail');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('#inline-edit [role="alert"]')).toHaveText('That summary is already used by INC-2041.');
    await expect(area).toHaveValue('This will fail');
    await area.fill('Checkout times out for cards');
    await area.press('Control+Enter');
    await expect(page.getByRole('button', { name: editName('Checkout times out for cards', 'Summary') })).toBeFocused();
  });

  test('axe, and no overflow at 320 px while editing', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await open(page, testInfo);
    expect(await axe(page, '#inline-edit')).toEqual([]);
    await page.getByRole('button', { name: editName('Checkout requests time out', 'Summary') }).click();
    await expect(page.getByRole('textbox', { name: 'Summary' })).toBeFocused();
    expect(await noPageOverflow(page)).toBe(true);
    expect(await axe(page, '#inline-edit')).toEqual([]);
  });
});

// ── RadioCard (HAR-1373) ─────────────────────────────────────────────────────
test.describe('RadioCard: a radio group drawn as cards', () => {
  test('one tab stop on the checked card; arrows move and check, skipping the disabled card', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const group = page.getByRole('group', { name: 'Rollout' });
    await page.locator('#before-cards').focus();
    await page.keyboard.press('Tab');
    await expect(group.getByRole('radio', { name: /^One team/ })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(group.getByRole('radio', { name: /^Everyone/ }), 'the disabled card is skipped').toBeFocused();
    await expect(group.getByRole('radio', { name: /^Everyone/ })).toBeChecked();
    expect((await state(page)).plan).toBe('all');
    await page.keyboard.press('ArrowUp');
    await expect(group.getByRole('radio', { name: /^One team/ })).toBeChecked();
    await page.keyboard.press('Tab');
    expect(await focusedId(page), 'four cards, one tab stop').toBe('after-cards');
  });

  test('the whole card is the target, the description is part of what is read', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const group = page.getByRole('group', { name: 'Rollout' });
    await page.locator('#radio-cards .uix-radio-card__desc').filter({ hasText: 'Vienna only' }).click();
    await expect(group.getByRole('radio', { name: /^One site/ })).toBeChecked();
    await expect(group.getByRole('radio', { name: /^Legacy tenants/ })).toBeDisabled();
    expect(await axe(page, '#radio-cards')).toEqual([]);
  });

  test('at 320 px the cards are one column and nothing overflows', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await open(page, testInfo);
    const lefts = await page.locator('#radio-cards .uix-radio-card').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
    expect(new Set(lefts).size).toBe(1);
    expect(await noPageOverflow(page)).toBe(true);
    expect(await axe(page, '#radio-cards')).toEqual([]);
  });
});

// ── Tree, children loaded on expand (HAR-1382) ───────────────────────────────
test.describe('Tree: a node loads its children when it is expanded', () => {
  test('ArrowRight loads: a busy node with a loading row, then the children', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const tree = page.getByRole('tree', { name: 'Sites' });
    const emea = tree.getByRole('treeitem', { name: /^EMEA/ });
    await emea.focus();
    await expect(emea).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('ArrowRight');
    await expect(emea).toHaveAttribute('aria-busy', 'true');
    await expect(tree.locator('.uix-tree__status')).toContainText('Loading…');
    expect(await axe(page, '#tree')).toEqual([]);
    await expect(tree.getByRole('treeitem', { name: 'Vienna' })).toBeVisible();
    await expect(emea).not.toHaveAttribute('aria-busy', 'true');
    await expect(tree.locator('.uix-tree__status')).toHaveCount(0);
    await page.keyboard.press('ArrowRight');
    await expect(tree.getByRole('treeitem', { name: 'Vienna' })).toBeFocused();
    expect((await state(page)).loads).toEqual(['emea']);
  });

  test('a failed load shows an error row; Enter on it retries', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const tree = page.getByRole('tree', { name: 'Sites' });
    const apac = tree.getByRole('treeitem', { name: /^APAC/ });
    await apac.focus();
    await page.keyboard.press('ArrowRight');
    const error = tree.locator('.uix-tree__status--error');
    await expect(error).toContainText('Could not load.');
    expect(await axe(page, '#tree')).toEqual([]);
    await page.keyboard.press('ArrowDown');
    await expect(tree.getByRole('treeitem', { name: /Could not load/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(tree.locator('.uix-tree__status'), 'the error row became the loading row').toContainText('Loading…');
    await expect(tree.getByRole('treeitem', { name: /Loading/ }), 'and focus went with it, not to <body>').toBeFocused();
    await expect(tree.getByRole('treeitem', { name: 'Singapore' })).toBeVisible();
    await expect(error).toHaveCount(0);
    expect((await state(page)).loads).toEqual(['apac', 'apac']);
    await expect(apac, 'the node takes focus once its children are there').toBeFocused();
  });
});

// ── EntityPicker hints (HAR-1648) ────────────────────────────────────────────
test.describe('EntityPicker: an idle hint and a "more match" row', () => {
  test('below the minimum it says what to type; a cut-off list says that more match', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const input = page.getByRole('combobox', { name: 'Assignee' });
    await input.click();
    await expect(page.locator('#entity')).toContainText('Type at least 2 characters.');
    expect(await axe(page, '#entity')).toEqual([]);
    await input.fill('we');
    const options = page.getByRole('option');
    await expect(options).toHaveCount(5);
    const note = page.locator('.uix-search-suggest__note');
    await expect(note).toHaveText('More matches. Keep typing to narrow the search.');
    await settleAnimations(page);
    expect(await axe(page, '#entity')).toEqual([]);
    await input.fill('weber 2');
    await expect(note, 'a complete list has no such row').toHaveCount(0);
    await expect(options.first()).toContainText('Jonas Weber 2');
  });
});

// ── Avatar presence (HAR-1374) ───────────────────────────────────────────────
test.describe('Avatar presence: four states that do not rely on colour', () => {
  test('each state is drawn differently and named in text', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const section = page.locator('#presence');
    for (const word of ['online', 'busy', 'away', 'offline']) await expect(section).toContainText(word, { ignoreCase: true });
    const dots = await section.locator('.uix-avatar').evaluateAll((els) => els.map((el) => {
      const dot = el.querySelector('.uix-avatar__status');
      const s = getComputedStyle(dot);
      const box = dot.getBoundingClientRect();
      return { fill: s.backgroundColor, ring: s.boxShadow + s.borderColor + s.borderWidth, size: Math.round(box.width) };
    }));
    expect(dots.every((dot) => dot.size >= 8)).toBe(true);
    // The dot is on the circle's edge. The avatar's own `overflow: hidden` (for a photo) used to
    // clip all but a quarter of it, which left the four shapes unreadable.
    const clips = await section.locator('.uix-avatar').evaluateAll((els) => els.map((el) => getComputedStyle(el).overflowX));
    expect(clips, 'an avatar with a dot does not clip it').toEqual(['visible', 'visible', 'visible', 'visible']);
    expect(new Set(dots.map((dot) => `${dot.fill}|${dot.ring}`)).size, 'four different drawings').toBe(4);
    expect(await axe(page, '#presence')).toEqual([]);
  });
});
