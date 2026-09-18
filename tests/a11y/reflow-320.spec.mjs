/* Reflow at 320 px (RX-21 / HAR-364; finding LD-11) — WCAG 1.4.10.
 *
 * The employee portal home scrolled sideways on a phone: `.uix-shortcut-grid` pinned two
 * fixed columns under 620 px, and `1fr` takes an AUTO minimum, so nowrap `.uix-btn` labels
 * pushed the track wider than the viewport (measured live: 382 px of content in 320 px).
 * A fixed column count cannot be safe at an unknown text length, so the grid now fits
 * itself with `auto-fit` + `minmax(min(100%, 12rem), 1fr)` and its labels may wrap.
 *
 * Measured on the rendered page, at the viewport the finding names, in both themes
 * (a theme changes font synthesis and therefore text width).
 */
import { test, expect } from '@playwright/test';

const NARROW = { width: 320, height: 800 };

const open = async (page, testInfo, path) => {
  await page.setViewportSize(NARROW);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(path, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await page.evaluate(() => document.fonts.ready); // web fonts are wider than the fallback
};

test('editorial-home example does not scroll sideways at 320 px', async ({ page }, testInfo) => {
  await open(page, testInfo, 'docs/explorer.html#examples-editorial-home');

  const doc = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(doc.clientWidth).toBe(NARROW.width);
  expect(doc.scrollWidth, `${doc.scrollWidth} px of content in a ${doc.clientWidth} px viewport`)
    .toBe(doc.clientWidth);
});

/* The docs specimen's own labels are short English words, so it fits 320 px even with the
 * broken grid — the live failure was measured on the German portal ("Bestellung aufgeben",
 * "Störung melden"). The grid must survive the label it will actually be given, so the
 * test writes a real one in before measuring. Without that, this spec would have gone
 * green against the very CSS the finding reports. */
const LONG_LABEL = 'Bestellung für neue Hardware aufgeben';

test('shortcut grid fits 320 px even with a long label', async ({ page }, testInfo) => {
  await open(page, testInfo, 'docs/explorer.html#examples-editorial-home');

  const grid = page.locator('.uix-shortcut-grid').first();
  await expect(grid, 'no .uix-shortcut-grid on the editorial-home example').toBeVisible();

  const seen = await grid.evaluate((el, label) => {
    const first = el.firstElementChild;
    const slot = Array.from(first.childNodes).find((n) => n.nodeType === 3 && n.textContent.trim())
      ?? first.querySelector('span:not([class])')
      ?? first;
    slot.textContent = label;
    return {
      label: first.textContent.trim(),
      gridScroll: el.scrollWidth,
      gridClient: el.clientWidth,
      columns: getComputedStyle(el).gridTemplateColumns.split(' ').length,
      itemScroll: first.scrollWidth,
      itemClient: first.clientWidth,
      whiteSpace: getComputedStyle(first).whiteSpace,
      docScroll: document.documentElement.scrollWidth,
      docClient: document.documentElement.clientWidth,
    };
  }, LONG_LABEL);

  console.log(`320 px with a long label: grid ${seen.gridClient} px (${seen.columns} column(s)), item content ${seen.itemScroll} px in a ${seen.itemClient} px box, white-space: ${seen.whiteSpace}, page ${seen.docScroll}/${seen.docClient}`);

  expect(seen.label, 'the long label was not written into the specimen').toContain('Bestellung');
  expect(seen.columns, 'a phone-width grid should collapse to one column').toBe(1);
  expect(seen.whiteSpace, 'a shortcut label must be allowed to wrap').not.toBe('nowrap');
  expect(seen.itemScroll, 'the label still overflows its own button').toBeLessThanOrEqual(seen.itemClient);
  expect(seen.gridScroll, 'the grid overflows its track').toBeLessThanOrEqual(seen.gridClient);
  expect(seen.docScroll, `${seen.docScroll} px of content in a ${seen.docClient} px viewport`).toBe(seen.docClient);
});

/* Bar-shaped footers (TENSOR PR #1780, 2026-09-18). `.uix-composer__bar` was a
 * nowrap flex row, so an audience toggle (`.uix-segmented`) at the start plus the primary
 * submit button at the end pushed the button out of the card at 320 px. TENSOR patched it
 * with an inline `flexWrap: 'wrap'`; the primitive must not need one. The same trap sat in
 * `.uix-dialog__footer` and `.uix-card__footer`, which host the same two-group rows.
 *
 * Each bar is filled with labels TENSOR actually gives it (worklog-feed defaults, dialog
 * footers), then every child is measured against the bar's own box: nothing may cross an
 * edge, and the bar may not scroll. The consumer's inline `justify-content` is mirrored
 * where it sets one, because that is the layout the primitive has to survive.
 */
const fillAndMeasure = (locator, { html, justify }) => locator.evaluate((el, opts) => {
  if (opts.justify) el.style.justifyContent = opts.justify;
  el.innerHTML = opts.html;
  const bar = el.getBoundingClientRect();
  const kids = Array.from(el.children).map((c) => {
    const r = c.getBoundingClientRect();
    return { label: c.textContent.trim().slice(0, 24), left: Math.round(r.left - bar.left), right: Math.round(r.right - bar.right), top: Math.round(r.top) };
  });
  return {
    barWidth: Math.round(bar.width),
    wrap: getComputedStyle(el).flexWrap,
    rows: new Set(kids.map((k) => k.top)).size,
    overflow: el.scrollWidth - el.clientWidth,
    escaped: kids.filter((k) => k.right > 0 || k.left < 0),
  };
}, { html, justify });

const expectContained = (seen, what) => {
  console.log(`320 px ${what}: bar ${seen.barWidth} px, flex-wrap ${seen.wrap}, ${seen.rows} row(s), overflow ${seen.overflow} px, escaped ${JSON.stringify(seen.escaped)}`);
  expect(seen.barWidth, `${what} was not narrowed by the phone viewport`).toBeLessThan(NARROW.width);
  expect(seen.escaped, `${what}: a control crosses the bar's edge`).toEqual([]);
  expect(seen.overflow, `${what} overflows its own box`).toBeLessThanOrEqual(0);
};

const SEGMENTED_AUDIENCE = `
  <fieldset class="uix-segmented">
    <legend class="uix-visually-hidden">Post as</legend>
    <button type="button" class="uix-segmented__option" aria-pressed="true">Internal note</button>
    <button type="button" class="uix-segmented__option" aria-pressed="false">Reply to requester</button>
  </fieldset>`;

test('composer bar keeps the submit button inside at 320 px with an audience toggle', async ({ page }, testInfo) => {
  await open(page, testInfo, 'docs/explorer.html#examples-crm-itsm');
  const bar = page.locator('.uix-composer .uix-composer__bar').first();
  await expect(bar, 'no composer bar on the crm-itsm example').toBeVisible();

  const seen = await fillAndMeasure(bar, {
    justify: 'space-between', // worklog-feed.tsx sets this inline when the toggle is shown
    html: `${SEGMENTED_AUDIENCE}<button type="submit" class="uix-btn uix-btn--primary">Reply to requester</button>`,
  });
  expectContained(seen, 'composer bar (toggle + submit)');
  expect(seen.rows, 'toggle and submit should stack rather than clip').toBeGreaterThan(1);
});

test('dialog footer keeps three actions inside at 320 px', async ({ page }, testInfo) => {
  await open(page, testInfo, 'docs/explorer.html#examples-overlays');
  const dialog = page.locator('#demo-modal');
  await dialog.evaluate((d) => d.showModal());
  const footer = dialog.locator('.uix-dialog__footer');
  await expect(footer, 'no footer on the demo modal').toBeVisible();

  const seen = await fillAndMeasure(footer, {
    html: `<button type="button" class="uix-btn uix-btn--ghost" style="margin-right:auto">Delete</button>
      <button type="button" class="uix-btn uix-btn--secondary">Cancel</button>
      <button type="submit" class="uix-btn uix-btn--primary">Save changes</button>`,
  });
  expectContained(seen, 'dialog footer (delete · cancel · save)');
});

test('card footer keeps its meta and two actions inside at 320 px', async ({ page }, testInfo) => {
  await open(page, testInfo, 'docs/explorer.html#examples-workflows-pipelines');
  const footer = page.locator('.uix-card__footer').first();
  await expect(footer, 'no card footer on the workflows-pipelines example').toBeVisible();

  const seen = await fillAndMeasure(footer, {
    html: `<span style="margin-right:auto">Last event 32s ago</span>
      <button type="button" class="uix-btn uix-btn--secondary">Cancel</button>
      <button type="button" class="uix-btn uix-btn--primary">Save changes</button>`,
  });
  expectContained(seen, 'card footer (meta · cancel · save)');
});

/* Segmented control on a <fieldset> (TENSOR worklog composer, 2026-09-18). A fieldset's UA
 * default is `min-inline-size: min-content`, so `.uix-segmented` rendered on one can never be
 * narrower than its longest words side by side. At 320 px (400 % zoom, WCAG 1.4.10) TENSOR's
 * audience toggle ran ~8 px past `.uix-composer` and was clipped. The bar is filled with
 * TENSOR's markup (sr-only legend, icon + label options), the toggle's own min-content width
 * is measured, and the composer is then narrowed to 8 px less than that, so the number does not
 * depend on the font. The toggle is measured against the bar's content box (the composer's
 * padding must not be what hides an overrun): it may not cross the edge, and an option may
 * break its label onto a second line but may not clip it.
 */
const ICON = '<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.75"/></svg>';
const SEGMENTED_FIELDSET = `
  <fieldset class="uix-segmented">
    <legend class="uix-visually-hidden">Post as</legend>
    <button type="button" class="uix-segmented__option" style="display:inline-flex;align-items:center;gap:4px" aria-pressed="true">${ICON}Internal note</button>
    <button type="button" class="uix-segmented__option" style="display:inline-flex;align-items:center;gap:4px" aria-pressed="false">${ICON}Reply to requester</button>
  </fieldset>`;

test('segmented fieldset stays inside a composer narrower than its longest words at 320 px', async ({ page }, testInfo) => {
  await open(page, testInfo, 'docs/explorer.html#examples-crm-itsm');
  const composer = page.locator('.uix-composer').first();
  await expect(composer, 'no composer on the crm-itsm example').toBeVisible();

  const seen = await composer.evaluate((el, html) => {
    const bar = el.querySelector('.uix-composer__bar');
    bar.style.justifyContent = 'space-between'; // worklog-feed.tsx sets this inline
    bar.innerHTML = html;
    const seg = bar.querySelector('.uix-segmented');

    // Calibrate: the narrowest the toggle gets by wrapping at word boundaries alone. The
    // options' own overflow-wrap is forced off while measuring, so the number is a property
    // of the labels and the font, not of the CSS under test.
    const options = Array.from(seg.querySelectorAll('.uix-segmented__option'));
    el.style.inlineSize = '1000px';
    seg.style.inlineSize = 'min-content';
    for (const o of options) o.style.overflowWrap = 'normal';
    const minContent = Math.round(seg.getBoundingClientRect().width);
    seg.style.inlineSize = '';
    for (const o of options) o.style.overflowWrap = '';

    // The composer's content box is then 8 px narrower than that (border + padding = 18 px).
    const inset = el.getBoundingClientRect().width - el.clientWidth + (bar.getBoundingClientRect().width - bar.clientWidth) + 2 * parseFloat(getComputedStyle(bar).paddingLeft);
    el.style.inlineSize = `${minContent - 8 + inset}px`;

    const box = el.getBoundingClientRect();
    const content = bar.getBoundingClientRect().right - parseFloat(getComputedStyle(bar).paddingRight);
    const s = seg.getBoundingClientRect();
    return {
      minContent,
      composerWidth: Math.round(box.width),
      segmentedWidth: Math.round(s.width),
      pastEdge: Math.round(s.right - content),
      overflow: seg.scrollWidth - seg.clientWidth,
      options: options.map((o) => ({
        label: o.textContent.trim(),
        width: Math.round(o.getBoundingClientRect().width),
        clipped: o.scrollWidth - o.clientWidth,
      })),
    };
  }, `${SEGMENTED_FIELDSET}<button type="submit" class="uix-btn uix-btn--primary">Reply to requester</button>`);

  console.log(`320 px segmented fieldset: toggle min-content ${seen.minContent} px, composer ${seen.composerWidth} px, toggle ${seen.segmentedWidth} px (${seen.pastEdge} px past the edge, overflow ${seen.overflow} px), options ${JSON.stringify(seen.options)}`);

  expect(seen.composerWidth, 'the composer was not narrowed below the toggle').toBeLessThan(seen.minContent + 18);
  expect(seen.pastEdge, 'the toggle runs past the bar content edge').toBeLessThanOrEqual(0);
  expect(seen.segmentedWidth, 'the toggle is wider than its composer').toBeLessThanOrEqual(seen.composerWidth - 18);
  expect(seen.overflow, 'the toggle overflows its own box').toBeLessThanOrEqual(0);
  for (const o of seen.options) {
    expect(o.clipped, `"${o.label}" is clipped inside its option`).toBeLessThanOrEqual(0);
  }
});
