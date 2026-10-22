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

test.describe('PasswordInput and OtpInput (HAR-1376)', () => {
  test('the toggle reveals and hides; a click keeps focus in the field; the keyboard reaches it', async ({ page }, testInfo) => {
    await open(page, testInfo, 'sign-in');
    const field = page.getByLabel('Password', { exact: true });
    const toggle = page.locator('#password ~ .uix-input-group__action');
    await expect(field).toHaveAttribute('type', 'password');
    await expect(toggle).toHaveAccessibleName('Show password');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(field).toHaveAccessibleDescription('At least 12 characters.');
    await field.click();
    await toggle.click();
    await expect(field).toHaveAttribute('type', 'text');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toHaveAccessibleName('Show password'); // the pressed state carries the meaning
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('password');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.className)).toBe('uix-input-group__action');
    await page.keyboard.press('Space');
    await expect(field).toHaveAttribute('type', 'password');
    await expect(page.locator('#password-lg ~ .uix-input-group__action')).toHaveAccessibleName('Prikaži lozinku');
    await expect(page.locator('#password-off ~ .uix-input-group__action')).toBeDisabled();
  });

  test('submitting the form hides a revealed password first and posts the value', async ({ page }, testInfo) => {
    await open(page, testInfo, 'sign-in');
    await page.locator('#password ~ .uix-input-group__action').click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
    await page.locator('#sign-in-submit').click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    expect(await page.evaluate(() => window.__posted.signIn)).toContain('password=correct horse battery');
  });

  test('the toggle sits inside the field end and the text never runs under it (md and lg)', async ({ page }, testInfo) => {
    await open(page, testInfo, 'sign-in');
    for (const id of ['password', 'password-lg']) {
      const geo = await page.locator(`#${id}`).evaluate((input) => {
        const button = input.parentElement.querySelector('.uix-input-group__action');
        const i = input.getBoundingClientRect();
        const b = button.getBoundingClientRect();
        return { i: { top: i.top, bottom: i.bottom, right: i.right, height: i.height }, b: { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height }, padRight: parseFloat(getComputedStyle(input).paddingRight) };
      });
      expect(geo.b.width).toBe(geo.b.height);
      expect(geo.b.height).toBe(geo.i.height - 8);
      expect(geo.b.height).toBeGreaterThanOrEqual(24);
      expect(geo.b.right).toBe(geo.i.right - 4);
      expect(geo.i.right - geo.padRight).toBeLessThanOrEqual(geo.b.left);
    }
  });

  test('OtpInput: one named input; typing fills the cells; paste keeps only digits; complete once; Backspace', async ({ page }, testInfo) => {
    await open(page, testInfo, 'sign-in');
    const otp = page.getByLabel('Verification code');
    await expect(otp).toHaveCount(1);
    await expect(otp).toHaveAttribute('autocomplete', 'one-time-code');
    await expect(otp).toHaveAttribute('inputmode', 'numeric');
    await expect(otp).toHaveAccessibleDescription('Enter the 6 digits from your authenticator app.');
    await otp.focus();
    await page.keyboard.type('12a3');
    await expect(otp).toHaveValue('123');
    const cells = page.locator('#otp ~ .uix-otp__cell');
    await expect(cells).toHaveCount(6);
    await expect(cells.nth(2)).toHaveText('3');
    await expect(cells.nth(3)).toHaveAttribute('data-active', 'true');
    await page.keyboard.press('Backspace');
    await expect(otp).toHaveValue('12');
    await page.keyboard.type('3456789');
    await expect(otp).toHaveValue('123456');
    await expect.poll(() => page.evaluate(() => window.__completed)).toEqual(['123456']);
    // a code with spaces and a dash, pasted into an emptied field
    await otp.fill('');
    await page.evaluate(() => {
      const input = document.getElementById('otp');
      const data = new DataTransfer();
      data.setData('text/plain', ' 000-000 ');
      input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    });
    await expect(otp).toHaveValue('000000');
    await expect.poll(() => page.evaluate(() => window.__completed)).toEqual(['123456', '000000']);
    await expect(page.getByRole('alert')).toHaveText('That code is not valid. Try the newest one.');
    await expect(otp).toHaveAttribute('aria-invalid', 'true');
    const danger = await page.evaluate(() => { const p = document.createElement('i'); p.style.color = 'var(--uix-danger)'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; });
    // polled: the border colour eases in over --uix-dur-fast
    await expect.poll(() => cells.first().evaluate((el) => getComputedStyle(el).borderTopColor)).toBe(danger);
    await axe(page, '#sign-in');
  });

  test('OtpInput alphanumeric upper-cases; cells fit a 320 px phone without sideways scroll', async ({ page }, testInfo) => {
    await open(page, testInfo, 'sign-in');
    await page.getByLabel('Recovery code').focus();
    await page.keyboard.type('ab12-cd34');
    await expect(page.getByLabel('Recovery code')).toHaveValue('AB12CD34');
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    const widths = await page.locator('#otp-alpha ~ .uix-otp__cell').evaluateAll((cells) => cells.map((c) => c.getBoundingClientRect().width));
    for (const w of widths) expect(w).toBeGreaterThanOrEqual(24);
    await expect(page.getByLabel('Code (disabled)')).toBeDisabled();
  });

  test('axe: the sign-in section at rest', async ({ page }, testInfo) => {
    await open(page, testInfo, 'sign-in');
    await axe(page, '#sign-in');
  });
});

test.describe('TimePicker (HAR-1835)', () => {
  test('typing, arrows and the list in a real browser; focus comes back to the field', async ({ page }, testInfo) => {
    await open(page, testInfo, 'times');
    const field = page.getByLabel('Opens at');
    await expect(field).toHaveValue('09:30');
    await field.click();
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowUp');
    await expect(field).toHaveValue('10:00');
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowUp');
    await expect(field).toHaveValue('11:00');
    await field.fill('7');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alert')).toHaveText('Choose 08:00 or later.');
    await field.fill('1715');
    await page.keyboard.press('Tab');
    await expect(field).toHaveValue('17:15');
    await field.focus();
    await page.keyboard.press('Alt+ArrowDown');
    const list = page.getByRole('listbox', { name: 'Times' });
    await expect(list).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await expect(list).toBeHidden();
    await expect(field).toHaveValue('16:30');
    await expect(field).toBeFocused();
  });

  test('en-US shows a 12-hour clock and reads "2:30 pm"', async ({ page }, testInfo) => {
    await open(page, testInfo, 'times');
    const field = page.getByLabel('Quiet hours start (en-US)');
    await field.fill('2:30 pm');
    await page.keyboard.press('Enter');
    await expect(field).toHaveValue(/^2:30\sPM$/);
  });

  test('DateTimePicker uses it: no native time input, the time keeps the label it borrows', async ({ page }, testInfo) => {
    await open(page, testInfo, 'times');
    await expect(page.locator('#times input[type="time"]')).toHaveCount(0);
    const time = page.getByRole('textbox', { name: 'Geplanter Start, time' });
    await expect(time).toHaveValue('14:30');
    await time.focus();
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowDown');
    await expect(time).toHaveValue('14:15');
  });

  test('inside a modal Drawer the list is in the top layer, not clipped; Escape closes only the list', async ({ page }, testInfo) => {
    await open(page, testInfo, 'times');
    await page.locator('#open-time-drawer').click();
    const dialog = page.getByRole('dialog', { name: 'Business calendar' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /Change time/ }).click();
    const list = page.getByRole('listbox', { name: 'Times' });
    await expect(list).toBeFocused();
    const selected = list.getByRole('option', { selected: true });
    await expect(selected).toHaveText('16:00');
    await expect(selected).toBeInViewport();
    // hit-test the chosen row: nothing of the drawer paints over it
    const hit = await selected.evaluate((el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el.contains(top); });
    expect(hit).toBe(true);
    await axe(page, '.uix-time-picker__popover');
    await page.keyboard.press('Escape');
    await expect(list).toBeHidden();
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel('Closes at')).toBeFocused();
  });

  test('a DateTimePicker in a Field: the time is named "<label>, time", without an aria-hidden "*", and follows the label (HAR-2432)', async ({ page }, testInfo) => {
    await open(page, testInfo, 'times');
    // the harness's Field draws its "*" with CSS; an aria-hidden marker inside the label must not count either
    // ... and a label whose text arrives late (a translation loading) renames the time (HAR-2432)
    await page.locator('label[for="due"]').evaluate((label) => {
      label.firstChild.nodeValue = 'Geplanter Beginn';
      const star = document.createElement('span'); star.setAttribute('aria-hidden', 'true'); star.textContent = ' *'; label.append(star);
    });
    await expect(page.getByRole('textbox', { name: 'Geplanter Beginn, time', exact: true })).toBeVisible();
  });

  test('320 px: the fields fit; axe closed', async ({ page }, testInfo) => {
    await open(page, testInfo, 'times');
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await axe(page, '#times');
  });
});

test.describe('FilterPopover date (HAR-2432)', () => {
  test('the filter is the kit DatePicker: its calendar opens inside the filter popover, a day applies as YYYY-MM-DD', async ({ page }, testInfo) => {
    await open(page, testInfo, 'filter-date');
    await page.locator('#filter-date-trigger').click();
    const filter = page.locator('#filter-date-popover');
    await expect(filter).toBeVisible();
    await expect(filter.locator('input[type="date"]')).toHaveCount(0);
    const field = filter.getByRole('textbox', { name: 'Created on or after' });
    await expect(field).toHaveAttribute('placeholder', 'DD.MM.YYYY');
    await field.fill('22.11.2026');
    await page.keyboard.press('Enter');
    await filter.getByRole('button', { name: /^Change date/ }).click();
    const calendar = page.getByRole('dialog', { name: 'Calendar' });
    await expect(calendar).toBeVisible();
    await expect(filter, 'the nested calendar keeps the filter open').toBeVisible();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(calendar).toBeHidden();
    await expect(field).toHaveValue('23.11.2026');
    await axe(page, '#filter-date-popover');
    await filter.getByRole('button', { name: 'Apply' }).click();
    expect(await page.evaluate(() => window.__filter.applied)).toEqual(['2026-11-23']);
  });
});
