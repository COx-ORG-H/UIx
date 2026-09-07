/* Unit tests for the pure helpers in docs.js. Run: node --test docs/docs.test.js  (zero deps).
   Mirrors guide/app.test.js: node:test + node:assert/strict, imports the ESM helpers directly.
   The module's DOM block is guarded by `typeof document`, so importing it here is DOM-free. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  slugify,
  componentNav,
  renderPropsTable,
  esc,
  normalizeHash,
  buildSearchIndex,
  matchDocs,
  COMPONENT_GROUPS,
  COMPONENT_ITEMS,
  COMPOSITE_PATTERNS,
  SHOWCASE_SECTION_MAP,
  REACT_COMPONENT_SLUGS,
  exampleRouteFor,
  getPage,
} from './docs.js';
import { ADDITIONAL_EXAMPLES, SHOWCASE_PAGES } from './showcase-data.js';

const docsDirectory = dirname(fileURLToPath(import.meta.url));

test('slugify: lowercases, hyphenates, trims edges', () => {
  assert.equal(slugify('Button'), 'button');
  assert.equal(slugify('Status Pill'), 'status-pill');
  assert.equal(slugify('  App  Shell  '), 'app-shell');
  assert.equal(slugify('Tabs / Nav'), 'tabs-nav');
  assert.equal(slugify('Input(v2)!'), 'input-v2');
});

test('slugify: collapses runs and strips leading/trailing separators', () => {
  assert.equal(slugify('--Foo--Bar--'), 'foo-bar');
  assert.equal(slugify('a   b'), 'a-b');
  assert.equal(slugify(''), '');
});

test('componentNav: strings → {name, slug, href, group:null}', () => {
  assert.deepEqual(componentNav(['Button', 'Status Pill']), [
    { name: 'Button', slug: 'button', href: '#button', group: null },
    { name: 'Status Pill', slug: 'status-pill', href: '#status-pill', group: null },
  ]);
});

test('componentNav: objects carry a group through', () => {
  assert.deepEqual(componentNav([{ name: 'Table', group: 'Data display' }]), [
    { name: 'Table', slug: 'table', href: '#table', group: 'Data display' },
  ]);
});

test('componentNav: empty/absent list → empty array', () => {
  assert.deepEqual(componentNav([]), []);
  assert.deepEqual(componentNav(), []);
});

test('renderPropsTable: empty → muted note, not a table', () => {
  const html = renderPropsTable([]);
  assert.match(html, /No props documented\./);
  assert.doesNotMatch(html, /<table/);
  assert.equal(renderPropsTable(), renderPropsTable([]));
});

test('renderPropsTable: builds a header + one row per prop', () => {
  const html = renderPropsTable([
    { name: 'variant', type: "'primary' | 'ghost'", default: 'primary', description: 'Visual style' },
    { name: 'disabled', type: 'boolean' },
  ]);
  assert.match(html, /<table class="uix-table">/);
  assert.match(html, /<th scope="col">Prop<\/th>/);
  assert.match(html, /variant/);
  assert.match(html, /disabled/);
  // exactly two body rows
  assert.equal((html.match(/<tr>/g) || []).length, 3); // 1 header row + 2 body rows
});

test('renderPropsTable: missing type/default render as em dash', () => {
  const html = renderPropsTable([{ name: 'onClick' }]);
  assert.match(html, /<td>—<\/td>/);
});

test('renderPropsTable: required flag renders a marker', () => {
  const html = renderPropsTable([{ name: 'id', type: 'string', required: true }]);
  assert.match(html, /uix-docs__req/);
});

test('renderPropsTable: escapes HTML in every field (no injection)', () => {
  const html = renderPropsTable([
    { name: '<x>', type: '<T>', default: '<d>', description: '<script>alert(1)</script>' },
  ]);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;x&gt;/);
  assert.match(html, /&lt;T&gt;/);
});

test('esc: escapes the five HTML-significant characters', () => {
  assert.equal(esc(`<a href="x" data='y'>&`), '&lt;a href=&quot;x&quot; data=&#39;y&#39;&gt;&amp;');
});

test('normalizeHash: creates a stable route and falls back to introduction', () => {
  assert.equal(normalizeHash('#Design Tokens'), 'design-tokens');
  assert.equal(normalizeHash('#status-pill?theme=dark'), 'status-pill');
  assert.equal(normalizeHash(''), 'introduction');
});

test('matchDocs: exact and prefix name matches outrank keyword matches', () => {
  const index = buildSearchIndex([
    { name: 'Table', group: 'Components', summary: 'Dense data display', keywords: ['grid'] },
    { name: 'Data workflows', group: 'Patterns', summary: 'Table filters and saved views', keywords: ['table'] },
    { name: 'Tabs', group: 'Components', summary: 'Peer navigation', keywords: [] },
  ]);
  assert.deepEqual(matchDocs(index, 'table').map((item) => item.name), ['Table', 'Data workflows']);
  assert.equal(matchDocs(index, 'tab')[0].name, 'Table');
});

test('matchDocs: all query terms must match and results respect the limit', () => {
  const index = buildSearchIndex([
    { name: 'Status Pill', group: 'Components', summary: 'Semantic status and SLA', keywords: ['badge'] },
    { name: 'Alert', group: 'Components', summary: 'Semantic feedback', keywords: ['status'] },
    { name: 'Theming', group: 'Foundations', summary: 'Product brand profiles', keywords: ['dark'] },
  ]);
  assert.deepEqual(matchDocs(index, 'status semantic').map((item) => item.name), ['Status Pill', 'Alert']);
  assert.equal(matchDocs(index, '', 2).length, 2);
  assert.deepEqual(matchDocs(index, 'missing'), []);
});

test('component catalogue covers every independently importable CSS module exactly once', () => {
  const componentDirectory = resolve(docsDirectory, '../styles/components');
  const cssModules = readdirSync(componentDirectory)
    .filter((name) => name.endsWith('.css'))
    .map((name) => name.slice(0, -4))
    .sort();
  const documentedModules = COMPONENT_ITEMS
    .filter((item) => !item.composite)
    .map((item) => item.slug)
    .sort();

  assert.equal(new Set(COMPONENT_ITEMS.map((item) => item.slug)).size, COMPONENT_ITEMS.length);
  assert.deepEqual(documentedModules, cssModules);
});

test('showcase-only compositions are explicit and never presented as CSS exports', () => {
  assert.deepEqual(COMPOSITE_PATTERNS, ['Nav favourites', 'Composer']);
  assert.deepEqual(
    COMPONENT_ITEMS.filter((item) => item.composite).map((item) => item.name),
    COMPOSITE_PATTERNS,
  );
  assert.equal(Object.values(COMPONENT_GROUPS).flat().length, 82);
});

test('every retired style-guide section is preserved as a documentation route', () => {
  const sectionIds = SHOWCASE_PAGES
    .filter((page) => page.source === 'core')
    .map((page) => page.sectionId)
    .sort();
  assert.deepEqual(Object.keys(SHOWCASE_SECTION_MAP).sort(), sectionIds);
  for (const route of Object.values(SHOWCASE_SECTION_MAP)) {
    assert.equal(getPage(route), route);
  }
});

test('every catalogue entry resolves to its own reference route', () => {
  for (const item of COMPONENT_ITEMS) {
    assert.equal(getPage(item.slug), item.slug);
    assert.equal(getPage(exampleRouteFor(item)), exampleRouteFor(item));
  }
  assert.equal(getPage('not-a-real-page'), 'introduction');
});

test('all migrated showcase routes resolve and remain uniquely addressable', () => {
  assert.equal(SHOWCASE_PAGES.length, 25);
  assert.equal(new Set(SHOWCASE_PAGES.map((page) => page.slug)).size, SHOWCASE_PAGES.length);
  assert.equal(SHOWCASE_PAGES.filter((page) => page.source === 'advanced').length, 10);
  assert.equal(SHOWCASE_PAGES.filter((page) => page.source === 'workspace').length, 1);
  for (const page of SHOWCASE_PAGES) assert.equal(getPage(page.slug), page.slug);
});

test('every CSS module is exercised by an integrated example', () => {
  const componentDirectory = resolve(docsDirectory, '../styles/components');
  const exampleMarkup = [
    ...SHOWCASE_PAGES.map((page) => page.html),
    ...ADDITIONAL_EXAMPLES.map((example) => example.html),
  ].join('\n');
  const uncovered = readdirSync(componentDirectory)
    .filter((name) => name.endsWith('.css'))
    .filter((name) => {
      const css = readFileSync(resolve(componentDirectory, name), 'utf8');
      const classes = [...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)]
        .map((match) => match[1])
        .filter((className) => className.startsWith('uix-'));
      return !classes.some((className) => exampleMarkup.includes(className));
    });
  assert.deepEqual(uncovered, []);
});

test('integrated examples do not use phantom public UIx classes', () => {
  const stylesDirectory = resolve(docsDirectory, '../styles');
  const cssFiles = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.name.endsWith('.css')) cssFiles.push(path);
    }
  };
  visit(stylesDirectory);
  const defined = new Set(cssFiles.flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((match) => match[1])));
  const guideClasses = new Set(
    [...readFileSync(resolve(docsDirectory, '../guide/guide.css'), 'utf8').matchAll(/\.([a-zA-Z_][\w-]*)/g)]
      .map((match) => match[1]),
  );
  const reactDirectory = resolve(docsDirectory, '../../react/src/components');
  const reactClasses = new Set(readdirSync(reactDirectory)
    .filter((name) => name.endsWith('.tsx'))
    .flatMap((name) => [...readFileSync(resolve(reactDirectory, name), 'utf8').matchAll(/\buix-[a-z0-9_-]+\b/g)]
      .map((match) => match[0])));
  const markup = [...SHOWCASE_PAGES.map((page) => page.html), ...ADDITIONAL_EXAMPLES.map((example) => example.html)].join('\n');
  const used = new Set([...markup.matchAll(/class="([^"]+)"/g)].flatMap((match) => match[1].split(/\s+/)));
  const phantom = [...used]
    .filter((className) => className.startsWith('uix-'))
    .filter((className) => !defined.has(className))
    .filter((className) => !guideClasses.has(className))
    .filter((className) => !reactClasses.has(className))
    .sort();
  assert.deepEqual(phantom, []);
});

test('React availability mappings are explicit, unique, and catalogue-backed', () => {
  assert.equal(new Set(REACT_COMPONENT_SLUGS).size, REACT_COMPONENT_SLUGS.length);
  assert.equal(REACT_COMPONENT_SLUGS.length, 58);
  const catalogueSlugs = new Set(COMPONENT_ITEMS.map((item) => item.slug));
  assert.deepEqual(REACT_COMPONENT_SLUGS.filter((slug) => !catalogueSlugs.has(slug)), []);
});
