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
    // `toggle` is queued after the attribute changes, and the choice is stored in its handler: poll
    await expect.poll(() => page.evaluate(() => localStorage.getItem('uix:collapsible:gaps-details'))).toBe('0');
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

// ── Chip (HAR-1632) ──────────────────────────────────────────────────────────
test.describe('Chip: a filter chip that anchors its editor by ref, and link chips', () => {
  test('the body button carries the popup attributes, the editor is placed against it, and focus returns to it', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const body = page.locator('#status-chip');
    await expect(body).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(body).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('button', { name: 'Status: Offen entfernen' }), 'the × is named from UixLabelsProvider').toBeVisible();
    await body.click();
    const editor = page.getByRole('dialog', { name: 'Status filter' });
    await expect(editor).toBeVisible();
    await expect(body).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => editor.evaluate((el) => el.getAnimations().length)).toBe(0);
    const gap = await page.evaluate(() => {
      const chip = document.getElementById('status-chip').getBoundingClientRect();
      const pop = document.getElementById('status-editor').getBoundingClientRect();
      return { below: pop.top - chip.bottom, left: pop.left - chip.left };
    });
    expect(Math.round(gap.below), 'anchored to the body button the ref points at').toBe(6);
    expect(Math.abs(gap.left)).toBeLessThanOrEqual(1);
    await page.locator('#status-apply').click();
    await expect(editor).toBeHidden();
    await expect(body, 'focus is back on the chip, without a DOM lookup').toBeFocused();
    expect(await axe(page, '#chips')).toEqual([]);
  });

  test('a current link chip has aria-current and the same filled look as a pressed chip', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const nav = page.getByRole('navigation', { name: 'Record types' });
    const current = nav.getByRole('link', { name: 'Incidents' });
    await expect(current).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Changes' })).not.toHaveAttribute('aria-current', 'page');
    const look = (locator) => locator.evaluate((el) => { const s = getComputedStyle(el); return `${s.backgroundColor} ${s.borderColor} ${s.color}`; });
    expect(await look(current)).toBe(await look(nav.getByRole('button', { name: 'Mine' })));
    expect(await look(current)).not.toBe(await look(nav.getByRole('link', { name: 'Changes' })));
  });
});

// ── FileUpload and Attachment (HAR-1630) ─────────────────────────────────────
test.describe('FileUpload and Attachment in a narrow rail', () => {
  test('an 80-character file name does not widen the upload zone or the attachment list past a 288 px rail', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const widths = (rail) => page.locator(rail).evaluate((el) => ({
      rail: el.getBoundingClientRect().width,
      scroll: el.scrollWidth,
      client: el.clientWidth,
      widest: Math.max(...[...el.querySelectorAll('*')].map((node) => node.getBoundingClientRect().right)) - el.getBoundingClientRect().left,
    }));
    for (const rail of ['#upload-rail', '#attachment-rail']) {
      const w = await widths(rail);
      expect(Math.round(w.rail), `${rail} is the 288 px rail`).toBe(288);
      expect(w.scroll, `${rail}: nothing scrolls sideways`).toBeLessThanOrEqual(w.client);
      expect(w.widest, `${rail}: no descendant sticks out`).toBeLessThanOrEqual(288.5);
    }
    // the long name is all there (wrapped, not clipped away)
    const name = page.locator('#upload-rail .uix-file-upload__name').first();
    expect((await name.textContent()).length).toBe(80);
    expect(await name.evaluate((el) => el.getBoundingClientRect().height > parseFloat(getComputedStyle(el).lineHeight) * 1.5), 'the name wraps onto more lines').toBe(true);
  });

  test('a rejected file with a long name: the message wraps inside the rail too', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const longTxt = `${'x'.repeat(76)}.txt`;
    await page.locator('#upload-rail input[type="file"]').setInputFiles({ name: longTxt, mimeType: 'text/plain', buffer: Buffer.from('x') });
    const errors = page.locator('#upload-rail .uix-file-upload__errors');
    await expect(errors).toContainText(longTxt);
    const w = await page.locator('#upload-rail').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth, width: el.getBoundingClientRect().width }));
    expect(Math.round(w.width)).toBe(288);
    expect(w.scroll).toBeLessThanOrEqual(w.client);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('sizes are counted in 1024s where asked, and the rail passes axe', async ({ page }, testInfo) => {
    await open(page, testInfo);
    await expect(page.locator('#upload-rail .uix-file-upload__meta').first()).toContainText('2.3 MB');
    await expect(page.locator('#attachment-rail .uix-attachment__size').first()).toHaveText('2.3 MB');
    await expect(page.locator('#attachment-rail').getByRole('link', { name: /^Download Quartalsbericht/ })).toBeVisible();
    expect(await axe(page, '#files')).toEqual([]);
  });
});

// ── Alert, Note, StatusPill, PromptDialog, Popover (HAR-1614) ────────────────
test.describe('Callouts and dialogs', () => {
  test('Alert at 320 px: a long title wraps in a column that fills the row; actions and × keep their size', async ({ page }, testInfo) => {
    await open(page, testInfo);
    await page.setViewportSize({ width: 320, height: 800 });
    const m = await page.locator('#announcement').evaluate((el) => {
      const box = (node) => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; };
      const title = el.querySelector('.uix-alert__title');
      return {
        alert: box(el), content: box(el.querySelector('.uix-alert__content')), actions: box(el.querySelector('.uix-alert__actions')),
        dismiss: box(el.querySelector('.uix-alert__dismiss')), titleLines: title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight),
        scroll: el.scrollWidth, client: el.clientWidth,
      };
    });
    expect(m.scroll, 'nothing overflows the alert').toBeLessThanOrEqual(m.client);
    expect(m.titleLines, 'the title wraps').toBeGreaterThan(1.5);
    expect(m.content.right).toBeLessThanOrEqual(m.actions.left + 0.5);
    expect(m.actions.right).toBeLessThanOrEqual(m.dismiss.left + 0.5);
    expect(m.dismiss.right).toBeLessThanOrEqual(m.alert.right);
    expect(Math.round(m.dismiss.width), 'the × is not squeezed').toBe(24);
    expect(m.content.width, 'the text column takes the free width').toBeGreaterThan(120);
    // a title with an unbreakable 80-character word still stays inside
    const unbroken = await page.locator('#unbroken').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(unbroken.scroll).toBeLessThanOrEqual(unbroken.client);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('Alert dismiss, actions and ref', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const alert = page.locator('#announcement');
    await expect(alert.getByRole('button', { name: 'Details' })).toBeVisible();
    await alert.getByRole('button', { name: 'Hinweis ausblenden' }).click();
    await expect(alert).toHaveCount(0);
    await page.locator('#focus-error').click();
    await expect(page.locator('#form-error'), 'the forwarded ref lets a form focus its error').toBeFocused();
    expect(await axe(page, '#callouts')).toEqual([]);
  });

  test('StatusPill sizes: sm is smaller and lg larger than the default, which is unchanged', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const size = (id) => page.locator(id).evaluate((el) => {
      const r = el.getBoundingClientRect();
      const dot = el.querySelector('.uix-pill__dot').getBoundingClientRect();
      return { height: r.height, font: parseFloat(getComputedStyle(el).fontSize), dot: dot.width };
    });
    const [sm, md, lg] = [await size('#pill-sm'), await size('#pill-md'), await size('#pill-lg')];
    expect(md.font, 'default: --uix-text-meta').toBeCloseTo(12.5, 1);
    expect(Math.round(md.dot)).toBe(7);
    expect(sm.font).toBeLessThan(md.font);
    expect(sm.height).toBeLessThan(md.height);
    expect(lg.font).toBeGreaterThan(md.font);
    expect(lg.height).toBeGreaterThan(md.height);
    expect(lg.dot).toBeGreaterThan(md.dot);
  });

  test('PromptDialog: a destructive multi-line prompt validates, shows a server error, and submits', async ({ page }, testInfo) => {
    await open(page, testInfo);
    await page.locator('#force-import').click();
    const dialog = page.getByRole('alertdialog', { name: 'Force the SAP import' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleDescription('The existing record is overwritten and the collision is closed.');
    const reason = dialog.getByRole('textbox', { name: 'Reason' });
    await expect(reason).toBeFocused();
    expect(await reason.evaluate((el) => el.tagName)).toBe('TEXTAREA');
    const submit = dialog.getByRole('button', { name: 'Import anyway' });
    await expect(submit).toHaveClass(/uix-btn--danger/);
    expect(await axe(page, 'dialog[open]')).toEqual([]);

    await submit.click();
    await expect(dialog.getByRole('alert')).toHaveText('Give a reason.');
    await reason.fill('fail once');
    await page.keyboard.press('Enter');
    await expect(reason, 'Enter adds a line in the textarea').toHaveValue('fail once\n');
    await page.keyboard.press('Control+Enter');
    await expect(dialog.getByRole('alert')).toHaveText('The import service did not answer.');
    await expect(dialog, 'a failed submit leaves the dialog open').toBeVisible();
    await reason.fill('Duplicate of SAP 4711,\nchecked with the owner.');
    await submit.click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('#import-reason')).toHaveText('Duplicate of SAP 4711, checked with the owner.');
  });

  test('Popover openOnHover: the card follows the pointer onto itself, and keyboard focus opens it too', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const anchor = page.locator('#user-chip');
    const card = page.locator('#user-card');
    await anchor.scrollIntoViewIfNeeded();
    await expect(card).toBeHidden();
    await anchor.hover();
    await expect(card).toBeVisible();
    await expect.poll(() => card.evaluate((el) => el.getAnimations().length)).toBe(0);
    // travel from the anchor into the card: it stays open and its link can be reached
    await page.locator('#user-profile').hover();
    await page.waitForTimeout(400);
    await expect(card, 'the pointer is on the card').toBeVisible();
    // leave both
    await page.locator('#hover h2').hover();
    await expect(card).toBeHidden();

    // keyboard: focus opens it, Tab reaches the link inside, Escape closes and returns focus
    await anchor.focus();
    await expect(card).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator('#user-profile')).toBeFocused();
    await expect(card).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
    await expect(anchor).toBeFocused();
    await page.waitForTimeout(400);
    await expect(card, 'returning focus does not reopen it').toBeHidden();
    // and it closes when focus moves on
    await page.locator('#hover-next').focus();
    await anchor.focus();
    await expect(card).toBeVisible();
    await page.locator('#hover-next').focus();
    await expect(card).toBeHidden();
  });
});

// ── Spinner, Meter, Heartbeat (HAR-1606) ─────────────────────────────────────
test.describe('Loading and progress', () => {
  /**
   * WCAG contrast of the meter fill against its track, as painted: the page, the track and the
   * fill are composited on a canvas, which resolves any computed colour syntax (rgb(), color(srgb …))
   * and any alpha.
   */
  const contrast = (page, id) => page.locator(id).evaluate((meter) => {
    const paint = (...colours) => {
      const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
      for (const colour of colours) { ctx.fillStyle = colour; ctx.fillRect(0, 0, 1, 1); }
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const lum = (rgb) => { const [r, g, b] = rgb.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const page = getComputedStyle(document.body).backgroundColor;
    const track = getComputedStyle(meter).backgroundColor;
    const fill = getComputedStyle(meter.querySelector('.uix-meter__fill')).backgroundColor;
    const [a, b] = [lum(paint(page, track, fill)), lum(paint(page, track))];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });

  test('Spinner sm is 16 px with the 2 px stroke; md and lg are unchanged', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const box = (id) => page.locator(id).evaluate((el) => ({ w: el.offsetWidth, h: el.offsetHeight, stroke: getComputedStyle(el).borderTopWidth }));
    expect(await box('#spinner-sm')).toEqual({ w: 16, h: 16, stroke: '2px' });
    expect(await box('#spinner-md')).toEqual({ w: 20, h: 20, stroke: '2px' });
    expect(await box('#spinner-lg')).toEqual({ w: 32, h: 32, stroke: '3px' });
    // role="status" is not named by its content: the text is what the live region announces
    await expect(page.locator('#spinner-sm')).toHaveAttribute('role', 'status');
    await expect(page.locator('#spinner-sm .uix-visually-hidden')).toHaveText('Uploading');
  });

  test('Meter neutral and accent fills clear 3:1 against the track, and are not the status green', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const colours = (id) => page.locator(id).evaluate((el) => ({ track: getComputedStyle(el).backgroundColor, fill: getComputedStyle(el.querySelector('.uix-meter__fill')).backgroundColor }));
    const success = await colours('#meter-default');
    for (const id of ['#meter-neutral', '#meter-accent']) {
      const c = await colours(id);
      expect(c.fill, `${id} is not the success fill`).not.toBe(success.fill);
      expect(await contrast(page, id), `${id} fill against its track`).toBeGreaterThanOrEqual(3);
      await expect(page.locator(id)).not.toHaveAttribute('aria-valuetext', /./);
    }
  });

  test('Heartbeat: decorative beside its text, named when alone, and the ring stops under reduced motion', async ({ page }, testInfo) => {
    await open(page, testInfo);
    await expect(page.locator('#live .uix-heartbeat')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('img', { name: 'Connection lost' })).toBeVisible();
    const ping = (id) => page.locator(`${id} .uix-heartbeat__ping`).evaluate((el) => {
      const s = getComputedStyle(el);
      return { display: s.display, running: el.getAnimations().filter((a) => a.playState === 'running').length, bg: s.backgroundColor };
    });
    expect((await ping('#live')).running, 'the live ring pulses').toBe(1);
    expect((await ping('#idle')).display, 'idle has no ring').toBe('none');
    expect((await ping('#warn')).bg).not.toBe((await ping('#live')).bg);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'networkidle' });
    await expect.poll(async () => (await ping('#live')).running, { message: 'under prefers-reduced-motion nothing keeps pulsing' }).toBe(0);
    await expect(page.locator('#live .uix-heartbeat__dot')).toBeVisible();
    expect(await axe(page, '#loading')).toEqual([]);
  });
});

// ── ViewMenu density (HAR-1601) ──────────────────────────────────────────────
test.describe('ViewMenu density options at 304 px', () => {
  /** For every option: its label text, and the number of line boxes each WORD of it occupies. */
  const wordLines = (page, menu) => page.locator(`${menu} .uix-segmented__option`).evaluateAll((options) => options.map((option) => {
    const node = [...option.childNodes].find((n) => n.nodeType === Node.TEXT_NODE) ?? option.firstChild;
    const text = node.textContent;
    const words = [];
    for (const match of text.matchAll(/\S+/g)) {
      const range = document.createRange();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      words.push({ word: match[0], lines: new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size });
    }
    const r = option.getBoundingClientRect();
    return { text, words, width: r.width, top: Math.round(r.top), overflow: option.scrollWidth > option.clientWidth + 1 };
  }));

  test('"Kompakt", "Standard", "Großzügig": no label is broken inside a word, and the three share one row', async ({ page }, testInfo) => {
    await open(page, testInfo);
    await page.setViewportSize({ width: 320, height: 700 });
    const panel = await page.locator('.vm-german').evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.round(panel)).toBe(304);
    const options = await wordLines(page, '.vm-german');
    expect(options.map((o) => o.text)).toEqual(['Kompakt', 'Standard', 'Großzügig']);
    for (const option of options) {
      for (const word of option.words) expect(word.lines, `"${word.word}" is on one line`).toBe(1);
      expect(option.overflow, `"${option.text}" fits its option`).toBe(false);
    }
    expect(new Set(options.map((o) => o.top)).size, 'one row').toBe(1);
    const group = page.locator('.vm-german .uix-segmented');
    expect(await group.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });

  test('labels too long for one row wrap as whole options, never inside a word', async ({ page }, testInfo) => {
    await open(page, testInfo);
    await page.setViewportSize({ width: 320, height: 700 });
    const options = await wordLines(page, '.vm-long');
    for (const option of options) {
      for (const word of option.words) expect(word.lines, `"${word.word}" is on one line`).toBe(1);
      expect(option.overflow).toBe(false);
    }
    expect(new Set(options.map((o) => o.top)).size, 'more than one row').toBeGreaterThan(1);
    expect(await page.locator('.vm-long').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });

  test('the density options are still one control: one tab stop, arrows change the choice', async ({ page }, testInfo) => {
    await open(page, testInfo);
    const group = page.locator('.vm-german .uix-segmented');
    await expect(group).toHaveAttribute('role', 'group');
    expect(await group.locator('button[tabindex="0"]').count()).toBe(1);
    await group.getByRole('button', { name: 'Standard' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(group.getByRole('button', { name: 'Großzügig' })).toHaveAttribute('aria-pressed', 'true');
    await expect(group.getByRole('button', { name: 'Großzügig' })).toBeFocused();
    expect(await axe(page, '#view-menu')).toEqual([]);
  });
});
