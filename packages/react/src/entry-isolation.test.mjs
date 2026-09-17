/* RTE-01 — the root entry and the markdown viewer never pull in the editor stack.
 * Walks the built ESM import graph (per-file dist) and scans the CJS bundles.
 * Run after `npm run build`: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const HEAVY = /^(@tiptap\/|marked$|emojibase-data(\/|$)|prosemirror-)/;
const IMPORT_RE = /(?:import|export)\s*(?:[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Bare specifiers reachable from an ESM file, following relative imports. */
function reachable(entry) {
  const seen = new Set();
  const bare = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(IMPORT_RE)) {
      const spec = match[1] ?? match[2];
      if (spec.startsWith('.')) walk(join(dirname(file), spec));
      else bare.add(spec);
    }
  };
  walk(join(dist, entry));
  return { files: seen, bare: [...bare] };
}

test('the root entry imports neither Tiptap, marked nor emoji data', () => {
  const { files, bare } = reachable('index.js');
  assert.ok(files.size > 20, `walked ${files.size} files`);
  assert.deepEqual(bare.filter((s) => HEAVY.test(s)), []);
  for (const file of files) {
    const rel = file.slice(dist.length);
    assert.ok(!/RichTextEditor|EmojiPicker|ReactionBar|emoji-model|rich-text/.test(rel), rel);
  }
});

test('the root CJS bundle requires neither Tiptap, marked nor emoji data', () => {
  const cjs = readFileSync(join(dist, 'index.cjs'), 'utf8');
  assert.ok(!/require\(["'](@tiptap\/|marked["']|emojibase-data)/.test(cjs));
  assert.ok(!cjs.includes('emojibase'));
});

test('the markdown entry is server-safe and dependency-free', () => {
  const { files, bare } = reachable('markdown.js');
  assert.deepEqual(bare.filter((s) => s !== 'react/jsx-runtime'), []);
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.ok(!/^\s*["']use client["']/.test(source), `${file} has a client directive`);
    assert.ok(!/\buse(State|Effect|LayoutEffect|Ref|Memo|Callback|Id|Context|Reducer)\b/.test(source), `${file} uses a hook`);
    assert.ok(!source.includes('dangerouslySetInnerHTML'), `${file} has an HTML sink`);
  }
  const cjs = readFileSync(join(dist, 'markdown.cjs'), 'utf8');
  assert.ok(!/require\(["'](?!react)/.test(cjs), 'markdown.cjs requires only react');
});

test('emoji data is only imported dynamically', () => {
  const { bare } = reachable('emoji.js');
  assert.deepEqual(bare.filter((s) => HEAVY.test(s)).sort(), ['emojibase-data/de/compact.json', 'emojibase-data/de/messages.json', 'emojibase-data/en/compact.json', 'emojibase-data/en/messages.json']);
  const model = readFileSync(join(dist, 'emoji-model.js'), 'utf8');
  assert.ok(!/^import[^(]*emojibase/m.test(model), 'no static emojibase import');
});
