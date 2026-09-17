/* RTE-01 — the Markdown viewer. Safety cases are ported from TENSOR's
 * packages/shared/ui/src/markdown.test.tsx (behaviour preserved); the rest cover the
 * constructs the editor writes. DOM-level selector checks per fixture run in the
 * browser suite (tests/a11y/rich-text.spec.mjs). Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MARKDOWN_CORPUS } from './fixtures/markdown-corpus.mjs';
import { Markdown, parseMarkdown, parseInline } from '../dist/markdown.js';

const render = (source, props = {}) => renderToStaticMarkup(h(Markdown, props, source));
const hrefs = (html) => [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => m[1]);
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');

// ── safety (ported) ──────────────────────────────────────────────────────────

test('never emits a <script> element from a raw <script> tag', () => {
  const html = render('Hello <script>alert(1)</script> world');
  assert.ok(!html.includes('<script'));
  assert.ok(text(html).includes('Hello <script>alert(1)</script> world'));
});

test('never emits an <img> without resolveImageSrc (markdown image or raw HTML)', () => {
  const html = render('![alt](/img.png)\n<img onerror="alert(1)" src=x>');
  assert.ok(!html.includes('<img'));
  assert.deepEqual(hrefs(html), ['/img.png']);
});

test('drops javascript: URLs from markdown links (renders label, no anchor)', () => {
  const html = render('Click [here](javascript:alert(1))');
  assert.ok(!hrefs(html).some((h) => h.includes('javascript')));
  assert.ok(text(html).includes('Click here'));
});

test('drops data:/vbscript:/file: URLs', () => {
  const html = render('[a](data:text/html,x) [b](vbscript:msgbox(1)) [c](file:///etc/passwd)');
  assert.deepEqual(hrefs(html), []);
});

test('allows http/https/mailto/relative/anchor schemes', () => {
  const html = render('[a](https://example.com) [b](/portal) [c](./rel) [d](mailto:foo@bar.test) [e](#anchor)');
  assert.deepEqual(hrefs(html), ['https://example.com', '/portal', './rel', 'mailto:foo@bar.test', '#anchor']);
});

test('rel/target hardening on external links only', () => {
  const html = render('[x](https://evil.example) [y](/internal)');
  assert.match(html, /<a href="https:\/\/evil\.example" target="_blank" rel="noopener noreferrer">/);
  assert.match(html, /<a href="\/internal">/);
});

test('case-bypass scheme (JaVaScRiPt:) is rejected', () => {
  assert.deepEqual(hrefs(render('[a](JaVaScRiPt:alert(1)) [b]( javascript:x)')), []);
});

test('renders the supported block subset with headings demoted by two levels', () => {
  const html = render('# Title\n\n- one\n- two\n\n`inline` and **bold**\n\n```\ncode block\n```');
  assert.match(html, /<h3>Title<\/h3>/);
  assert.equal((html.match(/<li>/g) ?? []).length, 2);
  assert.match(html, /<code>inline<\/code>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<pre><code>code block<\/code><\/pre>/);
});

test('empty / whitespace-only input renders nothing', () => {
  assert.equal(render('   \n  '), '');
  assert.equal(render(''), '');
});

test('single newlines become line breaks and blockquote lines are joined', () => {
  assert.match(render('one\ntwo'), /<p>one<br\/>two<\/p>/);
  assert.match(render('> a\n> b'), /<blockquote>a b<\/blockquote>/);
});

test('bare http(s) URLs are autolinked without trailing punctuation', () => {
  assert.deepEqual(hrefs(render('See https://status.example.test/incidents/7.')), ['https://status.example.test/incidents/7']);
});

test('the policy props replace the default URL rule', () => {
  const html = render('[a](https://x.test) [b](/y)', { isSafeUrl: (u) => u.startsWith('/') });
  assert.deepEqual(hrefs(html), ['/y']);
});

// ── new constructs ───────────────────────────────────────────────────────────

test('strikethrough, task lists and tables', () => {
  const html = render('~~old~~\n\n- [x] done\n- [ ] open\n\n| A | B |\n|:--|--:|\n| 1 | 2 |');
  assert.match(html, /<del>old<\/del>/);
  assert.match(html, /<input type="checkbox" disabled="" aria-label="done" checked=""\/>/);
  assert.match(html, /<input type="checkbox" disabled="" aria-label="open"\/>/);
  assert.match(html, /<div class="uix-markdown__table" tabindex="0"><table><thead><tr><th scope="col" style="text-align:left">A<\/th>/);
  assert.match(html, /<td style="text-align:right">2<\/td>/);
});

test('images render only when resolveImageSrc returns a URL', () => {
  const kb = '/api/knowledge/articles/a/images/b';
  const policy = { resolveImageSrc: (src) => (src.startsWith('/api/knowledge/') ? src : null) };
  const html = render(`![diagram](${kb}) ![x](https://evil.test/p.png) ![y](javascript:x)`, policy);
  assert.equal((html.match(/<img /g) ?? []).length, 1);
  assert.match(html, /<img src="\/api\/knowledge\/articles\/a\/images\/b" alt="diagram" loading="lazy" decoding="async"\/>/);
  assert.deepEqual(hrefs(html), ['https://evil.test/p.png']);
  assert.ok(text(html).includes('y'));
});

test('emoji, umlauts and template variables stay text', () => {
  const html = render('Rollback done ✅ 👩‍💻 — Grüße {{customer.name}}');
  assert.ok(text(html).includes('Rollback done ✅ 👩‍💻 — Grüße {{customer.name}}'));
});

test('backslash escapes and character references are decoded as text', () => {
  assert.equal(text(render('\\*not em\\* a\\_b &amp; &lt;b&gt; &#128077; &unknown;')), '*not em* a_b & <b> 👍 &unknown;');
});

test('intraword underscores are not emphasis', () => {
  assert.ok(!render('snake_case_name').includes('<em>'));
  assert.match(render('_yes_'), /<em>yes<\/em>/);
});

test('nested lists follow indentation', () => {
  const [list] = parseMarkdown('- a\n  - b\n    1. c\n- d');
  assert.equal(list.type, 'list');
  assert.equal(list.items.length, 2);
  assert.equal(list.items[0].lists[0].items[0].lists[0].ordered, true);
  assert.match(render('- a\n  - b'), /<ul><li>a<ul><li>b<\/li><\/ul><\/li><\/ul>/);
});

test('ordered lists keep their start number', () => {
  assert.match(render('3. three\n4. four'), /<ol start="3">/);
});

test('links may contain formatting and titles', () => {
  assert.deepEqual(parseInline('[**b**](https://x.test "T")'), [
    { type: 'link', href: 'https://x.test', title: 'T', children: [{ type: 'strong', children: [{ type: 'text', value: 'b' }] }] },
  ]);
});

test('horizontal rules and headings with closing hashes', () => {
  assert.match(render('a\n\n---\n\n## B ##'), /<hr\/><h4>B<\/h4>/);
});

test('headingOffset is capped at h6', () => {
  assert.match(render('###### Deep', { headingOffset: 2 }), /<h6>Deep<\/h6>/);
  assert.match(render('# Top', { headingOffset: 0 }), /<h1>Top<\/h1>/);
});

for (const fixture of MARKDOWN_CORPUS) {
  test(`corpus renders its expected text: ${fixture.name}`, () => {
    const out = text(render(fixture.markdown));
    for (const expected of fixture.viewer.text) assert.ok(out.includes(expected), `${JSON.stringify(expected)} in ${JSON.stringify(out)}`);
  });
}
