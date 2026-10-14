/* Mentions (TENSOR HAR-1599): the stored form, the markdown round trip through the
 * editor pipeline, the viewer's token, and Comment avatar={false}.
 *
 * The keyboard path (caret, list position, Backspace on a token) runs in a real browser:
 * tests/a11y/rich-text-mentions.spec.mjs. The listbox states in jsdom are in
 * rich-text-dom.test.mjs.
 * Runs against the built entries (npm run build first). Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { roundTripMarkdown } from '../dist/rich-text.js';
import { createPipeline } from '../dist/rich-text/pipeline.js';
import {
  Markdown, findMentions, formatMention, isMentionId, parseInline, plainText, readMention,
} from '../dist/markdown.js';
import { Comment } from '../dist/index.js';

const pipeline = createPipeline();
const reread = (md) => pipeline.read(md).doc;
const fresh = (md) => pipeline.write(pipeline.schema.nodeFromJSON(reread(md)).toJSON(), pipeline.read(''));
const mentionsIn = (doc) => {
  const out = [];
  const walk = (node) => {
    if (node.type === 'mention') out.push({ ...node.attrs });
    (node.content ?? []).forEach(walk);
  };
  walk(doc);
  return out;
};

// ── the stored form ──────────────────────────────────────────────────────────

test('formatMention writes @[Name](mention:<id>) and escapes brackets in the name', () => {
  assert.equal(formatMention({ id: 'u-1', label: 'Anna Schmidt' }), '@[Anna Schmidt](mention:u-1)');
  assert.equal(formatMention({ id: 'u-2', label: 'Ops [EU]' }), '@[Ops \\[EU\\]](mention:u-2)');
  assert.equal(formatMention({ id: 'u-3', label: '  Ben \n Okafor ' }), '@[Ben Okafor](mention:u-3)');
});

test('an id that could carry a scheme or a path is never stored', () => {
  for (const id of ['', 'javascript:alert(1)', 'a/b', 'a b', '../x', 'mention:u']) {
    assert.equal(isMentionId(id), false, id);
    assert.equal(formatMention({ id, label: 'X' }), null, id);
  }
  assert.equal(formatMention({ id: 'u-1', label: '   ' }), null, 'an empty name is not a mention');
  assert.equal(isMentionId('8b0c2b9e-3f7a-4c1e-9d55-0a1b2c3d4e5f'), true, 'a uuid is');
});

test('readMention reads exactly one mention at the start, unescaping the name', () => {
  assert.deepEqual(readMention('@[Ops \\[EU\\]](mention:u-2) rest'), { id: 'u-2', label: 'Ops [EU]', length: 26 });
  assert.equal(readMention('@[A](mention:javascript:x)'), null);
  assert.equal(readMention('@[A](https://example.com)'), null);
  assert.equal(readMention('[A](mention:u-1)'), null, 'the @ is part of the form');
});

// ── the editor pipeline ──────────────────────────────────────────────────────

const STORED = [
  'Hi @[Anna Schmidt](mention:u-anna), can you check?',
  '',
  '- @[Ops \\[EU\\]](mention:team-eu) owns the rollback',
  '',
  'Code stays code: `@[x](mention:y)`',
].join('\n');

test('a stored text round-trips byte-exact', async () => {
  assert.equal(await roundTripMarkdown(STORED), STORED);
});

test('each mention loads as one token with its id and name, none from code', () => {
  assert.deepEqual(mentionsIn(reread(STORED)), [
    { id: 'u-anna', label: 'Anna Schmidt' },
    { id: 'team-eu', label: 'Ops [EU]' },
  ]);
});

test('an edited block writes its mentions back in the stored form', () => {
  assert.equal(fresh('Hi @[Anna Schmidt](mention:u-anna) and @[Ops \\[EU\\]](mention:team-eu).'),
    'Hi @[Anna Schmidt](mention:u-anna) and @[Ops \\[EU\\]](mention:team-eu).');
});

test('typed look-alike text is escaped, so it never becomes a mention', () => {
  const doc = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: '@[Fake](mention:u-1)' }] }],
  };
  const md = pipeline.write(doc, pipeline.read(''));
  assert.ok(!md.startsWith('@[Fake]'), md);
  assert.deepEqual(mentionsIn(reread(md)), []);
});

test('a mention whose id is not storable stays text', async () => {
  const md = 'See @[A](mention:javascript:alert(1)) here';
  assert.deepEqual(mentionsIn(reread(md)), []);
  assert.equal(await roundTripMarkdown(md), md);
});

// ── the viewer ───────────────────────────────────────────────────────────────

test('the viewer draws a mention as a .uix-mention token, never a link', () => {
  const html = renderToStaticMarkup(h(Markdown, { isSafeUrl: () => true }, 'Ask @[Ben Okafor](mention:u-ben).'));
  assert.match(html, /<span class="uix-mention" data-mention-id="u-ben">@Ben Okafor<\/span>/);
  assert.ok(!html.includes('<a '), 'not a link, whatever isSafeUrl says');
});

test('resolveMention names the person; undefined keeps the stored name', () => {
  const html = renderToStaticMarkup(h(Markdown, {
    resolveMention: (id, stored) => (id === 'u-ben' ? 'Pseudonym 4711' : undefined),
  }, '@[Ben Okafor](mention:u-ben) and @[Anna](mention:u-anna)'));
  assert.match(html, />@Pseudonym 4711</);
  assert.match(html, />@Anna</);
  assert.ok(!html.includes('Ben Okafor'), 'a masked name must not leak through the stored one');
});

test('plainText and findMentions read mentions; code holds none', () => {
  assert.equal(plainText(parseInline('Hi @[Anna](mention:u-1)!')), 'Hi @Anna!');
  assert.deepEqual(findMentions(STORED), [
    { id: 'u-anna', label: 'Anna Schmidt' },
    { id: 'team-eu', label: 'Ops [EU]' },
  ]);
  assert.deepEqual(findMentions('```\n@[A](mention:u-1)\n```'), []);
});

// ── Comment avatar={false} ───────────────────────────────────────────────────

test('Comment avatar={false} drops the avatar column; the default keeps it', () => {
  const bare = renderToStaticMarkup(h(Comment, { variant: 'system', avatar: false, systemLabel: 'System', meta: 'now' }, 'Assigned'));
  assert.match(bare, /^<div class="uix-comment uix-comment--system uix-comment--bare" data-variant="system"><div class="uix-comment__body">/);
  const kept = renderToStaticMarkup(h(Comment, { variant: 'system', meta: 'now' }, 'Assigned'));
  assert.match(kept, /^<div class="uix-comment uix-comment--system" data-variant="system"><span aria-hidden="true"><\/span>/);
});
