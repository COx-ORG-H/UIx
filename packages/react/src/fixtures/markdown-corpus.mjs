/* Shared markdown fixture corpus (RTE-01): the editor round-trip suite, the viewer
 * suite and the browser harness all read this list, so editor and viewer cannot drift.
 *
 * - `markdown` must survive roundTripMarkdown byte-exact.
 * - `canonical: true` means the Tiptap serializer alone (an edited block) also
 *   reproduces it byte-exact: this is the house style the editor writes.
 * - `viewer` lists selectors/text the Markdown viewer must render for it.
 */
export const MARKDOWN_CORPUS = [
  {
    name: 'headings',
    canonical: true,
    markdown: '# Incident summary\n\n## Timeline\n\n### Root cause',
    viewer: { selectors: ['h3', 'h4', 'h5'], text: ['Incident summary', 'Root cause'] },
  },
  {
    name: 'inline marks',
    canonical: true,
    markdown: 'Some **bold**, *italic*, ~~struck~~ and `inline code`.',
    viewer: { selectors: ['strong', 'em', 'del', 'code'], text: ['struck'] },
  },
  {
    name: 'nested bullet list',
    canonical: true,
    markdown: '- Database\n- Application\n  - Checkout\n  - Ledger\n- Network',
    viewer: { selectors: ['ul ul li'], text: ['Ledger'] },
  },
  {
    name: 'ordered list',
    canonical: true,
    markdown: '1. Stop the job\n2. Restore the snapshot\n3. Verify checksums',
    viewer: { selectors: ['ol li'], text: ['Restore the snapshot'] },
  },
  {
    name: 'task list',
    canonical: true,
    markdown: '- [x] Notify the regulator\n- [ ] Write the PIR',
    viewer: { selectors: ['input[type="checkbox"]'], text: ['Write the PIR'] },
  },
  {
    name: 'blockquote',
    canonical: true,
    markdown: '> The change was approved by the CAB.',
    viewer: { selectors: ['blockquote'], text: ['approved by the CAB'] },
  },
  {
    name: 'fenced code',
    canonical: true,
    markdown: '```sql\nSELECT * FROM incidents WHERE state = \'open\';\n```',
    viewer: { selectors: ['pre code'], text: ["state = 'open'"] },
  },
  {
    name: 'horizontal rule',
    canonical: true,
    markdown: 'Before\n\n---\n\nAfter',
    viewer: { selectors: ['hr'], text: ['After'] },
  },
  {
    name: 'links',
    canonical: true,
    markdown: 'See [the runbook](https://kb.example.test/runbooks/42) or [section](#rollback).',
    viewer: { selectors: ['a[href="https://kb.example.test/runbooks/42"]', 'a[href="#rollback"]'], text: ['the runbook'] },
  },
  {
    name: 'image',
    canonical: true,
    markdown: '![Network diagram](/api/knowledge/articles/a1/images/b2)',
    viewer: { selectors: [], text: [] },
  },
  {
    name: 'template variables',
    canonical: true,
    markdown: 'Hello {{customer.name}}, ticket {{ticket.id}} is now {{ticket.state}}.',
    viewer: { selectors: [], text: ['{{customer.name}}', '{{ticket.state}}'] },
  },
  {
    name: 'umlauts',
    canonical: true,
    markdown: 'Grüße aus Köln: Änderung für Straße Öde, Übergabe um 9 Uhr — ß bleibt ß.',
    viewer: { selectors: [], text: ['Grüße aus Köln', 'ß bleibt ß'] },
  },
  {
    name: 'emoji including ZWJ sequences',
    canonical: true,
    markdown: 'Rollback done ✅ 👩‍💻 👨‍👩‍👧‍👦 🏳️‍🌈 👍🏽 ❤️ 🇩🇪',
    viewer: { selectors: [], text: ['✅ 👩‍💻 👨‍👩‍👧‍👦 🏳️‍🌈 👍🏽 ❤️ 🇩🇪'] },
  },
  {
    name: 'plain punctuation stays readable',
    canonical: true,
    markdown: 'Tom & Jerry use snake_case, 2 * 3 < 7 and C:\\Users\\ops > logs.',
    viewer: { selectors: [], text: ['Tom & Jerry use snake_case, 2 * 3 < 7 and C:\\Users\\ops > logs.'] },
  },
  {
    name: 'hard line break',
    canonical: false,
    markdown: 'Line one\nline two',
    viewer: { selectors: ['br'], text: ['line two'] },
  },
  {
    name: 'aligned table',
    canonical: false,
    markdown: '| Service | Owner | Uptime |\n| :------ | :---: | -----: |\n| Payments | Team A | 99.95 % |\n| Ledger | Team B | 99.9 % |',
    viewer: { selectors: ['table th', 'td'], text: ['Payments', '99.95 %'] },
  },
  {
    name: 'mixed document with blank-line runs and a trailing newline',
    canonical: false,
    markdown: '# Change plan\n\n\nIntro paragraph with *emphasis*.\n\n* star bullet\n* second\n\n1) paren list\n\nLast line.\n',
    viewer: { selectors: ['h3', 'ul li', 'em'], text: ['Last line.'] },
  },
  {
    name: 'alternative emphasis and escapes',
    canonical: false,
    markdown: '__strong__ and _em_ with \\*literal stars\\* and a\\_b.',
    viewer: { selectors: ['strong', 'em'], text: ['*literal stars*'] },
  },
  {
    name: 'raw html is literal text',
    canonical: false,
    markdown: '<div onclick="x()">raw</div>\n\nInline <b>tag</b> and <script>alert(1)</script>',
    viewer: { selectors: [], text: ['<div onclick="x()">raw</div>', '<script>alert(1)</script>'] },
  },
  {
    name: 'reference definitions and footnotes',
    canonical: false,
    markdown: 'See the note[^1] and [docs][ref].\n\n[^1]: The footnote text.\n[ref]: https://docs.example.test\n\nAfter the definitions.',
    viewer: { selectors: [], text: ['After the definitions.'] },
  },
  {
    name: 'unsafe link',
    canonical: false,
    markdown: '[click me](javascript:alert(1)) and ![x](https://evil.example.test/p.png)',
    viewer: { selectors: [], text: ['click me'] },
  },
  {
    name: 'setext heading and indented code',
    canonical: false,
    markdown: 'Title\n=====\n\n    indented code\n    block',
    viewer: { selectors: [], text: ['Title'] },
  },
  {
    name: 'crlf line endings',
    canonical: false,
    markdown: 'First paragraph\r\n\r\nSecond paragraph\r\n',
    viewer: { selectors: ['p'], text: ['Second paragraph'] },
  },
  {
    name: 'empty',
    canonical: false,
    markdown: '',
    viewer: { selectors: [], text: [] },
  },
  {
    name: 'whitespace only',
    canonical: false,
    markdown: '\n\n  \n',
    viewer: { selectors: [], text: [] },
  },
];
