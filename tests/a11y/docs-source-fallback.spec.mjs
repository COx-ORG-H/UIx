/* The docs still open without a build.
 *
 * build/css/styles.css is built, not committed (a one-line minified file conflicts between any
 * two PRs that touch component CSS). In a clone that has not run `npm run build` the stylesheet
 * request 404s, and the page's `onerror` swaps in styles/main.css, which pulls the same authored
 * files through native @import. This spec takes the bundle away and checks two things:
 *   1. the fallback engages (the swap is one attribute, easy to lose in an edit of <head>);
 *   2. every element then computes the same style as it does with the bundle — a rule that only
 *      works after bundling (a path postcss-import resolves and a browser does not, an @import
 *      placed where a browser ignores it) would show up here.
 * Large pages are sampled evenly (MAX_ELEMENTS). Custom properties are left out of the comparison:
 * they keep their authored text, which the minifier rewrites (`0.5` → `.5`) without changing any
 * resolved value.
 * Theme-independent, so it runs once (light).
 */
import { test, expect } from '@playwright/test';
import { settleAnimations } from './settle.mjs';

const PAGES = [
  'docs/explorer.html#examples-form-controls',
  'docs/explorer.html#examples-data-display',
  'docs/explorer.html#examples-workspace',
  'tables.html',
];

test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== 'light', 'theme-independent'));

// tables.html has several thousand elements; an even sample of this many keeps the spec in seconds.
const MAX_ELEMENTS = 500;

/** [tag.class, every resolved property] for an even sample of the page's elements, in document order. */
const computedStyles = async (page, url, { bundle }) => {
  // Same fonts (none) and no animation mid-flight in either pass, so used values are comparable.
  await page.route('**/fonts.googleapis.com/**', (route) => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (!bundle) await page.route('**/build/css/styles.css', (route) => route.fulfill({ status: 404, body: 'not built' }));
  await page.goto(url, { waitUntil: 'networkidle' });
  await expect.poll(() => page.evaluate(() => [...document.styleSheets].map((sheet) => sheet.href ?? '')), {
    message: bundle ? 'the built bundle is loaded' : 'the authored-source fallback is loaded',
  }).toContainEqual(expect.stringMatching(bundle ? /\/build\/css\/styles\.css$/ : /\/styles\/main\.css$/));
  await settleAnimations(page);
  return page.evaluate((limit) => {
    const all = [...document.querySelectorAll('body *')];
    const stride = Math.ceil(all.length / limit);
    const read = (el, pseudo) => {
      const style = getComputedStyle(el, pseudo);
      if (pseudo && style.content === 'none') return []; // no box, nothing rendered
      return [...style].filter((name) => !name.startsWith('--')).map((name) => `${name}:${style.getPropertyValue(name)}`);
    };
    return all.filter((_, i) => i % stride === 0).map((el) => [
      `${el.tagName.toLowerCase()}.${el.getAttribute('class') ?? ''}`,
      [...read(el), ...read(el, '::before'), ...read(el, '::after')],
    ]);
  }, MAX_ELEMENTS);
};

for (const url of PAGES) {
  test(`${url} renders the same from the authored sources as from the bundle`, async ({ browser }) => {
    const pass = async (bundle) => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      try {
        return await computedStyles(await context.newPage(), url, { bundle });
      } finally {
        await context.close();
      }
    };
    const built = await pass(true);
    const source = await pass(false);

    // A stylesheet that failed to load would also make both passes "equal" on a bare page.
    expect(built.length, 'the page rendered its content').toBeGreaterThan(100);
    expect(source.map(([el]) => el), 'same elements in both passes').toEqual(built.map(([el]) => el));

    const differences = [];
    built.forEach(([el, props], i) => {
      const changed = props.length === source[i][1].length
        ? props.filter((prop, j) => prop !== source[i][1][j])
        : [`${props.length} properties, ${source[i][1].length} from the sources (a pseudo-element appeared or vanished)`];
      if (changed.length) differences.push(`${el}: bundle ${changed.slice(0, 3).join('; ')}`);
    });
    expect(differences.slice(0, 10), `${differences.length} element(s) differ`).toEqual([]);
  });
}
