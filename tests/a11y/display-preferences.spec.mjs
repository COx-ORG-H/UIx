/* The display-preference contract (HAR-1372), in Chromium. Harness: tests/display-preferences/.
 *   - the pre-paint script applies a stored dark theme and xl text before the stylesheet and the
 *     app load (no flash), and `system` follows prefers-color-scheme;
 *   - DisplayPreferences: five named radio groups, the keyboard model of Segmented; a choice
 *     writes the attribute, is stored, and a ThemeSwitcher in the same tab follows;
 *   - a theme switch suspends transitions for that frame (data-uix-switching), then lets them run;
 *   - data-contrast="more": muted text >= 7:1 and hairlines >= 3:1 on the surface, light and dark;
 *   - data-text-scale: the type ramp scales (body 14 px -> 17.5 px at xl); data-density: the control
 *     and row heights follow;
 *   - data-motion="reduce" without the OS setting: transitions keep only fades, the spinner pulses,
 *     useReducedMotion says so;
 *   - data-transparency="reduce" (and data-contrast="more", which implies it): the dialog and drawer
 *     scrims and the progress overlay stop blurring and turn firmer, a Select's options arrive
 *     without the blur, and `system` follows prefers-reduced-transparency (CDP-emulated), live;
 *   - axe is clean with each setting on. */
import { test, expect } from '@playwright/test';
import AxeBuilder from './axe.mjs';

const HARNESS = '/tests/display-preferences/harness.html';
const KEY = 'uix-harness-display';

async function open(page, stored, opts = {}) {
  if (opts.colorScheme) await page.emulateMedia({ colorScheme: opts.colorScheme });
  await page.addInitScript(([k, v]) => { try { if (v) localStorage.setItem(k, v); } catch { /* private */ } }, [KEY, stored ? JSON.stringify(stored) : '']);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('#prefs')).toBeVisible();
}

const ratio = (page, fgVar, bgVar = '--uix-surface') => page.evaluate(([f, b]) => {
  const probe = (prop, v) => { const d = document.createElement('div'); d.style[prop] = `var(${v})`; document.body.append(d); const c = getComputedStyle(d)[prop]; d.remove(); return c; };
  // a color-mix() computes to color(srgb r g b / a) with 0..1 channels; rgb() has 0..255
  const rgb = (c) => {
    const n = c.replace(/^color\(srgb/, '').match(/[\d.]+/g).map(Number);
    return c.startsWith('color(') ? [n[0] * 255, n[1] * 255, n[2] * 255, n[3] ?? 1] : n;
  };
  const bg = rgb(probe('backgroundColor', b));
  const fgRaw = rgb(probe('color', f));
  const a = fgRaw[3] ?? 1;
  const fg = [0, 1, 2].map((i) => fgRaw[i] * a + bg[i] * (1 - a));
  const lum = (x) => x.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}, [fgVar, bgVar]);

const axe = async (page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes[0]?.target}`);
};

test('the pre-paint script applies the stored theme and text size before anything else runs', async ({ page }) => {
  await open(page, { theme: 'dark', textScale: 'xl' }, { colorScheme: 'light' });
  expect(await page.evaluate(() => window.__firstPaint)).toEqual({ theme: 'dark', scale: 'xl' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('system follows prefers-color-scheme, live', async ({ page }) => {
  await open(page, null, { colorScheme: 'dark' });
  expect(await page.evaluate(() => window.__firstPaint.theme)).toBe('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('six named radio groups; a choice applies, is stored, and the ThemeSwitcher follows', async ({ page }) => {
  await open(page, null, { colorScheme: 'light' });
  for (const name of ['Theme', 'Contrast', 'Text size', 'Motion', 'Transparency', 'Density']) await expect(page.locator('#prefs').getByRole('radiogroup', { name })).toBeVisible();
  const theme = page.locator('#prefs').getByRole('radiogroup', { name: 'Theme' });
  await theme.getByRole('radio', { name: 'System' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(theme.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#switcher').getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  expect(JSON.parse(await page.evaluate((k) => localStorage.getItem(k), KEY)).theme).toBe('dark');
  await page.locator('#prefs').getByRole('radiogroup', { name: 'Text size' }).getByRole('radio', { name: 'Larger' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-text-scale', 'xl');
  await page.reload({ waitUntil: 'networkidle' });
  expect(await page.evaluate(() => window.__firstPaint)).toEqual({ theme: 'dark', scale: 'xl' });
});

test('a theme switch runs no transition for that frame, then transitions work again', async ({ page }) => {
  await open(page, { theme: 'light' }, { colorScheme: 'light' });
  const seen = await page.evaluate(async () => {
    const root = document.documentElement;
    const option = document.querySelector('#switcher [role="radio"]:nth-child(2)');
    const during = new Promise((resolve) => {
      new MutationObserver((records, obs) => {
        if (records.some((r) => r.attributeName === 'data-theme')) {
          obs.disconnect();
          resolve({ switching: root.hasAttribute('data-uix-switching'), transition: getComputedStyle(option).transitionDuration });
        }
      }).observe(root, { attributes: true });
    });
    option.click();
    const at = await during;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))));
    return { at, after: root.hasAttribute('data-uix-switching'), afterTransition: getComputedStyle(option).transitionDuration };
  });
  expect(seen.at.switching).toBe(true);
  expect(seen.at.transition.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
  expect(seen.after).toBe(false);
  expect(seen.afterTransition.split(',').some((d) => parseFloat(d) > 0)).toBe(true);
});

for (const theme of ['light', 'dark']) {
  test(`more contrast (${theme}): muted text >= 7:1, hushed >= 7:1, hairlines >= 3:1`, async ({ page }) => {
    await open(page, { theme, contrast: 'more' });
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');
    expect(await ratio(page, '--uix-text-muted')).toBeGreaterThanOrEqual(7);
    expect(await ratio(page, '--uix-text-hushed')).toBeGreaterThanOrEqual(7);
    expect(await ratio(page, '--uix-border')).toBeGreaterThanOrEqual(3);
    expect(await ratio(page, '--uix-border-strong')).toBeGreaterThanOrEqual(3);
    const field = await page.locator('#field').evaluate((el) => getComputedStyle(el).borderTopColor);
    const border = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--uix-border)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; });
    expect(field).toBe(border);
    expect(await axe(page)).toEqual([]);
  });
}

test('text scale and density move the tokens they own', async ({ page }) => {
  await open(page, { theme: 'light' });
  const read = () => page.evaluate(() => ({
    body: parseFloat(getComputedStyle(document.querySelector('#hushed')).fontSize),
    control: getComputedStyle(document.querySelector('#field')).height,
    row: getComputedStyle(document.querySelector('#row td')).height,
  }));
  const base = await read();
  const group = (name) => page.locator('#prefs').getByRole('radiogroup', { name });
  await group('Text size').getByRole('radio', { name: 'Larger' }).click();
  await group('Density').getByRole('radio', { name: 'Compact' }).click();
  const changed = await read();
  expect(changed.body / base.body).toBeCloseTo(1.25, 2);
  expect(changed.control).toBe('32px');
  expect(changed.row).toBe('44px');
  await group('Density').getByRole('radio', { name: 'Comfortable' }).click();
  expect((await read()).control).toBe('40px');
  // 320 px with the largest text: nothing scrolls sideways
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  expect(await axe(page)).toEqual([]);
});

test('reduced motion chosen in the app, with the OS set to no preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page, { theme: 'light' });
  const probe = () => page.evaluate(() => ({
    property: getComputedStyle(document.querySelector('#probe')).transitionProperty,
    spinner: getComputedStyle(document.querySelector('#spinner')).animationName,
    hook: document.querySelector('#reduced').textContent,
  }));
  const before = await probe();
  expect(before.property).toContain('transform');
  expect(before.spinner).toBe('uix-spin');
  expect(before.hook).toBe('full');
  await page.locator('#prefs').getByRole('radiogroup', { name: 'Motion' }).getByRole('radio', { name: 'Reduce' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await expect(page.locator('#reduced')).toHaveText('reduced');
  // the switch itself suspends every transition for two frames; read the steady state after it
  await expect(page.locator('html')).not.toHaveAttribute('data-uix-switching', /.*/);
  const after = await probe();
  expect(after.property).not.toContain('transform');
  expect(after.property).toContain('opacity');
  expect(after.spinner).toBe('uix-pulse');
});

test('axe: the panel and the switcher, both themes', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await open(page, { theme });
    expect(await axe(page)).toEqual([]);
  }
});

// Review of #165: the selected segment of a ThemeSwitcher / DisplayPreferences group must be a
// visible boundary (WCAG 1.4.11): its fill is only 1.05:1 (dark) / 1.09:1 (light) on the track, so
// it carries an inset --uix-text-muted ring, >= 3:1 on the track in both themes.
for (const theme of ['light', 'dark']) {
  test(`${theme}: the selected segment has a ring of at least 3:1 against the track`, async ({ page }) => {
    await open(page, { theme });
    const seen = await page.locator('#prefs [role="radiogroup"]').first().evaluate((group) => {
      const checked = group.querySelector('[aria-checked="true"]');
      const shadow = getComputedStyle(checked).boxShadow;
      const probe = (v) => { const d = document.createElement('div'); d.style.color = `var(${v})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
      return { shadow, muted: probe('--uix-text-muted'), track: getComputedStyle(group).backgroundColor };
    });
    expect(seen.shadow).toContain(`${seen.muted} 0px 0px 0px 1px inset`);
    expect(await ratio(page, '--uix-text-muted', '--uix-bg-subtle')).toBeGreaterThanOrEqual(3);
  });
}

// Review of #165: the arrival highlight survives reduced motion (the policy ends every keyframe
// animation at once, which ended its steady outline before anyone saw it), for the OS setting and
// for the in-app preference; a toast fades instead of sliding under the in-app preference too. Toasts
// move on transitions (HAR-2578): reduced motion leaves fades in their transition list, never transform.
for (const via of ['os', 'app']) {
  test(`reduced motion (${via}): the arrival outline stays for the highlight time; a toast only fades`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: via === 'os' ? 'reduce' : 'no-preference' });
    await open(page, via === 'app' ? { theme: 'light', motion: 'reduce' } : { theme: 'light' });
    const seen = await page.evaluate(async () => {
      const target = document.createElement('div');
      target.textContent = 'Landed here';
      const toast = document.createElement('div');
      toast.className = 'uix-toast';
      document.querySelector('#specimen').append(target, toast);
      target.classList.add('uix-arrival');
      await new Promise((r) => setTimeout(r, 300));
      const s = getComputedStyle(target);
      const t = getComputedStyle(toast);
      return { name: s.animationName, duration: s.animationDuration, outline: s.outlineStyle, toast: t.transitionProperty.split(', ') };
    });
    expect(seen.name).toBe('uix-arrival-static');
    expect(parseFloat(seen.duration)).toBeGreaterThan(1);
    expect(seen.outline, 'the outline is still drawn 300 ms in').toBe('solid');
    expect(seen.toast, 'a toast fades').toContain('opacity');
    expect(seen.toast, 'and does not slide').not.toContain('transform');
  });
}

// Red on master since #170: a window that narrows while the Segmented indicator slides wraps the
// options before the slide ends, and the indicator, still at its old place, widened the page in CI
// (Linux fonts). A wide font reproduces it on any OS; the track now clips the indicator.
test('a slide cut short by a narrower window never widens the page', async ({ page }) => {
  await open(page, { theme: 'light' });
  await page.addStyleTag({ content: 'html, body, button { font-family: Verdana, sans-serif !important; letter-spacing: .06em; }' });
  const group = (name) => page.locator('#prefs').getByRole('radiogroup', { name });
  await group('Text size').getByRole('radio', { name: 'Larger' }).click();
  await group('Density').getByRole('radio', { name: 'Comfortable' }).click();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  // Whether the slide is still running at that moment depends on the machine (it was in CI, not
  // here), so the clip itself is pinned too: an indicator left behind cannot reach the page.
  const clip = await group('Density').evaluate((el) => { const s = getComputedStyle(el.closest('.uix-segmented') ?? el); return `${s.overflowX} ${s.overflowY}`; });
  expect(clip).toBe('clip clip');
});

// ── reduced transparency ──────────────────────────────────────────────────────
/** What the blur and scrim of each layer compute to: the dialog's and the drawer's ::backdrop (both
 * opened for real) and the progress overlay. `alpha` is the scrim colour's alpha. */
async function layers(page) {
  await expect(page.locator('html')).not.toHaveAttribute('data-uix-switching', /.*/);
  const tokens = await page.evaluate(() => Object.fromEntries(['--uix-scrim-blur', '--uix-arrive-blur']
    .map((n) => [n, getComputedStyle(document.documentElement).getPropertyValue(n).trim()])));
  // rgba(r, g, b, a) and color(srgb r g b / a) both carry the alpha fourth; rgb() has none
  const alpha = (c) => c.match(/[\d.]+/g)?.map(Number)[3] ?? 1;
  const backdrop = async (button, dialog) => {
    await page.locator(button).click();
    await expect(page.locator(dialog)).toHaveAttribute('open', '');
    const seen = await page.locator(dialog).evaluate((el) => { const s = getComputedStyle(el, '::backdrop'); return { filter: s.backdropFilter, background: s.backgroundColor }; });
    await page.keyboard.press('Escape');
    await expect(page.locator(dialog)).not.toHaveAttribute('open', '');
    return { filter: seen.filter, alpha: alpha(seen.background) };
  };
  const modal = await backdrop('#open-modal', '#modal');
  const drawer = await backdrop('#open-drawer', '#drawer');
  const overlay = await page.locator('#overlay').evaluate((el) => { const s = getComputedStyle(el); return { filter: s.backdropFilter, background: s.backgroundColor }; });
  return { tokens, modal, drawer, overlay: { filter: overlay.filter, alpha: alpha(overlay.background) }, clear: await page.locator('#clear').textContent() };
}

for (const theme of ['light', 'dark']) {
  test(`${theme}: standard transparency keeps the blur; reduce (chosen, or implied by more contrast) removes it and firms the scrims`, async ({ page }) => {
    await open(page, { theme, transparency: 'standard' });
    const standard = await layers(page);
    expect(standard.tokens).toEqual({ '--uix-scrim-blur': '4px', '--uix-arrive-blur': '4px' });
    expect(standard.modal.filter).toBe('blur(4px)');
    expect(standard.drawer.filter).toBe('blur(4px)');
    expect(standard.overlay.filter).toBe('blur(2px)');
    expect(standard.clear).toBe('see-through');

    for (const stored of [{ theme, transparency: 'reduce' }, { theme, contrast: 'more', transparency: 'standard' }]) {
      await open(page, stored);
      const reduced = await layers(page);
      const label = JSON.stringify(stored);
      expect(reduced.tokens, label).toEqual({ '--uix-scrim-blur': '0px', '--uix-arrive-blur': '0px' });
      for (const layer of ['modal', 'drawer']) {
        expect(['none', 'blur(0px)'], `${label} ${layer}`).toContain(reduced[layer].filter);
        // a sharp page behind needs a firmer scrim to keep the layer apart: .5 -> .6
        expect(reduced[layer].alpha, `${label} ${layer}`).toBeGreaterThan(standard[layer].alpha + 0.05);
      }
      expect(reduced.overlay.filter, label).toBe('none');
      expect(reduced.overlay.alpha, label).toBeGreaterThan(standard.overlay.alpha);
      expect(reduced.clear, label).toBe('solid');
      expect(await axe(page), label).toEqual([]);
    }
  });
}

/** Every distinct `filter` an option of the Select's list carries in the first 400 ms after a pointer open. */
async function arrivalFilters(page) {
  await expect(page.locator('html')).not.toHaveAttribute('data-uix-switching', /.*/);
  const sampling = page.evaluate(() => new Promise((resolve) => {
    const seen = new Set();
    const start = performance.now();
    const tick = () => {
      for (const el of document.querySelectorAll('[role="option"]')) if (el.style.filter) seen.add(el.style.filter);
      if (performance.now() - start < 400) requestAnimationFrame(tick); else resolve([...seen]);
    };
    requestAnimationFrame(tick);
  }));
  await page.locator('#queue').click();
  const filters = await sampling;
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  return filters;
}

test('a Select opened with the pointer: its options never blur (they come with the list), under standard or reduce', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page, { theme: 'light', transparency: 'standard' });
  expect(await arrivalFilters(page), 'standard: the frequency rule dropped the row arrival').toEqual([]);
  await page.locator('#prefs').getByRole('radiogroup', { name: 'Transparency' }).getByRole('radio', { name: 'Reduce' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-transparency', 'reduce');
  expect(await arrivalFilters(page)).toEqual([]);
});

test('system follows prefers-reduced-transparency before the first paint and live; standard overrides it', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  const emulate = (value) => cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value }] });
  await emulate('reduce');
  await open(page, null);
  expect(await page.evaluate(() => window.__firstPaintTransparency), 'the head script resolved system').toBe('reduce');
  await expect(page.locator('html')).toHaveAttribute('data-transparency', 'reduce');
  await emulate('no-preference');
  await expect(page.locator('html')).not.toHaveAttribute('data-transparency', /.*/);
  await emulate('reduce');
  await expect(page.locator('html')).toHaveAttribute('data-transparency', 'reduce');
  await page.locator('#prefs').getByRole('radiogroup', { name: 'Transparency' }).getByRole('radio', { name: 'Standard' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-transparency', /.*/);
  expect(JSON.parse(await page.evaluate((k) => localStorage.getItem(k), KEY)).transparency).toBe('standard');
  await page.reload({ waitUntil: 'networkidle' });
  expect(await page.evaluate(() => window.__firstPaintTransparency), 'standard is kept across a reload').toBe(null);
});
