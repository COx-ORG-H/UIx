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
  const alphabet = ['a', 'Z', ' ', '_', '*', '&', '<', '>', '\\', '[', ']', '`', '~', '#', 'ä', '👍', ';', '/', '1', '.', '!'];
  let seed = 7;
  const next = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let run = 0; run < 400; run += 1) {
    const text = Array.from({ length: 1 + Math.floor(next() * 14) }, () => alphabet[Math.floor(next() * alphabet.length)]).join('');
    if (!text.trim() || text !== text.trim()) continue;
    const md = pipeline.write({ type: 'doc', content: [paragraph(text)] }, pipeline.read(''));
    const back = reload(md).doc.content;
    assert.deepEqual(back, [paragraph(text)], `text ${JSON.stringify(text)} → ${JSON.stringify(md)}`);
  }
});
