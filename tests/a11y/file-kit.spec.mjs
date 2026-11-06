/* File kit (2.57), measured in Chromium on tests/file-kit/harness.html, in both themes:
 *   - the kind colours reach the icon, the label and the row edge; blocked is amber, failed red;
 *   - uploading: the fill is scaled to the real progress (linear, --uix-dur-slow) with an edge;
 *     done: the check grows and draws (320 ms) and the fill fades (1.2 s), then the check leaves;
 *   - nothing loops in any state, and scanning has no motion at all;
 *   - reduced motion: the fill jumps, the check only fades;
 *   - resting actions wait for hover or focus with a fine pointer;
 *   - FileDrop: the choose button is one tab stop that opens the real chooser; a drag names the
 *     kinds from their MIME types before the drop and tints the row; the drop adds the files;
 *   - axe is clean at rest and while dragging; no horizontal overflow from 320 to 1280 px;
 *   - a row under 280 px (a 226 px rail, 2.57.1): the name wraps to two lines, the meta wraps, and
 *     the resting actions take no width until hover or focus.
 * Token contrast is pinned in packages/tokens/tests/file-kinds.test.mjs. Screenshots at four widths
 * are attached to the report (file-kit-<width>-<theme>.png). */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const GATED = new Set(['serious', 'critical']);
const URL = '../../tests/file-kit/harness.html';
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

async function open(page, theme) {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#live')).toBeVisible();
}

const live = (page) => page.locator('#live');
/** Every running animation or transition under `selector`: [{ name, duration, delay, iterations }]. */
const running = (page, selector = 'body') => page.evaluate((sel) => {
  const root = document.querySelector(sel);
  return document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target && root?.contains(a.effect.target)).map((a) => ({
    name: a.animationName ?? a.transitionProperty, duration: a.effect.getTiming().duration, delay: a.effect.getTiming().delay,
    iterations: a.effect.getTiming().iterations, target: String(a.effect.target.className?.baseVal ?? a.effect.target.className ?? a.effect.target.tagName),
  }));
}, selector);

/** Dispatch a drag the way a browser does, with real File objects in a DataTransfer. */
const dragOver = (page, selector, type, files, point = { x: 60, y: 20 }) => page.evaluate(({ selector, type, files, point }) => {
  const target = document.querySelector(selector);
  const box = target.getBoundingClientRect();
  const data = new DataTransfer();
  for (const [name, mime] of files) data.items.add(new File(['x'], name, { type: mime }));
  target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: data, clientX: box.left + point.x, clientY: box.top + point.y }));
}, { selector, type, files, point });

test('the kind colours reach the icon, its label and the row; blocked is amber and failed red', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const probe = await page.evaluate(() => {
    const resolve = (value) => { const el = document.createElement('i'); el.style.color = value; document.body.append(el); const c = getComputedStyle(el).color; el.remove(); return c; };
    const row = (name) => [...document.querySelectorAll('#panel .uix-file-row')].find((r) => r.querySelector('.uix-file-row__name').textContent === name);
    const read = (r) => ({
      icon: getComputedStyle(r.querySelector('.uix-file-icon')).color,
      label: getComputedStyle(r.querySelector('.uix-file-icon__type')).backgroundColor,
      labelText: getComputedStyle(r.querySelector('.uix-file-icon__type')).color,
      meta: getComputedStyle(r.querySelector('.uix-file-row__meta')).color,
      background: getComputedStyle(r).backgroundImage,
    });
    return {
      png: read(row('fehlermeldung-antrag.png')), blocked: read(row('nginx-upstream.conf')), failed: read(row('export-antraege-1340.csv')),
      img: resolve('var(--uix-file-img)'), imgLabel: resolve('var(--uix-file-img-label)'), fg: resolve('var(--uix-file-label-fg)'),
      warning: resolve('var(--uix-warning-text)'), danger: resolve('var(--uix-danger-text)'),
    };
  });
  expect(probe.png.icon).toBe(probe.img);
  expect(probe.png.label).toBe(probe.imgLabel);
  expect(probe.png.labelText).toBe(probe.fg);
  expect(probe.png.background).toContain('linear-gradient');
  expect(probe.blocked.icon).toBe(probe.warning);
  expect(probe.blocked.meta).toBe(probe.warning);
  expect(probe.failed.icon).toBe(probe.danger);
  expect(probe.failed.meta).toBe(probe.danger);
});

test('uploading: the fill follows the real progress with a leading edge; done: the check draws and the fill fades', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const fill = live(page).locator('.uix-file-row__fill');
  const scale = () => fill.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
  await expect.poll(scale).toBeCloseTo(0.2, 2);
  await expect(live(page).locator('.uix-file-row__edge')).toHaveCount(1);
  const transition = await fill.evaluate((el) => ({ p: getComputedStyle(el).transitionProperty, d: getComputedStyle(el).transitionDuration, t: getComputedStyle(el).transitionTimingFunction }));
  expect(transition).toEqual({ p: 'transform, opacity', d: '0.24s, 1.2s', t: 'linear, cubic-bezier(0.23, 1, 0.32, 1)' });
  await page.locator('#step').click();
  await expect(live(page).locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '40');
  await expect(live(page).locator('.uix-file-row__meta')).toHaveText('Wird hochgeladen · 40 % · 3,5 von 8,7 MB');
  await expect.poll(scale).toBeCloseTo(0.4, 2);

  await page.locator('#finish').click();
  await expect(live(page)).toHaveAttribute('data-state', 'done');
  const anims = await running(page, '#live');
  expect(anims.find((a) => a.name === 'uix-file-check-in')?.duration).toBe(320);
  expect(anims.find((a) => a.name === 'uix-file-check-draw')?.duration).toBe(320);
  const out = anims.find((a) => a.name === 'uix-file-check-out');
  expect(out?.duration).toBe(110);
  expect(out?.delay).toBe(1200 + 1500);
  expect(anims.some((a) => a.name === 'opacity' && a.duration === 1200)).toBe(true);
  await expect(live(page).locator('.uix-file-row__meta')).toHaveText('Protokoll · 8,7 MB · L. Brandt, 14:10');
  await expect.poll(() => fill.evaluate((el) => getComputedStyle(el).opacity), { timeout: 3000 }).toBe('0');
  await expect.poll(() => live(page).locator('.uix-file-row__check').evaluate((el) => getComputedStyle(el).opacity), { timeout: 4000 }).toBe('0');
  expect(await running(page, '#live')).toEqual([]);
});

test('nothing loops, and the scan has no motion at all', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  await page.locator('#finish').click();
  const all = await running(page);
  expect(all.filter((a) => a.iterations === Infinity)).toEqual([]);
  const scan = page.locator('#panel .uix-file-row[data-state="scanning"]');
  expect(await scan.evaluate((el) => [el, ...el.querySelectorAll('*')].flatMap((n) => n.getAnimations()).length)).toBe(0);
  expect(await scan.locator('.uix-file-row__fill').count()).toBe(0);
});

test('reduced motion: the fill jumps and the check only fades', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, themeOf(testInfo));
  const fill = live(page).locator('.uix-file-row__fill');
  expect(await fill.evaluate((el) => getComputedStyle(el).transitionProperty.split(', ').includes('transform'))).toBe(false);
  await page.locator('#step').click();
  expect(await fill.evaluate((el) => el.getAnimations().length)).toBe(0);
  await page.locator('#finish').click();
  const anims = await running(page, '#live');
  expect(anims.map((a) => a.name).sort()).toEqual(['opacity', 'uix-file-check-fade']);
  expect(anims.find((a) => a.name === 'uix-file-check-fade').duration).toBe(1200 + 1500 + 110);
  const check = live(page).locator('.uix-file-row__check');
  expect(await check.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
});

test('resting actions wait for hover or focus; a state action is always there', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const row = page.locator('#panel .uix-file-row', { hasText: 'fehlermeldung-antrag.png' });
  const download = row.getByRole('link', { name: 'fehlermeldung-antrag.png herunterladen' });
  await page.mouse.move(1, 1);
  await expect.poll(() => download.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
  await row.hover();
  await expect.poll(() => download.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  await page.mouse.move(1, 1);
  await download.focus();
  await expect.poll(() => download.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  const retry = page.locator('#panel').getByRole('button', { name: 'Erneut versuchen' });
  expect(await retry.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  await expect(page.locator('#panel').getByRole('button', { name: 'Hochladen von foerderportal-gateway-2026-11-05.log abbrechen' })).toBeVisible();
});

test('FileDrop: the choose button is a tab stop that opens the real file chooser', async ({ page }, testInfo) => {
  // Arm the chooser interception first: Playwright turns it on asynchronously when the wait
  // starts, so a key press right after waitForEvent can open the native dialog un-intercepted.
  const chooserEvent = page.waitForEvent('filechooser');
  await open(page, themeOf(testInfo));
  const choose = page.getByRole('button', { name: 'Dateien auswählen' });
  await expect(choose).toHaveText('auswählen');
  // a pointer lands on the button itself, not on the drag summary stacked over it
  const hit = await choose.evaluate((el) => { const b = el.getBoundingClientRect(); return document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) === el; });
  expect(hit).toBe(true);
  await page.locator('#rest').focus();
  await page.keyboard.press('Tab');
  await expect(choose).toBeFocused();
  const outline = await choose.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe('solid');
  await page.keyboard.press('Enter');
  const chooser = await chooserEvent;
  expect(chooser.isMultiple()).toBe(true);
  await chooser.setFiles([{ name: 'screenshot-1340.png', mimeType: 'image/png', buffer: Buffer.from('x') }]);
  await expect(page.locator('#panel .uix-file-row', { hasText: 'screenshot-1340.png' })).toHaveAttribute('data-state', 'uploading');
});

test('FileDrop: a drag names the kinds before the drop and tints the row; the drop adds the files', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const drop = page.locator('#drop');
  const files = [['fehler.png', 'image/png'], ['gateway.log', 'text/x-log']];
  await dragOver(page, '#panel', 'dragenter', files);
  await expect(drop).toHaveAttribute('data-dragging', '');
  await expect(drop.locator('.uix-file-drop__summary')).toHaveText('2 Dateien: Bild, Protokoll');
  await dragOver(page, '#drop', 'dragover', files, { x: 120, y: 18 });
  expect(await drop.evaluate((el) => el.style.getPropertyValue('--file-drop-x'))).toBe('120px');
  await expect.poll(() => drop.locator('.uix-file-drop__aura').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  const aura = await drop.locator('.uix-file-drop__aura').evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(aura.match(/radial-gradient/g)?.length).toBe(2);
  await expect.poll(() => drop.locator('.uix-file-drop__text').evaluate((el) => getComputedStyle(el).opacity)).toBe('0');

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations.filter((v) => GATED.has(v.impact)).map((v) => v.id)).toEqual([]);

  // the drop hands over what matches accept (an .exe does not)
  await dragOver(page, '#panel', 'drop', [...files, ['setup.exe', 'application/x-msdownload']]);
  await expect(drop).not.toHaveAttribute('data-dragging', '');
  await expect.poll(() => page.evaluate(() => window.__files)).toEqual(['fehler.png', 'gateway.log']);
  await expect(page.locator('#panel .uix-file-row', { hasText: 'fehler.png' })).toHaveAttribute('data-file-kind', 'img');
});

test('axe is clean, and nothing overflows from 320 to 1280 px', async ({ page }, testInfo) => {
  const theme = themeOf(testInfo);
  await open(page, theme);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${width}px`).toBeLessThanOrEqual(0);
    const rows = await page.evaluate(() => [...document.querySelectorAll('.uix-file-row')].filter((r) => {
      const box = r.getBoundingClientRect();
      const parent = r.parentElement.getBoundingClientRect();
      return box.right > parent.right + 0.5 || box.left < parent.left - 0.5;
    }).length);
    expect(rows, `${width}px rows inside their list`).toBe(0);
    // a long name ends in an ellipsis instead of widening the row; in a row under 280 px it wraps to two lines
    const name = page.locator('#panel .uix-file-row__name', { hasText: 'Rückmeldung' });
    const fit = await name.evaluate((el) => {
      const row = el.closest('.uix-file-row').getBoundingClientRect().width;
      const style = getComputedStyle(el);
      const lines = Math.round(el.getBoundingClientRect().height / parseFloat(style.lineHeight));
      return { row, lines, ellipsis: el.scrollWidth > el.clientWidth && style.textOverflow === 'ellipsis', clamped: el.scrollHeight > el.clientHeight };
    });
    if (fit.row > 280) expect(fit.ellipsis, `${width}px: one line, ellipsis`).toBe(true);
    else expect(fit.lines, `${width}px: two lines in a ${fit.row} px row`).toBe(2);
    await testInfo.attach(`file-kit-${width}-${theme}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  }
});

test('forced colours: the type label keeps a box and the upload fill stays visible', async ({ page }, testInfo) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await open(page, themeOf(testInfo));
  const label = page.locator('#live .uix-file-icon__type');
  expect(await label.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('1px');
  expect(await page.locator('#live .uix-file-row__fill').evaluate((el) => Number(getComputedStyle(el).opacity))).toBeCloseTo(0.35, 2);
  await testInfo.attach(`file-kit-forced-colors.png`, { body: await page.locator('#panel').screenshot(), contentType: 'image/png' });
});

test('a 226 px rail: names wrap to two lines, the meta wraps, and resting actions take no width until hover', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const rail = page.locator('#narrow');
  const row = rail.locator('.uix-file-row', { hasText: 'Notfallhandbuch' });
  const measure = () => row.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const name = el.querySelector('.uix-file-row__name');
    const text = el.querySelector('.uix-file-row__text').getBoundingClientRect();
    const actions = el.querySelector('.uix-file-row__actions');
    const style = getComputedStyle(name);
    return {
      row: Math.round(box.width),
      nameLines: Math.round(name.getBoundingClientRect().height / parseFloat(style.lineHeight)),
      nameCut: name.scrollWidth > name.clientWidth + 0.5,
      // how much of the row's inner end the text may use: the actions are lifted out of the flow
      textEndGap: Math.round(box.right - text.right),
      actionsPosition: getComputedStyle(actions).position,
      actionsOpacity: getComputedStyle(actions.firstElementChild).opacity,
      metaWraps: getComputedStyle(el.querySelector('.uix-file-row__meta')).whiteSpace,
    };
  });
  await page.mouse.move(1, 1);
  const rest = await measure();
  expect(rest.row).toBeLessThanOrEqual(228);
  expect(rest.nameLines).toBe(2);
  expect(rest.nameCut).toBe(false);
  expect(rest.metaWraps).toBe('normal');
  expect(rest.actionsPosition).toBe('absolute');
  expect(rest.actionsOpacity).toBe('0');
  expect(rest.textEndGap, 'the text runs to the row padding, not to an empty action column').toBeLessThanOrEqual(12);
  await row.hover();
  await expect.poll(async () => (await measure()).actionsOpacity).toBe('1');
  await page.mouse.move(1, 1);
  await row.getByRole('link', { name: 'Notfallhandbuch_Förderportal_v4.pdf herunterladen' }).focus();
  await expect.poll(async () => (await measure()).actionsOpacity).toBe('1');
  // a state action keeps its place in the flow: the failed row's retry moves under its words
  const failed = rail.locator('.uix-file-row[data-state="failed"]');
  expect(await failed.locator('.uix-file-row__actions').evaluate((el) => getComputedStyle(el).position)).toBe('relative');
  // nothing in the rail leaves the rail
  const outside = await rail.evaluate((el) => {
    const box = el.getBoundingClientRect();
    // the upload's leading edge starts off the row on purpose; the row clips it
    return [...el.querySelectorAll('.uix-file-row, .uix-file-row *')].filter((n) => {
      const r = n.getBoundingClientRect();
      return r.width > 0 && (r.right > box.right + 0.5 || r.left < box.left - 0.5);
    }).map((n) => String(n.className?.baseVal ?? n.className)).filter((c) => c !== 'uix-file-row__edge');
  });
  expect(outside).toEqual([]);
  await testInfo.attach(`file-kit-rail-226-${themeOf(testInfo)}.png`, { body: await rail.screenshot(), contentType: 'image/png' });
});
