/* A rich-text field inside a CommentComposer is framed by the composer, never by itself
 * (HAR-4819, TENSOR worklog canvas v50): no border, radius, background or focus shadow on the
 * field in any state — rest, hover, focus, disabled, read-only, invalid, and the loading fallback's
 * textarea. The composer keeps its focus ring and shows the invalid border. Computed styles from
 * the built bundle, in both theme projects. */
import { test, expect } from '@playwright/test';

const field = (id, attrs = '', fallback = false) => `
  <form class="uix-composer uix-composer--audience" data-audience="internal" id="${id}">
    <div class="uix-composer__audience"><p class="uix-composer__hint">hint</p></div>
    <div class="uix-rich-text${fallback ? ' uix-rich-text--fallback' : ''}" ${attrs}>
      ${fallback
        ? '<textarea class="uix-textarea uix-rich-text__source" aria-label="reply"></textarea>'
        : '<div class="uix-rich-text__content" contenteditable="true" tabindex="0" aria-label="reply">text</div>'}
    </div>
    <div class="uix-composer__bar"><button class="uix-btn uix-btn--secondary" type="submit">Send</button></div>
  </form>`;

const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/packages/tokens/build/css/styles.css">
<style>/* read end states, not a frame of the border-colour transition */ *, *::before, *::after { transition: none !important; }</style></head>
<body style="margin:0;padding:24px;display:grid;gap:16px;width:480px">
  ${field('rest')}
  ${field('disabled', 'data-disabled=""')}
  ${field('readonly', 'data-readonly=""')}
  ${field('invalid', 'data-invalid=""')}
  ${field('fallback', '', true)}
  <div class="uix-rich-text" id="standalone"><div class="uix-rich-text__content" contenteditable="true" aria-label="alone">x</div></div>
</body></html>`;

const frame = (page, sel) =>
  page.locator(sel).first().evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      border: s.borderTopWidth,
      radius: s.borderTopLeftRadius,
      background: s.backgroundColor,
      shadow: s.boxShadow,
    };
  });
const NONE = { border: '0px', radius: '0px', background: 'rgba(0, 0, 0, 0)', shadow: 'none' };

test.beforeEach(async ({ page }) => {
  await page.goto('/packages/tokens/docs/index.html');
  await page.setContent(PAGE, { waitUntil: 'load' });
});

test('the field draws no frame at rest, on hover and on focus', async ({ page }) => {
  expect(await frame(page, '#rest > .uix-rich-text')).toEqual(NONE);
  await page.hover('#rest .uix-rich-text__content');
  expect(await frame(page, '#rest > .uix-rich-text')).toEqual(NONE);
  await page.focus('#rest .uix-rich-text__content');
  expect(await frame(page, '#rest > .uix-rich-text')).toEqual(NONE);
  // the composer holds the one focus ring
  const composer = await frame(page, '#rest');
  expect(composer.shadow).not.toBe('none');
});

test('disabled and read-only keep no frame, also under the pointer', async ({ page }) => {
  for (const id of ['disabled', 'readonly']) {
    expect(await frame(page, `#${id} > .uix-rich-text`)).toEqual(NONE);
    await page.hover(`#${id} .uix-rich-text__content`);
    expect(await frame(page, `#${id} > .uix-rich-text`)).toEqual(NONE);
  }
});

test('invalid: the composer shows the danger border, the field no halo of its own', async ({ page }) => {
  const restBorder = await page.locator('#rest').evaluate((el) => getComputedStyle(el).borderTopColor);
  const invalidBorder = await page.locator('#invalid').evaluate((el) => getComputedStyle(el).borderTopColor);
  expect(invalidBorder).not.toBe(restBorder);
  await page.focus('#invalid .uix-rich-text__content');
  expect(await frame(page, '#invalid > .uix-rich-text')).toEqual(NONE);
});

test('the loading fallback textarea draws no box inside the composer', async ({ page }) => {
  expect(await frame(page, '#fallback .uix-rich-text__source')).toEqual(NONE);
  await page.focus('#fallback .uix-rich-text__source');
  expect(await frame(page, '#fallback .uix-rich-text__source')).toEqual(NONE);
});

test('a rich-text field outside a composer keeps its own frame', async ({ page }) => {
  const alone = await frame(page, '#standalone');
  expect(alone.border).toBe('1px');
  expect(alone.radius).not.toBe('0px');
});
