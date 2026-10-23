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
 *   - axe is clean with each setting on. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

test('five named radio groups; a choice applies, is stored, and the ThemeSwitcher follows', async ({ page }) => {
  await open(page, null, { colorScheme: 'light' });
  for (const name of ['Theme', 'Contrast', 'Text size', 'Motion', 'Density']) await expect(page.locator('#prefs').getByRole('radiogroup', { name })).toBeVisible();
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
// for the in-app preference; a toast fades instead of sliding under the in-app preference too.
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
      return { name: s.animationName, duration: s.animationDuration, outline: s.outlineStyle, toast: t.animationName };
    });
    expect(seen.name).toBe('uix-arrival-static');
    expect(parseFloat(seen.duration)).toBeGreaterThan(1);
    expect(seen.outline, 'the outline is still drawn 300 ms in').toBe('solid');
    expect(seen.toast).toBe('uix-fade-in');
  });
}
