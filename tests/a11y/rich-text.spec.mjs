/* Rich-text editor, emoji picker, reaction bar and markdown viewer in a real browser (RTE-01).
 *
 * The harness (tests/rich-text/harness.tsx) is bundled from source in globalSetup, so this
 * needs only the tokens build (like the rest of the a11y job). Runs in both theme projects:
 * axe is gated on serious/critical like tests/a11y/a11y.spec.mjs, and the keyboard, input
 * rule, composer, viewer-corpus and narrow-screen checks run once per theme.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { MARKDOWN_CORPUS } from '../../packages/react/src/fixtures/markdown-corpus.mjs';

// A live editor, lazy emoji data and several axe passes per test: allow for a loaded CI runner.
test.setTimeout(60_000);

const HARNESS = '/tests/rich-text/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); localStorage.removeItem('uix-emoji-recent'); } catch { /* private mode */ }
  }, theme);
  const external = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== 'localhost') external.push(request.url());
  });
  testInfo.external = external;
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#field.ProseMirror')).toBeVisible();
});

test.afterEach(async ({}, testInfo) => {
  expect(testInfo.external, 'no request leaves the origin').toEqual([]);
});

/** Put the caret at the end of an editor's first paragraph (or of the document), deterministically,
 * and resolve only once the editor has focus with the browser's caret there. TipTap's focus()
 * command defers view.focus() to a requestAnimationFrame, so keystrokes sent straight after it
 * were dropped on a loaded CI runner ("✅ Now." arrived as "✅w."): focus synchronously, then
 * wait for the state typing actually depends on. */
const caretAtEnd = async (page, id, { firstParagraph = false } = {}) => {
  const pos = await page.evaluate(({ editorId, first }) => {
    const editor = document.getElementById(editorId).editor;
    const { doc } = editor.state;
    let at = doc.content.size - 1;
    if (first) {
      doc.descendants((node, offset) => {
        if (node.type.name === 'paragraph' && at === doc.content.size - 1) { at = offset + node.nodeSize - 1; return false; }
        return true;
      });
    }
    editor.chain().setTextSelection(at).run();
    editor.view.focus();
    return at;
  }, { editorId: id, first: firstParagraph });
  await expect(page.locator(`#${id}`)).toBeFocused();
  await expect.poll(() => page.evaluate((editorId) => {
    const { view, state } = document.getElementById(editorId).editor;
    const sel = document.getSelection();
    if (!sel.isCollapsed || !view.dom.contains(sel.anchorNode)) return null;
    return { state: state.selection.from, dom: view.posAtDOM(sel.anchorNode, sel.anchorOffset) };
  }, id), `caret at ${pos} in #${id}`).toEqual({ state: pos, dom: pos });
};

const changes = (page, key) => page.evaluate((k) => window.__rte.changes[k] ?? [], key);
/** The editor's latest emitted markdown: onChange lands after the keystroke's transaction, so poll it. */
const lastChange = (page, key) => expect.poll(async () => (await changes(page, key)).at(-1));
const axe = async (page, testInfo, include, label) => {
  const { violations } = await new AxeBuilder({ page })
    .include(include)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  await testInfo.attach(`axe-${label}.json`, { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
  const gated = violations.filter((v) => GATED.has(v.impact));
  const summary = gated.map((v) => `[${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`).join('\n');
  expect(gated, `${label} [${testInfo.project.name}]:\n${summary}`).toEqual([]);
};

/** Axe measures colours as painted: wait until a popover's enter fade has finished. */
const settled = (locator) => expect.poll(() => locator.evaluate((el) => el.getAnimations().length)).toBe(0);

test('axe: editors, viewer and reactions at rest', async ({ page }, testInfo) => {
  await axe(page, testInfo, '#root', 'rest');
});

test('axe: open emoji picker, link dialog, suggestions and source mode', async ({ page }, testInfo) => {
  await page.locator('#standalone-picker').click();
  const dialog = page.getByRole('dialog', { name: 'Emoji auswählen' });
  await expect(dialog.getByRole('heading', { name: 'Smileys & Emotionen' })).toBeVisible();
  await settled(dialog);
  await axe(page, testInfo, '[role="dialog"]:popover-open', 'picker');
  await page.keyboard.press('Escape');

  const field = page.locator('#field');
  await field.click();
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByRole('dialog', { name: 'Link' })).toBeVisible();
  await settled(page.getByRole('dialog', { name: 'Link' }));
  await axe(page, testInfo, '[role="dialog"]:popover-open', 'link-dialog');
  await page.keyboard.press('Escape');

  await page.locator('#note').click();
  await page.keyboard.type(':rock');
  await expect(page.getByRole('listbox', { name: 'Emoji suggestions' })).toBeVisible();
  await axe(page, testInfo, '.uix-rich-text--composer', 'suggestions');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Show markdown' }).first().click();
  await expect(page.locator('textarea#field')).toBeVisible();
  await axe(page, testInfo, '#root', 'source-mode');
});

test('no onChange on mount; typing emits markdown that keeps untouched blocks', async ({ page }) => {
  expect(await changes(page, 'field')).toEqual([]);
  expect(await changes(page, 'template')).toEqual([]);
  const before = await page.getByTestId('field-value').textContent();
  await caretAtEnd(page, 'field', { firstParagraph: true });
  await page.keyboard.type(' Now.');
  // onChange arrives after the last keystroke's transaction, not synchronously with
  // keyboard.type(): wait for it rather than reading once (it raced on a loaded CI runner).
  const expected = before.replace('✅', '✅ Now.');
  await lastChange(page, 'field').toBe(expected);
  await expect(page.locator('input[type="hidden"][name="description"]')).toHaveValue(expected);
});

test('toolbar: one tab stop, arrow keys, Home/End, pressed state', async ({ page }) => {
  const toolbar = page.getByRole('toolbar', { name: 'Formatting' }).first();
  const tabbable = toolbar.locator('button[tabindex="0"]');
  await expect(tabbable).toHaveCount(1);
  await page.locator('#field-hint').click();
  // The toolbar comes before the editor: one Tab from the description text reaches it.
  await page.keyboard.press('Tab');
  await expect(toolbar.getByRole('button', { name: 'Heading 1' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(toolbar.getByRole('button', { name: 'Heading 2' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(toolbar.getByRole('button', { name: /^Show markdown/ })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(toolbar.getByRole('button', { name: 'Heading 1' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(toolbar.getByRole('button', { name: /^Show markdown/ })).toBeFocused();
  // Tab leaves the toolbar for the editing surface.
  await page.keyboard.press('Tab');
  await expect(page.locator('#field')).toBeFocused();

  await caretAtEnd(page, 'field', { firstParagraph: true });
  await page.keyboard.press('ControlOrMeta+b');
  await expect(toolbar.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.type('loud');
  await lastChange(page, 'field').toContain('✅**loud**');
});

test('markdown input rules and headingLevels', async ({ page }) => {
  await caretAtEnd(page, 'field');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('## Risks');
  await page.keyboard.press('Enter');
  await page.keyboard.type('- first');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('> quoted');
  await lastChange(page, 'field').toContain('\n\n## Risks\n\n- first\n\n> quoted');
  const md = (await changes(page, 'field')).at(-1);
  expect(md.startsWith('# Change plan\n\nDeploy the **ledger** fix')).toBe(true);

  // The template editor offers H3 only: "## " stays text there.
  const template = page.locator('#template');
  await expect(page.locator('section').filter({ has: template }).getByRole('toolbar').getByRole('button', { name: /^Heading/ })).toHaveCount(1);
  await caretAtEnd(page, 'template');
  await page.keyboard.press('Enter');
  await page.keyboard.type('## Not a heading');
  await expect(template.locator('h2')).toHaveCount(0);
  await lastChange(page, 'template').toContain('Not a heading');
  const out = (await changes(page, 'template')).at(-1);
  expect(out.startsWith('Hello {{customer.name}},\n\nyour ticket {{ticket.id}} is resolved.')).toBe(true);
});

test('emoji: toolbar picker by keyboard, :shortcode suggestions, Unicode storage', async ({ page }) => {
  await caretAtEnd(page, 'field');
  const emojiButton = page.getByRole('toolbar').first().getByRole('button', { name: 'Emoji' });
  await emojiButton.focus();
  await page.keyboard.press('Enter');
  const search = page.getByRole('searchbox', { name: 'Search emoji' });
  await expect(search).toBeFocused();
  await page.keyboard.type('rocket');
  const results = page.getByRole('dialog', { name: 'Choose an emoji' }).locator('.uix-emoji-picker__btn');
  await expect(page.getByRole('button', { name: 'rocket', exact: true })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(results.first()).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(results.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(results.first()).toBeFocused();
  const glyph = await results.first().textContent();
  await page.keyboard.press('Enter');
  await expect(search).toBeHidden();
  await expect(page.locator('#field')).toBeFocused();
  await lastChange(page, 'field').toContain(glyph);

  const note = page.locator('#note');
  await note.click();
  await page.keyboard.type('Rolled back :tada');
  const listbox = page.getByRole('listbox', { name: 'Emoji suggestions' });
  await expect(listbox.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
  await expect(note).toHaveAttribute('aria-activedescendant', /.+/);
  await page.keyboard.press('Enter');
  await expect(listbox).toBeHidden();
  await lastChange(page, 'note').toBe('Rolled back 🎉');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect.poll(() => page.evaluate(() => window.__rte.submits)).toBe(1);
});

test('emoji picker: German names, grid navigation, Escape returns focus', async ({ page }) => {
  const trigger = page.locator('#standalone-picker');
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Emoji auswählen' });
  await expect(page.getByRole('searchbox', { name: 'Emoji suchen' })).toBeFocused();
  const first = dialog.locator('.uix-emoji-picker__btn').first();
  await expect(dialog.getByRole('heading', { name: 'Smileys & Emotionen' })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(first).toBeFocused();
  await expect(dialog.locator('.uix-emoji-picker__btn[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('ArrowDown');
  await expect(dialog.locator('.uix-emoji-picker__btn').nth(8)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('searchbox', { name: 'Emoji suchen' })).toBeFocused();
  await page.keyboard.type('daumen hoch');
  await expect(dialog.getByRole('button', { name: /Daumen hoch/ }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('reactions: pressed toggles with names, add via quick pick', async ({ page }) => {
  const bar = page.getByRole('group', { name: 'Reactions' });
  const mine = bar.getByRole('button', { name: 'You, Ana Petrović reacted with 👍' });
  await expect(mine).toHaveAttribute('aria-pressed', 'true');
  await mine.focus();
  await expect(page.getByRole('tooltip', { name: 'You, Ana Petrović reacted with 👍' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(bar.getByRole('button', { name: 'Ana Petrović reacted with 👍' })).toHaveAttribute('aria-pressed', 'false');

  await bar.getByRole('button', { name: 'Add reaction' }).click();
  const picker = page.getByRole('dialog', { name: 'Choose an emoji' });
  await picker.getByRole('group', { name: 'Frequently used' }).getByRole('button').nth(3).click();
  await expect(bar.getByRole('button', { name: 'You reacted with 🎉' })).toHaveAttribute('aria-pressed', 'true');
  await expect(bar.getByRole('button', { name: 'Add reaction' })).toBeFocused();
});

test('viewer renders every corpus fixture as expected', async ({ page }) => {
  for (const fixture of MARKDOWN_CORPUS) {
    const article = page.locator(`article[data-fixture="${fixture.name}"]`);
    for (const selector of fixture.viewer.selectors) {
      await expect(article.locator(selector).first(), `${fixture.name}: ${selector}`).toBeAttached();
    }
    for (const text of fixture.viewer.text) {
      await expect(article, `${fixture.name}: ${text}`).toContainText(text);
    }
    await expect(article.locator('script')).toHaveCount(0);
  }
  await expect(page.locator('article[data-fixture="image"] img')).toHaveAttribute('src', '/api/knowledge/articles/a1/images/b2');
  await expect(page.locator('article[data-fixture="unsafe link"] a')).toHaveCount(1); // the evil image as a plain link
  await expect(page.locator('article[data-fixture="task list"] input')).toHaveCount(2);
  await expect(page.locator('article[data-fixture="task list"] input').first()).toBeDisabled();
});

test('narrow screens: the toolbar scrolls, the page does not', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const toolbar = page.getByRole('toolbar').first();
  const { scroll, client } = await toolbar.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(scroll).toBeGreaterThan(client);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // Keyboard focus keeps the focused tool in view.
  await toolbar.getByRole('button').first().focus();
  await page.keyboard.press('End');
  const box = await toolbar.getByRole('button', { name: /^Show markdown/ }).boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(360);
});

test('focus rings are visible on tools, chips and picker cells', async ({ page }) => {
  const outline = (locator) => locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) };
  });
  await page.locator('#field-hint').click();
  await page.keyboard.press('Tab');
  expect(await outline(page.getByRole('button', { name: 'Heading 1' }).first())).toEqual({ style: 'solid', width: 2 });
  await page.getByRole('group', { name: 'Reactions' }).getByRole('button').first().focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  expect((await outline(page.getByRole('group', { name: 'Reactions' }).getByRole('button').first())).style).toBe('solid');
});

// ── images in every preset (TENSOR HAR-749) ────────────────────────────────────
/** Paste a PNG (optionally with text, as Excel/Word do) into an editor through a real ClipboardEvent. */
const pasteImage = (page, id, text = '') => page.evaluate(({ editorId, withText }) => {
  const dt = new DataTransfer();
  dt.items.add(new File([new Uint8Array([137, 80, 78, 71])], 'screenshot.png', { type: 'image/png' }));
  if (withText) dt.setData('text/plain', withText);
  document.getElementById(editorId).dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
}, { editorId: id, withText: text });
// The composer puts its status line in the ComposerBar, outside the editor surface: scope by section.
const statusOf = (page, id) => page.locator('section').filter({ has: page.locator(`#${id}`) }).locator('.uix-rich-text__status');

test('images: a comment composer with onUploadImage has the image tool and takes a pasted screenshot', async ({ page }) => {
  const composer = page.locator('.uix-rich-text').filter({ has: page.locator('#update') });
  await expect(composer.getByRole('button', { name: 'Image', exact: true })).toBeVisible();
  await pasteImage(page, 'update');
  await expect.poll(async () => (await changes(page, 'update')).at(-1) ?? '').toContain('![screenshot.png](/images/screenshot.png)');
  await expect(page.locator('#update img[src="/images/screenshot.png"]')).toBeVisible();
});

test('images off: a pasted image inserts nothing and the status line says why', async ({ page }) => {
  await pasteImage(page, 'note');
  await expect(statusOf(page, 'note')).toHaveText("Images can't be added here.");
  await expect(statusOf(page, 'note')).toHaveAttribute('role', 'status');
  expect(await changes(page, 'note')).toEqual([]);
  // The next edit clears it.
  await page.locator('#note').click();
  await page.keyboard.type('ok');
  await expect(statusOf(page, 'note')).toHaveText('');

  await pasteImage(page, 'template');
  await expect(statusOf(page, 'template')).toHaveText('Templates are sent as email; link to an attachment instead.');

  // Excel/Word put a PNG next to the text: that stays a text paste, with no notice.
  await pasteImage(page, 'note', 'cells');
  await expect(statusOf(page, 'note')).toHaveText('');
});

for (const width of [320, 360, 375, 390, 414]) {
  test(`phone ${width} px: the image-enabled composer fits — page never scrolls sideways, action stays on screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const composer = page.locator('.uix-rich-text').filter({ has: page.locator('#update') });
    await composer.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const post = await composer.getByRole('button', { name: 'Post update' }).boundingBox();
    expect(post.x).toBeGreaterThanOrEqual(0);
    expect(post.x + post.width).toBeLessThanOrEqual(width);
    // The image tool is reachable: in view, or in the toolbar's own sideways scroll.
    const tool = composer.getByRole('button', { name: 'Image', exact: true });
    await tool.scrollIntoViewIfNeeded();
    const box = await tool.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    // A status message takes its own row: it never squeezes the composer toolbar to a sliver.
    const note = page.locator('section').filter({ has: page.locator('#note') });
    const toolsBefore = await note.getByRole('toolbar').boundingBox();
    await pasteImage(page, 'note');
    await expect(statusOf(page, 'note')).toHaveText("Images can't be added here.");
    const status = await statusOf(page, 'note').boundingBox();
    const tools = await note.getByRole('toolbar').boundingBox();
    expect(status.x + status.width).toBeLessThanOrEqual(width);
    expect(tools.width).toBeGreaterThanOrEqual(toolsBefore.width - 1);
    expect(status.y).toBeGreaterThanOrEqual(tools.y + tools.height - 1);
  });
}

// ── a wide toolbarEnd (TENSOR HAR-1125) ────────────────────────────────────────
/* An audience toggle + submit in toolbarEnd took the whole one-row composer bar and left the tool
   row 0 px wide on a phone: no tool was reachable, and a click on one landed on the toggle or the bar. */
const TOOL = 32; // .uix-rich-text__tool
const USABLE_TOOLS = 5; // the row never drops below one full group of tools; the end slot wraps first

for (const width of [1280, 768, 375, 320]) {
  test(`wide toolbarEnd at ${width} px: every tool reachable and hit-testable, the end slot whole and clear of the tools`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const composer = page.locator('.uix-rich-text').filter({ has: page.locator('#reply') });
    await composer.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways page scroll').toBe(true);

    const g = await composer.evaluate((root) => {
      const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; };
      const bar = root.querySelector('.uix-rich-text__bar');
      const row = bar.querySelector(':scope > .uix-rich-text__toolbar');
      const cs = getComputedStyle(bar);
      const inner = bar.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      // Bring each tool into view (scrolling the row, as a user would), then hit-test its centre.
      const tools = [...row.querySelectorAll('.uix-rich-text__tool')];
      const misses = [];
      for (const tool of tools) {
        tool.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        const r = tool.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (!tool.contains(hit)) misses.push(`${tool.dataset.tool} -> ${hit ? `${hit.tagName}.${hit.className}` : 'nothing'}`);
      }
      row.scrollLeft = 0;
      const ends = [...bar.querySelectorAll(':scope > fieldset, :scope > .uix-btn')]
        .map((el) => ({ name: el.textContent.trim(), ...box(el), scroll: el.scrollWidth, client: el.clientWidth }));
      return { bar: box(bar), inner, row: box(row), tools: tools.length, misses, ends };
    });

    expect(g.tools).toBeGreaterThanOrEqual(10);
    expect.soft(g.row.width, 'the tool row keeps a usable width').toBeGreaterThanOrEqual(Math.min(USABLE_TOOLS * TOOL, g.inner) - 0.5);
    expect.soft(g.misses, 'every tool, once scrolled into its row, is what a click at its centre hits').toEqual([]);
    expect(g.ends).toHaveLength(2);
    for (const end of g.ends) {
      expect.soft(end.left, `${end.name}: inside the bar`).toBeGreaterThanOrEqual(g.bar.left - 0.5);
      expect.soft(end.right, `${end.name}: inside the bar`).toBeLessThanOrEqual(g.bar.right + 0.5);
      expect.soft(end.right, `${end.name}: on screen`).toBeLessThanOrEqual(width);
      expect.soft(end.scroll, `${end.name}: nothing clipped inside`).toBeLessThanOrEqual(end.client);
      const clear = end.top >= g.row.bottom - 0.5 || end.left >= g.row.right - 0.5 || end.right <= g.row.left + 0.5;
      expect.soft(clear, `${end.name}: never overlaps the tool row`).toBe(true);
    }
  });
}
