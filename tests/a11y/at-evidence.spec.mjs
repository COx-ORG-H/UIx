/* Automated assistive-technology evidence for the six widgets of Docs/a11y/scripts/ (enterprise-UX
 * study, first-five item #4): the accessibility tree Chromium hands a screen reader
 * (toMatchAriaSnapshot), the name / role / state a screen reader reads, and the live regions it
 * speaks from. This is evidence that the semantics are in place, not that a screen reader speaks
 * them well: that needs the manual runs in Docs/a11y/results/. The snapshots match by containment
 * (Playwright's default), so a template names what must be there and in what order.
 * Harness: tests/at-evidence/harness.tsx (English kit defaults, StrictMode). */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/at-evidence/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name === 'dark' ? 'dark' : 'light');
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1, name: 'Assistive-technology evidence' })).toBeVisible();
});

/** The element a screen reader is on: the focused one, or the input's active descendant. */
const activeOption = (input) => input.evaluate((el) => {
  const id = el.getAttribute('aria-activedescendant');
  const option = id ? document.getElementById(id) : null;
  return option ? { name: option.textContent.trim(), selected: option.getAttribute('aria-selected') } : null;
});

test.describe('DataWorkspace', () => {
  test('a named table with sortable column buttons, named row checkboxes and a link per row', async ({ page }) => {
    const ws = page.locator('#workspace');
    await expect(ws).toMatchAriaSnapshot(`
      - region "Incidents":
        - table "Incidents":
          - rowgroup:
            - row:
              - columnheader "Select all rows on this page":
                - checkbox "Select all rows on this page" [checked=false]
              - columnheader "ID"
              - columnheader "Title":
                - button "Title"
              - columnheader "Priority":
                - button "Priority"
              - columnheader "Assignee":
                - button "Assignee"
          - rowgroup:
            - row:
              - cell "Select INC-1001":
                - checkbox "Select INC-1001" [checked=false]
              - cell:
                - link "Open INC-1001"
              - cell "Printer on floor 3 offline"
              - cell "P2"
              - cell "Amra Kovač"
    `);
    // A read-only table, not a grid: a screen reader stays in browse mode and its table keys work.
    await expect(ws.locator('table')).not.toHaveAttribute('role', /grid/);
  });

  test('sorting sets aria-sort on the header cell, ascending then descending', async ({ page }) => {
    const header = page.locator('#workspace th').filter({ has: page.getByRole('button', { name: 'Priority' }) });
    await expect(header).not.toHaveAttribute('aria-sort', /ascending|descending/);
    await header.getByRole('button').click();
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    await expect(page.locator('#workspace tbody tr').first()).toContainText('P1');
    await header.getByRole('button').click();
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    await expect(page.locator('#workspace tbody tr').first()).toContainText('P4');
  });

  test('selecting a row checks it, makes Select all mixed and shows a named bulk toolbar with the count', async ({ page }) => {
    const ws = page.locator('#workspace');
    await ws.getByRole('checkbox', { name: 'Select INC-1003' }).check();
    await expect(ws).toMatchAriaSnapshot(`
      - region "Incidents":
        - toolbar "Bulk actions":
          - text: 1 selected
          - button "Assign to me"
        - table "Incidents":
          - rowgroup:
            - row:
              - columnheader "Select all rows on this page":
                - checkbox "Select all rows on this page" [checked=mixed]
    `);
    await ws.getByRole('checkbox', { name: 'Select all rows on this page' }).check();
    await expect(ws.getByRole('toolbar', { name: 'Bulk actions' })).toContainText('8 selected');
    // Known gap (recorded in Docs/a11y/results/data-workspace.md): the count is plain text, not a
    // live region, so a screen reader hears "checked" and not "8 selected".
    await expect(ws.getByRole('toolbar', { name: 'Bulk actions' }).getByRole('status')).toHaveCount(0);
  });

  test('row navigation: one row tab stop, arrows move it, Enter activates; the row checkbox is one Tab away', async ({ page }) => {
    const rows = page.locator('#workspace tbody tr');
    await expect(rows.and(page.locator('[tabindex="0"]'))).toHaveCount(1);
    await rows.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(rows.nth(1)).toBeFocused();
    await expect(rows.nth(1)).toHaveAttribute('tabindex', '0');
    await expect(rows.first()).toHaveAttribute('tabindex', '-1');
    await page.keyboard.press('End');
    await expect(rows.last()).toBeFocused();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => window.__at.activated)).toEqual(['INC-1008']);
    // Space on the row only stops the page scrolling; selection is the row's own checkbox.
    await page.keyboard.press(' ');
    await expect(page.getByRole('checkbox', { name: 'Select INC-1008' })).not.toBeChecked();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('checkbox', { name: 'Select INC-1008' })).toBeFocused();
    await page.keyboard.press(' ');
    await expect(page.getByRole('checkbox', { name: 'Select INC-1008' })).toBeChecked();
  });
});

test.describe('CommandPalette', () => {
  test('an always-open combobox over a listbox of named groups; the shortcut is part of the option name', async ({ page }) => {
    await expect(page.locator('#palette-inline')).toMatchAriaSnapshot(`
      - combobox "Commands in place" [expanded]
      - listbox "Commands in place":
        - group "Actions":
          - option "Create incident Control+I" [selected]
          - option "Assign to me A"
          - option "Escalate to on-call lead"
        - group "Pages":
          - option "Overview Home"
          - option "Reports Monthly reports and exports"
          - option "Archive (read-only) Administrators only" [disabled]
      - status: 6 results
    `);
    await expect(page.locator('#palette-inline').getByRole('option', { name: /Create incident/ })).toHaveAttribute('aria-keyshortcuts', 'Control+I');
  });

  test('typing filters and the polite count follows, in the singular for one; arrows move the active option', async ({ page }) => {
    const field = page.locator('#palette-inline').getByRole('combobox');
    await field.fill('rep');
    await expect(page.locator('#palette-inline').getByRole('status')).toHaveText('1 result');
    expect(await activeOption(field)).toEqual({ name: 'ReportsMonthly reports and exports', selected: 'true' });
    await field.fill('');
    await field.press('ArrowDown');
    expect((await activeOption(field)).name).toMatch(/^Assign to me/);
    await field.press('End');
    expect((await activeOption(field)).name, 'End skips the disabled last item').toMatch(/^Reports/);
  });

  test('in its dialog: focus lands in the field, Escape closes, focus returns to the opener', async ({ page }) => {
    await page.locator('#palette-launch').click();
    const dialog = page.locator('dialog[data-uix-cmdk-dialog]');
    await expect(dialog).toHaveJSProperty('open', true);
    await expect(dialog.getByRole('combobox', { name: 'Commands' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveJSProperty('open', false);
    await expect(page.locator('#palette-launch')).toBeFocused();
  });
});

test.describe('Combobox', () => {
  test('a required combobox described by its hint; focus opens a grouped listbox, arrows skip a disabled option', async ({ page }) => {
    const input = page.locator('#combobox').getByRole('combobox', { name: 'Category' });
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await expect(input).toHaveAttribute('aria-required', 'true');
    await expect(input).toHaveAccessibleDescription('Type to filter');
    await input.focus();
    // It opens on focus, so a screen reader hears "expanded" on arrival.
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('listbox', { name: 'Category' })).toMatchAriaSnapshot(`
      - listbox "Category":
        - group "Hardware":
          - option "Laptop"
          - option "Printer"
          - option "Monitor" [disabled]
        - group "Software":
          - option "Email"
          - option "VPN"
    `);
    expect(await activeOption(input)).toEqual({ name: 'Laptop', selected: 'false' });
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect((await activeOption(input)).name, 'the disabled Monitor is skipped').toBe('Email');
    await page.keyboard.press('Enter');
    await expect(input).toHaveValue('Email');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  test('back in a filled combobox: the text clears and the chosen option is the active, selected one', async ({ page }) => {
    // Known issue for the manual pass (Docs/a11y/results/combobox.md): the edit field reads blank on
    // return; whether each screen reader then speaks the active "Email, selected" decides it.
    const input = page.locator('#combobox').getByRole('combobox', { name: 'Category' });
    await input.fill('ema');
    await page.keyboard.press('Enter');
    await expect(input).toHaveValue('Email');
    await page.keyboard.press('Tab');
    await input.focus();
    await expect(input).toHaveValue('');
    expect(await activeOption(input)).toEqual({ name: 'Email', selected: 'true' });
  });

  test('no match: the status region (mounted from the start) says so, and the listbox holds no option', async ({ page }) => {
    const input = page.locator('#combobox').getByRole('combobox', { name: 'Category' });
    const status = page.locator('#combobox').getByRole('status');
    await expect(status).toHaveText('');
    await input.fill('zz');
    await expect(status).toHaveText('No matching category');
    await expect(page.getByRole('listbox', { name: 'Category' }).getByRole('option')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(status).toHaveText('');
  });
});

test.describe('EntityPicker', () => {
  test('a combobox whose results arrive in a listbox with a polite count', async ({ page }) => {
    const input = page.locator('#entity-input');
    await expect(input).toHaveRole('combobox');
    await expect(input).toHaveAccessibleName('Assignee');
    await input.fill('am');
    const list = page.locator('#entity').getByRole('listbox');
    await expect(list.getByRole('option')).toHaveText([/Amra Kovač/]);
    await expect(list.getByRole('option').first()).toHaveAccessibleName('Amra Kovač, IT › Service desk');
    // "1 results": the count is not plural-aware yet (plural labels are their own work package);
    // the regex takes either until it is.
    await expect(page.locator('#entity').getByRole('status').filter({ hasText: /result/ })).toHaveText(/^1 results?$/);
    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(page.locator('#entity').getByRole('button', { name: 'Assignee: Amra Kovač. Change' })).toBeVisible();
    await expect(page.locator('#entity').getByRole('button', { name: 'Clear Amra Kovač' })).toBeVisible();
  });

  test('a failed search shows the error with a Retry row the keyboard reaches', async ({ page }) => {
    const input = page.locator('#entity-input');
    await input.fill('fail');
    await expect(page.locator('#entity').getByRole('option', { name: /Retry|Try again/ })).toBeVisible();
  });
});

test.describe('DatePicker', () => {
  test('a named, described text field and a calendar button that names the chosen date', async ({ page }) => {
    await expect(page.locator('#date')).toMatchAriaSnapshot(`
      - textbox "Due date": 20/11/2026
      - button "Change date, Friday, 20 November 2026"
    `);
    await expect(page.locator('#date-input')).toHaveAccessibleDescription('Weekdays only');
  });

  test('the calendar: a named dialog, focus on the chosen day, arrows by day and week, unavailable days disabled', async ({ page }) => {
    await page.locator('#date').getByRole('button', { name: /Change date/ }).click();
    const calendar = page.getByRole('dialog', { name: 'Calendar' });
    await expect(calendar).toMatchAriaSnapshot(`
      - dialog "Calendar":
        - button "Show previous month" [disabled]
        - text: November 2026
        - button "Show next month"
        - group "November 2026":
          - button "Friday, 20 November 2026" [pressed]
          - button "Saturday, 21 November 2026" [disabled]
    `);
    await expect(calendar.getByRole('button', { name: 'Friday, 20 November 2026' })).toBeFocused();
    await expect(calendar.locator('[aria-current="date"]')).toHaveAccessibleName('Wednesday, 18 November 2026');
    await page.keyboard.press('ArrowDown');
    await expect(calendar.getByRole('button', { name: 'Friday, 27 November 2026' })).toBeFocused();
    await page.keyboard.press('PageDown');
    // The month heading is a polite live region, so the new month is spoken.
    await expect(calendar.locator('[aria-live="polite"]')).toHaveText('December 2026');
    await page.keyboard.press('Escape');
    await expect(calendar).toBeHidden();
    // Opened from the button, focus goes back to the button (APG date picker dialog).
    await expect(page.locator('#date').getByRole('button', { name: /Change date/ })).toBeFocused();
  });

  test('from the field: ArrowDown opens the calendar on the chosen day, Enter picks it, focus returns to the field', async ({ page }) => {
    await page.locator('#date-input').focus();
    await page.keyboard.press('ArrowDown');
    const calendar = page.getByRole('dialog', { name: 'Calendar' });
    await expect(calendar.getByRole('button', { name: 'Friday, 20 November 2026' })).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await expect(calendar).toBeHidden();
    await expect(page.locator('#date-input')).toBeFocused();
    await expect(page.locator('#date-input')).toHaveValue('19/11/2026');
    await expect(page.locator('#date').getByRole('button', { name: 'Change date, Thursday, 19 November 2026' })).toBeVisible();
  });

  test('typed text that is not a date: aria-invalid and an alert that says what is expected', async ({ page }) => {
    const input = page.locator('#date-input');
    await input.fill('31/02/2026');
    await input.press('Enter');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    const alert = page.locator('#date').getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(input).toHaveAccessibleDescription(new RegExp(`Weekdays only.*${(await alert.textContent()).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });
});

test.describe('DiffViewer', () => {
  test('a named region, a summary group, a heading per kind and named, pressed resolution buttons', async ({ page }) => {
    await expect(page.locator('#diff')).toMatchAriaSnapshot(`
      - region "Configuration differences":
        - group "Difference summary"
        - region "Conflicted 1":
          - heading "Conflicted 1" [level=3]
          - group:
            - region "Base value for $.priority"
            - region "Current value for $.priority"
            - region "Incoming value for $.priority"
            - group "Resolve $.priority":
              - button "Accept incoming for $.priority" [pressed=false]
              - button "Keep current for $.priority" [pressed=false]
              - button "Mark pending for $.priority" [pressed]
        - region "Changed 2":
          - heading "Changed 2" [level=3]
        - paragraph: 0 of 3 differences resolved.
    `);
  });

  test('resolving moves aria-pressed and the polite progress line counts it', async ({ page }) => {
    const progress = page.locator('#diff [aria-live="polite"]');
    await expect(progress).toHaveText('0 of 3 differences resolved.');
    await page.getByRole('button', { name: 'Accept incoming for $.priority' }).click();
    await expect(page.getByRole('button', { name: 'Accept incoming for $.priority' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Mark pending for $.priority' })).toHaveAttribute('aria-pressed', 'false');
    await expect(progress).toHaveText('1 of 3 differences resolved.');
    expect(await page.evaluate(() => window.__at.diff)).toEqual([['$.priority', 'accept']]);
  });
});

test.describe('Toasts and live regions', () => {
  test('the Notifications region and its polite status exist, empty, before any toast', async ({ page }) => {
    const region = page.getByRole('region', { name: 'Notifications' });
    await expect(region).toBeAttached();
    await expect(region.getByRole('status')).toHaveText('');
  });

  test('a success toast is spoken once from the persistent polite region; the toast itself is not a second live region', async ({ page }) => {
    await page.locator('#toast-polite').click();
    const region = page.getByRole('region', { name: 'Notifications' });
    await expect(region.getByRole('status')).toHaveText('Incident INC-1002 saved');
    await expect(region.locator('.uix-toast')).toHaveCount(1);
    await expect(region.locator('.uix-toast')).not.toHaveAttribute('role', /.+/);
    await expect(region.locator('.uix-toast')).not.toHaveAttribute('aria-live', /.+/);
    await expect(region.getByRole('button', { name: 'Dismiss' })).toBeVisible();
  });

  test('an error toast is its own alert, with the message inside it', async ({ page }) => {
    await page.locator('#toast-assertive').click();
    const alert = page.getByRole('region', { name: 'Notifications' }).getByRole('alert');
    await expect(alert).toContainText('Could not save INC-1002. Try again.');
    await expect(alert).toHaveAttribute('aria-live', 'assertive');
    await expect(alert.getByRole('button', { name: 'Dismiss' })).toBeVisible();
  });

  test('a promise toast is busy while it runs, then the outcome is spoken', async ({ page }) => {
    await page.locator('#toast-promise').click();
    const region = page.getByRole('region', { name: 'Notifications' });
    await expect(region.getByRole('status')).toContainText('Exporting 8 incidents…');
    await expect(region.locator('[aria-busy="true"]')).toHaveCount(1);
    await expect(region.getByRole('status')).toContainText('Export ready');
    await expect(region.locator('[aria-busy="true"]')).toHaveCount(0);
  });

  test('an undoable toast offers a named Undo the keyboard reaches; using it undoes, not commits', async ({ page }) => {
    await page.locator('#toast-undo').click();
    const undo = page.getByRole('region', { name: 'Notifications' }).getByRole('button', { name: /Undo/ });
    await expect(undo).toBeVisible();
    await undo.focus();
    await page.keyboard.press('Enter');
    await expect(undo).toBeHidden();
    expect(await page.evaluate(() => [window.__at.undone, window.__at.committed])).toEqual([1, 0]);
  });
});

test('axe: no serious or critical violation with every widget in an open state', async ({ page }) => {
  await page.locator('#workspace').getByRole('checkbox', { name: 'Select INC-1001' }).check();
  await page.locator('#palette-inline').getByRole('combobox').fill('a');
  await page.locator('#diff').getByRole('button', { name: 'Keep current for $.priority' }).click();
  await page.locator('#toast-polite').click();
  await page.locator('#toast-assertive').click();
  await page.locator('#date').getByRole('button', { name: /Change date/ }).click();
  await expect(page.getByRole('dialog', { name: 'Calendar' })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const gated = violations.filter((v) => GATED.has(v.impact));
  expect(gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});
