import { test, expect } from '@playwright/test';

/* Serbian italic check (enterprise UX study, roadmap #20). Serbian and Macedonian italic б г д п т are
 * not the Russian shapes; a font holds them as an OpenType `locl` substitution, which the browser
 * applies to text tagged lang="sr" (sr-Cyrl here, as the label packs tag it). tests/serbian-italic/page.html
 * sets each letter in each face twice, as Russian and as Serbian, and this spec compares the two
 * renderings pixel for pixel: identical means the face has no Serbian form for that letter (or the
 * browser did not apply it).
 *
 * EXPECTED pins what the kit fonts do, letter by letter ('sr' = a Serbian form, 'ru' = the Russian
 * shape for both), so a font update that adds or drops a form shows up here. The finding and the
 * fallback are in the docs: Foundations → Localisation checks.
 *
 * The kit ships no @font-face, so the fonts come from Google Fonts, as a product loads them. With no
 * network the spec skips and says so. Chromium only: shaping differs per engine, and the claim is about
 * the fonts. */

const PAGE = '/tests/serbian-italic/page.html';

/**
 * Per face, per letter: 'sr' (Serbian form shown) or 'ru' (same as Russian). Measured in CI on 2026-11-20
 * (PR #311): neither kit font, as Google Fonts serves it, has a Serbian form for any of the five. The
 * runner's system-ui italic did show Serbian б, д and п, so Chromium does apply `locl` from `lang`;
 * that face depends on the runner image, so it is reported, not pinned.
 */
const RUSSIAN = { б: 'ru', г: 'ru', д: 'ru', п: 'ru', т: 'ru' };
const EXPECTED = {
  'inter-italic': RUSSIAN,
  'inter-italic-600': RUSSIAN,
  'plex-italic': RUSSIAN,
  'plex-italic-600': RUSSIAN,
};

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'light', 'glyph shapes do not depend on the theme; Chromium light only');
});

test('Serbian italic б г д п т: which kit faces carry the locl forms', async ({ page }, testInfo) => {
  await page.goto(PAGE, { waitUntil: 'load' });
  const loaded = await page.evaluate(async () => {
    await Promise.all(window.FACES.map((f) => document.fonts.load(`${f.style} ${f.weight} 48px ${f.family}`, window.LETTERS.join('')).catch(() => [])));
    await document.fonts.ready;
    const faces = [...document.fonts].filter((f) => f.status === 'loaded');
    const has = (family, style) => faces.some((f) => f.family.replace(/"/g, '') === family && f.style === style);
    return { inter: has('Inter', 'italic'), plex: has('IBM Plex Sans', 'italic') };
  });
  test.skip(!loaded.inter || !loaded.plex, `Google Fonts not reachable (Inter italic ${loaded.inter}, Plex italic ${loaded.plex}); nothing to measure`);

  const faces = await page.evaluate(() => window.FACES.map((f) => f.id));
  const letters = await page.evaluate(() => window.LETTERS);
  const result = {};
  for (const face of faces) {
    result[face] = {};
    for (const letter of letters) {
      const pair = page.locator(`[data-pair="${face}:${letter}"]`);
      const [ru, sr] = await Promise.all([pair.locator('[data-lang="ru"]').screenshot(), pair.locator('[data-lang="sr"]').screenshot()]);
      result[face][letter] = ru.equals(sr) ? 'ru' : 'sr';
    }
  }

  // the comparison can tell letters apart at all: б and в in the same face never render alike
  const control = page.locator('[data-pair="inter-italic:б"] [data-lang="ru"]');
  const b = await control.screenshot();
  await control.evaluate((el) => { el.textContent = 'в'; });
  expect(b.equals(await control.screenshot()), 'the pixel comparison must see a different letter').toBe(false);
  await control.evaluate((el) => { el.textContent = 'б'; });

  const summary = Object.entries(result).map(([face, l]) => `${face}: ${Object.entries(l).map(([k, v]) => `${k} ${v}`).join(', ')}`).join('\n');
  await testInfo.attach('serbian-italic.json', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  await testInfo.attach('serbian-italic.png', { body: await page.locator('main').screenshot(), contentType: 'image/png' });
  testInfo.annotations.push({ type: 'serbian italic', description: summary });
  console.log(`Serbian italic (sr-Cyrl vs ru):
${summary}`);

  for (const [face, expected] of Object.entries(EXPECTED)) {
    expect(result[face], `${face}: the Serbian forms changed; update EXPECTED and docs → Foundations → Localisation checks`).toEqual(expected);
  }
});
