/* RTE-01 — emoji data model and ReactionBar markup. Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildEmojiData, searchEmoji, ReactionBar, EmojiPicker } from '../dist/emoji.js';
import { emojiGridMove, formatLabel, pushRecentEmoji, readRecentEmoji } from '../dist/emoji-model.js';

const require = createRequire(import.meta.url);
const load = (locale) => buildEmojiData(
  locale,
  require(`emojibase-data/${locale}/compact.json`),
  require(`emojibase-data/${locale}/messages.json`),
);
const en = load('en');
const de = load('de');

test('categories are localized and exclude skin-tone components', () => {
  assert.equal(en.groups.length, 9);
  assert.equal(en.groups[0].name, 'Smileys & emotion');
  assert.equal(de.groups[0].name, 'Smileys & Emotionen');
  assert.ok(!en.groups.some((g) => g.key === 'component'));
  assert.ok(en.emojis.length > 1800);
});

test('search finds English and German names, folding case and umlauts', () => {
  assert.ok(searchEmoji(en, 'thumbs').some((e) => e.emoji.startsWith('👍')));
  assert.ok(searchEmoji(de, 'daumen').some((e) => e.emoji.startsWith('👍')));
  assert.ok(searchEmoji(de, 'ubERRASCH').length > 0, 'Überraschung via folded query');
  assert.ok(searchEmoji(en, 'technologist').some((e) => e.emoji === '👩‍💻'));
  assert.deepEqual(searchEmoji(en, '   '), []);
});

test('names resolve with and without the emoji presentation selector', () => {
  assert.equal(en.names.get('❤️'), 'red heart');
  assert.equal(en.names.get('❤'), 'red heart');
  assert.equal(de.names.get('✅'), 'weißes Häkchen');
});

test('recent emoji are kept most-recent-first, deduplicated and capped', () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  try {
    for (const e of ['👍', '✅', '👍']) pushRecentEmoji(e, 't');
    assert.deepEqual(readRecentEmoji('t'), ['👍', '✅']);
    for (let i = 0; i < 20; i += 1) pushRecentEmoji(String(i), 't');
    assert.equal(readRecentEmoji('t').length, 16);
    store.set('bad', '{nope');
    assert.deepEqual(readRecentEmoji('bad'), []);
  } finally {
    delete globalThis.localStorage;
  }
  assert.deepEqual(readRecentEmoji('t'), [], 'no storage → empty');
});

test('grid movement', () => {
  assert.equal(emojiGridMove(0, 'ArrowRight', 20, 8), 1);
  assert.equal(emojiGridMove(0, 'ArrowLeft', 20, 8), 0);
  assert.equal(emojiGridMove(3, 'ArrowDown', 20, 8), 11);
  assert.equal(emojiGridMove(15, 'ArrowDown', 20, 8), 19);
  assert.equal(emojiGridMove(3, 'ArrowUp', 20, 8), null);
  assert.equal(emojiGridMove(5, 'End', 20, 8), 19);
  assert.equal(emojiGridMove(5, 'Enter', 20, 8), null);
});

test('formatLabel fills known placeholders only', () => {
  assert.equal(formatLabel('{names} reacted with {emoji} {x}', { names: 'Ana', emoji: '👍' }), 'Ana reacted with 👍 {x}');
});

const summary = (emoji, count, reactedByMe, names) => ({ emoji, count, reactedByMe, names });

test('ReactionBar renders pressed toggle chips named after the reactors', () => {
  const html = renderToStaticMarkup(h(ReactionBar, {
    reactions: [summary('👍', 2, true, ['Ana', 'Ben']), summary('🎉', 1, false, []), summary('👀', 0, false, [])],
    onToggle: () => {},
  }));
  assert.match(html, /<div class="uix-reactions" role="group" aria-label="Reactions">/);
  assert.match(html, /<button type="button" class="uix-reaction" aria-pressed="true" aria-label="Ana, Ben reacted with 👍" data-mine="true"/);
  assert.match(html, /aria-pressed="false" aria-label="1 reacted with 🎉"/);
  assert.ok(!html.includes('👀'), 'zero-count chips are hidden');
  assert.match(html, /role="tooltip"[^>]*>Ana, Ben reacted with 👍</);
  assert.match(html, /<button type="button" class="uix-reaction-add" aria-label="Add reaction" title="Add reaction" aria-haspopup="dialog" aria-expanded="false"/);
});

test('ReactionBar truncates long name lists and localizes', () => {
  const names = Array.from({ length: 12 }, (_, i) => `P${i + 1}`);
  const html = renderToStaticMarkup(h(ReactionBar, {
    reactions: [summary('✅', 14, false, names)],
    onToggle: () => {},
    disabled: true,
    maxNames: 3,
    labels: { reactedWith: '{names} hat mit {emoji} reagiert', others: 'und {count} weitere', group: 'Reaktionen' },
  }));
  assert.match(html, /aria-label="P1, P2, P3 und 11 weitere hat mit ✅ reagiert"/);
  assert.match(html, /aria-label="Reaktionen"/);
  assert.equal((html.match(/disabled=""/g) ?? []).length, 2);
});

test('EmojiPicker renders only its trigger until opened', () => {
  const html = renderToStaticMarkup(h(EmojiPicker, { onSelect: () => {}, trigger: h('button', { type: 'button' }, 'Emoji') }));
  assert.match(html, /<button type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="[^"]+">Emoji<\/button>/);
  assert.match(html, /role="dialog" aria-label="Choose an emoji"/);
  assert.ok(!html.includes('uix-emoji-picker__btn'));
});

test('emojiImageBaseUrl accepts same-origin paths only', async () => {
  const { normalizeEmojiImageBaseUrl } = await import('../dist/emoji.js');
  const warn = console.warn;
  const warnings = [];
  console.warn = (m) => warnings.push(m);
  try {
    assert.equal(normalizeEmojiImageBaseUrl(undefined), undefined);
    assert.equal(normalizeEmojiImageBaseUrl(''), undefined);
    assert.equal(normalizeEmojiImageBaseUrl('/static/emoji/'), '/static/emoji');
    assert.equal(normalizeEmojiImageBaseUrl('./emoji'), './emoji');
    assert.equal(normalizeEmojiImageBaseUrl('/'), '/');
    assert.equal(normalizeEmojiImageBaseUrl('./'), '.');
    assert.equal(normalizeEmojiImageBaseUrl(normalizeEmojiImageBaseUrl('./emoji/')), './emoji', 'idempotent');
    assert.equal(normalizeEmojiImageBaseUrl('/tenant/a:b/emoji'), '/tenant/a:b/emoji');
    for (const bad of ['https://cdn.test/e', 'http://x', '//cdn.test/e', '/' + String.fromCharCode(92) + 'cdn.test', 'javascript:alert(1)', 'data:image/png,x', 'emoji', '../emoji', ' /emoji', '/emo ji']) {
      assert.equal(normalizeEmojiImageBaseUrl(bad), undefined, bad);
    }
    assert.ok(warnings.length > 0 && warnings.every((w) => w.startsWith('uix: emojiImageBaseUrl')));
  } finally {
    console.warn = warn;
  }
});

test('emoji image files are named by lowercase hyphenated code points', async () => {
  const { emojiImageFileName, canRenderEmoji } = await import('../dist/emoji.js');
  assert.equal(emojiImageFileName('👍'), '1f44d.png');
  assert.equal(emojiImageFileName('❤️'), '2764-fe0f.png');
  assert.equal(emojiImageFileName('👩‍💻'), '1f469-200d-1f4bb.png');
  assert.equal(emojiImageFileName('👍🏽'), '1f44d-1f3fd.png');
  assert.equal(emojiImageFileName('🇩🇪'), '1f1e9-1f1ea.png');
  assert.equal(emojiImageFileName('#️⃣'), '23-fe0f-20e3.png');
  assert.equal(canRenderEmoji('👍'), true, 'no DOM → native text');
});

test('emojiPattern finds whole sequences', async () => {
  const { emojiPattern } = await import('../dist/emoji-image.js');
  const found = [...'ok 👩‍💻 and 👍🏽, 🇩🇪 ❤️ text'.matchAll(emojiPattern())].map((m) => m[0]);
  assert.deepEqual(found, ['👩‍💻', '👍🏽', '🇩🇪', '❤️']);
});
