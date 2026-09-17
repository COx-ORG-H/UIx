/* RTE-01 — byte-exact markdown round trip through the RichTextEditor pipeline.
 * Runs against the built entry (npm run build first). Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { MARKDOWN_CORPUS } from './fixtures/markdown-corpus.mjs';
import { roundTripMarkdown } from '../dist/rich-text.js';
import { createPipeline, encodeText } from '../dist/rich-text/pipeline.js';

const pipeline = createPipeline();
const reload = (md) => {
  const origin = pipeline.read(md);
  return { origin, doc: pipeline.schema.nodeFromJSON(origin.doc).toJSON() };
};
/** Serialize with no source to reuse: what the editor writes for edited blocks. */
const serializeFresh = (md) => pipeline.write(reload(md).doc, pipeline.read(''));

for (const fixture of MARKDOWN_CORPUS) {
  test(`round trip is byte-exact: ${fixture.name}`, async () => {
    assert.equal(await roundTripMarkdown(fixture.markdown), fixture.markdown);
  });
  if (fixture.canonical) {
    test(`serializer writes the house style unchanged: ${fixture.name}`, () => {
      assert.equal(serializeFresh(fixture.markdown), fixture.markdown);
    });
  }
}

test('the whole corpus as one document round-trips byte-exact', async () => {
  const all = MARKDOWN_CORPUS.map((f) => f.markdown).filter(Boolean).join('\n\n');
  assert.equal(await roundTripMarkdown(all), all);
});

test('headingLevels does not rewrite headings at other levels', async () => {
  const md = '## Legacy section\n\n### Findings';
  assert.equal(await roundTripMarkdown(md, { headingLevels: [3] }), md);
});

const SOURCE = '# Plan\n\n\n* keep   this  star list\n* as written\n\n| a | b |\n|:-|-:|\n| 1 | 2 |\n\nTail paragraph.\n';

const paragraph = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] });

test('editing one block keeps every other block byte-exact', () => {
  const { origin, doc } = reload(SOURCE);
  doc.content[3] = paragraph('Tail paragraph, edited.');
  assert.equal(pipeline.write(doc, origin), SOURCE.replace('Tail paragraph.', 'Tail paragraph, edited.'));
});

test('inserting a block keeps its neighbours and their separators', () => {
  const { origin, doc } = reload(SOURCE);
  doc.content.splice(1, 0, paragraph('New intro.'));
  assert.equal(pipeline.write(doc, origin), '# Plan\n\nNew intro.\n\n* keep   this  star list\n* as written\n\n| a | b |\n|:-|-:|\n| 1 | 2 |\n\nTail paragraph.\n');
});

test('deleting a block keeps the rest byte-exact', () => {
  const { origin, doc } = reload(SOURCE);
  doc.content.splice(2, 1);
  assert.equal(pipeline.write(doc, origin), '# Plan\n\n\n* keep   this  star list\n* as written\n\nTail paragraph.\n');
});

test('blank lines marked attaches to the next block stay separators', () => {
  const md = '# Plan\n\nDeploy the **ledger** fix. ✅\n\n- [x] CAB\n- [ ] Rehearsal\n\n| a | b |\n| :- | -: |\n| 1 | 2 |';
  const { origin, doc } = reload(md);
  doc.content[1].content.at(-1).text += ' Now.';
  assert.equal(pipeline.write(doc, origin), md.replace('✅', '✅ Now.'));
});

test('editing any single block changes only that block (whole corpus)', () => {
  const source = MARKDOWN_CORPUS.map((f) => f.markdown).filter((m) => m.trim()).join('\n\n\n') + '\n';
  const origin = pipeline.read(source);
  assert.equal(origin.blocks.map((b) => b.lead + b.raw).join('') + origin.tail, source, 'blocks reassemble the source');
  const firstText = (node) => (node.type === 'text' ? node : (node.content ?? []).map(firstText).find(Boolean));
  let edited = 0;
  origin.blocks.forEach((block, k) => {
    if (block.keys.length !== 1) return;
    const doc = pipeline.schema.nodeFromJSON(origin.doc).toJSON();
    const index = origin.blocks.slice(0, k).reduce((n, b) => n + b.keys.length, 0);
    const text = firstText(doc.content[index]);
    if (!text || doc.content[index].type === 'codeBlock') return;
    text.text = `${text.text}Z`;
    const fresh = pipeline.write({ type: 'doc', content: [doc.content[index]] }, pipeline.read(''));
    const expected = origin.blocks.map((b, n) => b.lead + (n === k ? fresh : b.raw)).join('') + origin.tail;
    assert.equal(pipeline.write(doc, origin), expected, `block ${k}: ${JSON.stringify(block.raw.slice(0, 40))}`);
    edited += 1;
  });
  assert.ok(edited > 15, `edited ${edited} blocks`);
});

// ── review regressions ─────────────────────────────────────────────────────────
const TAB = String.fromCharCode(9);
const BS = String.fromCharCode(92);
const fresh = (doc) => pipeline.write(doc, pipeline.read(''));
const reparsed = (md) => reload(md).doc;
const docOf = (...content) => ({ type: 'doc', content });
const link = (text, href) => ({ type: 'text', text, marks: [{ type: 'link', attrs: { href, target: null, rel: 'noopener noreferrer nofollow', class: null, title: null } }] });

test('a "!" before a link does not turn the link into an image', () => {
  const doc = docOf({ type: 'paragraph', content: [{ type: 'text', text: 'wow!' }, link('x', 'https://a.test')] });
  const md = fresh(doc);
  assert.ok(md.startsWith('wow' + BS + '!['), md);
  const back = reparsed(md);
  assert.equal(JSON.stringify(back).includes('"image"'), false);
  assert.equal(back.content[0].content[0].text, 'wow!');
  assert.equal(fresh(docOf(paragraph('Done!'))), 'Done!', 'plain trailing ! stays unescaped');
});

test('a "|" typed into a table cell stays in that cell', () => {
  const { origin, doc } = reload('| a | b |\n| - | - |\n| c | d |');
  const cell = doc.content[0].content[1].content[0].content[0];
  cell.content[0].text = 'c|x';
  const md = pipeline.write(doc, origin);
  const row = reparsed(md).content[0].content[1].content;
  assert.equal(row.length, 2, md);
  assert.equal(row[0].content[0].content[0].text, 'c|x');
  assert.equal(row[1].content[0].content[0].text, 'd');
  assert.equal(fresh(docOf(paragraph('a | b'))), 'a | b', 'outside tables | is left alone');
});

test('neighbouring blocks never merge after an edit', () => {
  const { origin, doc } = reload('# H\ntext');
  doc.content[0] = paragraph('H');
  const md = pipeline.write(doc, origin);
  assert.equal(reparsed(md).content.length, 2, JSON.stringify(md));
});

test('reference definitions survive deleting the blocks around them', () => {
  const cases = [
    ['A\n\n[r]: http://x.test\n\nB', 0],
    ['A\n\nB\n\n[r]: http://x.test\n', 1],
    ['[r]: http://x.test\n\nA\n\nB', 0],
  ];
  for (const [md, drop] of cases) {
    const { origin, doc } = reload(md);
    doc.content.splice(drop, 1);
    const out = pipeline.write(doc, origin);
    assert.ok(out.includes('[r]: http://x.test'), `${JSON.stringify(md)} → ${JSON.stringify(out)}`);
  }
});

test('text that looks like block syntax keeps its type and characters', () => {
  const texts = [' - x', '  # h', '    code', `${TAB}x`, '=', '--', '1) one', '12. twelve', 'a. alpha', 'iv) roman', 'OK. fine', '+ plus', '### deep', `${BS}not an escape`];
  for (const text of texts) {
    const md = fresh(docOf(paragraph(text)));
    // Leading whitespace is insignificant in markdown and dropped; the block type and the rest stay.
    assert.deepEqual(reparsed(md).content, [paragraph(text.trimStart())], `${JSON.stringify(text)} → ${JSON.stringify(md)}`);
  }
  const broken = docOf({ type: 'paragraph', content: [{ type: 'text', text: 'Title' }, { type: 'hardBreak' }, { type: 'text', text: '=' }] });
  const md = fresh(broken);
  assert.deepEqual(reparsed(md).content, broken.content, JSON.stringify(md));
});

test('edited blocks in a CRLF document use CRLF', () => {
  const src = 'One\r\n\r\nTwo\r\nlines\r\n';
  const { origin, doc } = reload(src);
  doc.content[1] = { type: 'paragraph', content: [{ type: 'text', text: 'Two' }, { type: 'hardBreak' }, { type: 'text', text: 'edited' }] };
  const out = pipeline.write(doc, origin);
  assert.ok(out.startsWith('One\r\n\r\nTwo'), JSON.stringify(out));
  assert.ok(!/(^|[^\r])\n/.test(out), JSON.stringify(out));
});

test('an emptied document serializes to the empty string', () => {
  const { origin } = reload(SOURCE);
  assert.equal(pipeline.write({ type: 'doc', content: [{ type: 'paragraph' }] }, origin), '');
});

test('trailing empty paragraphs (TrailingNode) are not content', () => {
  const { origin, doc } = reload(SOURCE);
  doc.content.push({ type: 'paragraph' });
  assert.equal(pipeline.write(doc, origin), SOURCE);
});

test('raw HTML is never parsed: it stays literal text', () => {
  const { doc } = reload('<img src=x onerror="alert(1)">');
  assert.deepEqual(doc.content, [paragraph('<img src=x onerror="alert(1)">')]);
});

test('unsafe link URLs keep their source but render without an href', () => {
  const md = '[x](javascript:alert(1))';
  const node = pipeline.schema.nodeFromJSON(reload(md).doc);
  const mark = node.firstChild.firstChild.marks.find((m) => m.type.name === 'link');
  assert.equal(mark.attrs.href, 'javascript:alert(1)');
  const [tag, attrs] = mark.type.spec.toDOM(mark, true);
  assert.equal(tag, 'a');
  assert.equal(attrs.href, '');
  const safe = pipeline.schema.nodeFromJSON(reload('[x](https://ok.test)').doc).firstChild.firstChild.marks[0];
  assert.equal(safe.type.spec.toDOM(safe, true)[1].href, 'https://ok.test');
});

test('encodeText escapes only what would be re-read as markup', () => {
  assert.equal(encodeText('Tom & Jerry'), 'Tom & Jerry');
  assert.equal(encodeText('a &amp; b'), 'a &amp;amp; b');
  assert.equal(encodeText('x < y, <div>'), 'x < y, &lt;div>');
  assert.equal(encodeText('> quoted'), '\\> quoted');
  assert.equal(encodeText('snake_case _em_ 2 * 3 *x*'), 'snake_case \\_em\\_ 2 * 3 \\*x\\*');
  assert.equal(encodeText('C:\\Users and \\*'), 'C:\\Users and \\\\\\*');
  assert.equal(encodeText('[x] `c` ~s~'), '\\[x\\] \\`c\\` \\~s\\~');
  assert.equal(encodeText('{{var}} 👩‍💻 Grüße'), '{{var}} 👩‍💻 Grüße');
});

test('serialized text reads back as the same text (property)', () => {
  const alphabet = ['a', 'Z', 'i', 'v', 'x', ' ', ' ', String.fromCharCode(9), '_', '*', '&', '<', '>', String.fromCharCode(92), '[', ']', '`', '~', '#', 'ä', '👍', ';', '/', '1', '.', '!', '-', '+', '=', ')', '|', '(', ':', '"'];
  let seed = 7;
  const next = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const word = () => Array.from({ length: 1 + Math.floor(next() * 10) }, () => alphabet[Math.floor(next() * alphabet.length)]).join('');
  let checked = 0;
  for (let run = 0; run < 6000; run += 1) {
    // One to three lines joined by hard breaks; readers drop leading/trailing whitespace, so none is generated.
    // List items and table cells store tabs as spaces (marked / Tiptap limitation), so those runs use none.
    const inList = [3, 4, 5].includes(run % 6);
    const lines = Array.from({ length: 1 + Math.floor(next() * 3) }, word)
      .map((l) => (inList ? l.replaceAll(String.fromCharCode(9), ' ') : l).trim())
      // Table cells also collapse whitespace runs (Tiptap's table renderer).
      .map((l) => (run % 6 === 5 ? l.replace(/\s+/g, ' ') : l));
    if (lines.some((l) => !l.trim())) continue;
    const content = lines.flatMap((l, n) => (n ? [{ type: 'hardBreak' }, { type: 'text', text: l }] : [{ type: 'text', text: l }]));
    const para = { type: 'paragraph', content };
    const cell = (type, inner) => ({ type, attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [inner] });
    const containers = [
      para,
      { type: 'heading', attrs: { level: 2 }, content: content.filter((c) => c.type === 'text').slice(0, 1) },
      { type: 'blockquote', content: [para] },
      { type: 'bulletList', content: [{ type: 'listItem', content: [para] }] },
      { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [para] }] },
      { type: 'table', content: [
        { type: 'tableRow', content: [cell('tableHeader', paragraph('h')), cell('tableHeader', paragraph('k'))] },
        { type: 'tableRow', content: [cell('tableCell', { type: 'paragraph', content }), cell('tableCell', paragraph('z'))] },
      ] },
    ];
    const block = pipeline.schema.nodeFromJSON(containers[run % containers.length]).toJSON();
    const doc = { type: 'doc', content: [block] };
    // A task item cannot hold a hard break in markdown: its lines come back as paragraphs of the item.
    const expected = block.type !== 'taskList' ? doc.content : [{ ...block, content: [{ ...block.content[0], content: lines.map((l) => paragraph(l)) }] }];
    const md = pipeline.write(doc, pipeline.read(''));
    const back = reload(md).doc.content;
    assert.deepEqual(back, expected, `${block.type} lines ${JSON.stringify(lines)} → ${JSON.stringify(md)}`);
    checked += 1;
  }
  assert.ok(checked > 3000, `checked ${checked}`);
});
