/* Forced colours lane (roadmap #18; WCAG 1.4.11 and 2.4.7 under a Windows contrast theme).
 *
 * A contrast theme (forced-colors: active) repaints the page in the user's system colours and
 * drops every box-shadow and author background. A focus ring drawn as a box-shadow, and a chosen
 * row or tab that is only a tint, vanish with them. styles/forced-colors.css redraws those cues
 * with system colours; this lane is the evidence that it does, instead of a claim.
 *
 * Runs in the `forced-colors` project only (playwright.config.mjs: Chromium, forcedColors
 * 'active'), once under a dark contrast theme (High Contrast Black, Night sky) and once under a
 * light one (Desert): Chromium picks its forced palette from the colour scheme.
 *
 *   - focus: every focusable control on every explorer route draws an outline when it takes
 *     keyboard focus (on itself, its ::before/::after, a child, its field shell or the box that
 *     stands in for a hidden input). An outline is the one focus cue this mode keeps;
 *   - chosen states: every selected, current, pressed, checked or active element is screenshot,
 *     then the state is switched off and it is screenshot again. A state that changes the pixels
 *     with colours on and none with forced colours has lost its only cue;
 *   - the TaskTray's ring still shows progress, and the scroll edges stay plain edges;
 *   - a gallery of the key components (buttons, fields, toggles, a selected row, status pills,
 *     tabs, pagination, the sidebar) is attached to the report as screenshots, focused.
 *
 * Found and fixed when the lane was added: the focus-within ring of TagInput, Composer, RichText
 * and Stepper and the command palette's field (box-shadow only); a selected table row, the
 * sidebar's current page, an inbox selection, my reaction, a selected relationship-graph item,
 * the pager's current page and the pipeline's current stage (tint or shadow only).
 */
import { test, expect } from '@playwright/test';
import { explorerRoutes, showRoute } from './explorer-walk.mjs';

/** In the page: the focusable controls that took focus and drew no outline anywhere near them. */
function focusWithoutOutline() {
  const root = document.querySelector('[data-docs-page]');
  const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"], [contenteditable=""]';
  const ring = (el, pseudo) => {
    const s = getComputedStyle(el, pseudo);
    return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 1 ? `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} ${s.outlineOffset}` : '';
  };
  // Where a kit control draws its ring: itself or a pseudo-element, its row or card (tree, org
  // chart), its field shell (focus-within), or the box beside a visually hidden input.
  const places = (el) => {
    const list = [[el, null], [el, '::before'], [el, '::after'], ...[...el.children].map((c) => [c, null])];
    for (let p = el.parentElement, i = 0; p && i < 3; p = p.parentElement, i++) list.push([p, null]);
    const next = el.nextElementSibling;
    if (next) list.push([next, null], [next, '::before'], [next, '::after']);
    return list;
  };
  const rings = (el) => places(el).map(([e, p]) => ring(e, p));
  const out = [];
  for (const el of root.querySelectorAll(FOCUSABLE)) {
    if (el.disabled || el.closest('pre, .uix-docs__code, [inert], [aria-hidden="true"]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const before = rings(el);
    el.focus({ preventScroll: true });
    if (document.activeElement !== el) continue;
    const after = rings(el);
    el.blur();
    if (after.some((s, i) => s !== '' && s !== before[i])) continue;
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
    out.push(`${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}${el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : ''}`);
  }
  return [...new Set(out)];
}

const STATE = '[aria-selected="true"], [aria-pressed="true"], [aria-checked="true"], [aria-current]:not([aria-current="false"]), [data-selected], [data-active], [data-mine], input:checked';
const STATE_ATTRS = ['aria-selected', 'aria-pressed', 'aria-checked', 'aria-current', 'data-selected', 'data-active', 'data-mine', 'data-on', 'data-range-edge'];
/** Instances of one kind of state (element, class, attributes) checked across the whole walk. */
const PER_KIND = 2;

/** In the page: tags each chosen element still to be checked with data-fc-state="i"; returns their kinds. */
function markStates([STATE, STATE_ATTRS, seen, perKind]) {
  const root = document.querySelector('[data-docs-page]');
  const kinds = [];
  for (const el of root.querySelectorAll(STATE)) {
    if (el.closest('pre, .uix-docs__code, .uix-docs__toc, .uix-docs__page-header')) continue;
    const box = el.matches('input') ? (el.closest('label') ?? el.parentElement) : el;
    const r = box.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
    const on = STATE_ATTRS.filter((a) => el.hasAttribute(a) && el.getAttribute(a) !== 'false');
    const kind = `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''} [${on.join(', ') || 'checked'}]`;
    if ((seen[kind] ?? 0) + kinds.filter((k) => k === kind).length >= perKind) continue;
    el.setAttribute('data-fc-state', String(kinds.length));
    box.setAttribute('data-fc-box', String(kinds.length));
    kinds.push(kind);
  }
  return kinds;
}

/** In the page: switches every state attribute of the element off (`off`) or back on. */
function switchState(el, [off, STATE_ATTRS]) {
  if (off) {
    const saved = {};
    for (const a of STATE_ATTRS) {
      if (!el.hasAttribute(a)) continue;
      saved[a] = el.getAttribute(a);
      if (/^aria-(selected|pressed|checked)$/.test(a)) el.setAttribute(a, 'false'); else el.removeAttribute(a);
    }
    if (el.matches('input')) { saved.__checked = el.checked; el.checked = false; }
    el.__fcSaved = saved;
    return;
  }
  for (const [a, v] of Object.entries(el.__fcSaved ?? {})) { if (a === '__checked') el.checked = v; else el.setAttribute(a, v); }
  delete el.__fcSaved;
}

for (const scheme of ['dark', 'light']) {
  test.describe(`${scheme} contrast theme`, () => {
    test.use({ colorScheme: scheme, reducedMotion: 'reduce' });

    test('every control in the explorer draws an outline when it takes keyboard focus', async ({ page }) => {
      test.setTimeout(300_000);
      const routes = await explorerRoutes(page, scheme);
      expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), 'the project emulates forced colours').toBe(true);
      const missing = [];
      for (const slug of routes) {
        await showRoute(page, slug);
        await page.keyboard.press('Shift'); // keyboard modality: a programmatic focus now matches :focus-visible
        for (const hit of await page.evaluate(focusWithoutOutline)) missing.push(`#${slug}: ${hit}`);
      }
      expect(missing, `focus drew no outline under forced colours [${scheme}]:\n${missing.join('\n')}`).toEqual([]);
    });

    test('every chosen, current or pressed state is still visible', async ({ page }) => {
      test.setTimeout(420_000);
      const routes = await explorerRoutes(page, scheme);
      const seen = {};
      const lost = [];
      const shot = (locator) => locator.screenshot({ animations: 'disabled', timeout: 5_000 }).catch(() => null);
      for (const slug of routes) {
        await showRoute(page, slug);
        const kinds = await page.evaluate(markStates, [STATE, STATE_ATTRS, seen, PER_KIND]);
        for (const [i, kind] of kinds.entries()) {
          seen[kind] = (seen[kind] ?? 0) + 1;
          const el = page.locator(`[data-fc-state="${i}"]`);
          const box = page.locator(`[data-fc-box="${i}"]`);
          await box.scrollIntoViewIfNeeded().catch(() => {});
          // true when switching the state off changes the pixels (or the box cannot be shot)
          const changes = async () => {
            const on = await shot(box);
            await el.evaluate(switchState, [true, STATE_ATTRS]);
            const off = await shot(box);
            await el.evaluate(switchState, [false, STATE_ATTRS]);
            return on && off ? !on.equals(off) : true;
          };
          if (await changes()) continue; // visible under forced colours
          await page.emulateMedia({ forcedColors: 'none' });
          const visibleWithColours = await changes();
          await page.emulateMedia({ forcedColors: 'active' });
          if (visibleWithColours) lost.push(`#${slug}: ${kind}`);
        }
      }
      expect(Object.keys(seen).length, 'the walk found chosen states to check').toBeGreaterThan(20);
      expect(lost, `a chosen state lost its only cue under forced colours [${scheme}]:\n${lost.join('\n')}`).toEqual([]);
    });

    test('the TaskTray ring still shows progress, and its pill draws a focus outline', async ({ page }) => {
      await page.goto(`/tests/task-tray/harness.html?scene=one&theme=${scheme}`, { waitUntil: 'networkidle' });
      const pill = page.getByRole('button', { name: /^Background tasks: / });
      await expect(pill).toBeVisible();
      await page.keyboard.press('Shift');
      await pill.focus();
      const outline = await pill.evaluate((el) => { const s = getComputedStyle(el); return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) }; });
      expect(outline.style, 'the pill shows focus with an outline').not.toBe('none');
      expect(outline.width).toBeGreaterThanOrEqual(1);
      const ring = page.locator('.uix-task-tray__ring').first();
      await expect(ring).toBeVisible();
      const at = async (val) => { await ring.evaluate((el, v) => el.style.setProperty('--val', v), val); return ring.screenshot({ animations: 'disabled' }); };
      const quarter = await at('0.25');
      const most = await at('0.8');
      expect(quarter.equals(most), 'the ring looks the same at 25 % and 80 %').toBe(false);
      await test.info().attach(`task-tray-${scheme}.png`, { body: await page.locator('.uix-task-tray').screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    });

    test('scroll edges stay plain edges, and a pinned header keeps its line', async ({ page }) => {
      // With motion allowed: under reduced motion every edge is static anyway, and the divider is off.
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(`/tests/scroll-edge/fixture.html?theme=${scheme}`, { waitUntil: 'networkidle' });
      const list = page.locator('.uix-scroll-edge.fx-list').first();
      await list.evaluate((el) => { el.scrollTop = 40; });
      // a fade is a mask: switching every mask off must change nothing a reader sees
      const asDrawn = await list.screenshot({ animations: 'disabled' });
      const style = await page.addStyleTag({ content: '* { mask-image: none !important; }' });
      const unmasked = await list.screenshot({ animations: 'disabled' });
      await style.evaluate((el) => el.remove());
      expect(asDrawn.equals(unmasked), 'forced colours fade content into a scroll edge').toBe(true);
      const head = page.locator('.uix-scroll-edge-head').first();
      await expect(head).toBeVisible();
      await head.evaluate((el) => { let s = el.parentElement; while (s && s.scrollHeight <= s.clientHeight) s = s.parentElement; if (s) s.scrollTop = 200; });
      const withLine = await head.screenshot({ animations: 'disabled' });
      await page.addStyleTag({ content: '.uix-scroll-edge-head::after { display: none !important; }' });
      const withoutLine = await head.screenshot({ animations: 'disabled' });
      expect(withLine.equals(withoutLine), 'the pinned header lost its divider').toBe(false);
      await test.info().attach(`scroll-edges-${scheme}.png`, { body: await page.locator('main').screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    });

    test('gallery: key components, focused, attached to the report', async ({ page }) => {
      test.setTimeout(120_000);
      await explorerRoutes(page, scheme);
      for (const [slug, focus] of [
        ['button', '.uix-btn--primary'], ['input', '.uix-input'], ['checkbox', 'input'], ['switch', 'input'], ['radio', 'input'],
        ['tabs', '[role="tab"]'], ['segmented', '.uix-segmented__option'], ['table', 'tbody tr[data-selected] input'], ['status-pill', null],
        ['pagination', '.uix-pagination__btn'], ['sidebar', '.uix-navitem'], ['tag-input', '.uix-taginput__field'], ['inbox', '.uix-inbox__item'],
      ]) {
        await showRoute(page, slug);
        const stage = page.locator('[data-docs-page] .uix-docs__demo-stage').first();
        if (!(await stage.count())) continue;
        await stage.scrollIntoViewIfNeeded();
        if (focus) { await page.keyboard.press('Shift'); await stage.locator(focus).first().focus({ timeout: 2_000 }).catch(() => {}); }
        const body = await stage.screenshot({ animations: 'disabled', timeout: 10_000 }).catch(() => null);
        if (body) await test.info().attach(`${slug}-${scheme}.png`, { body, contentType: 'image/png' });
      }
    });
  });
}
