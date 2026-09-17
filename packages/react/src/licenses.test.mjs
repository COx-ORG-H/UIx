/* RTE-01 licence hygiene: every optional peer of the rich-text/emoji subpaths, and
 * everything those peers install, carries an allowlisted licence (MIT, ISC,
 * Apache-2.0, BSD). The UIx bundles keep all of them external (no third-party code is
 * redistributed in dist/), which is checked too. Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(here, '../package.json'), 'utf8'));
const ALLOWED = /^(MIT|ISC|Apache-2\.0|BSD-2-Clause|BSD-3-Clause|0BSD)$/;
/**
 * Packages whose published tarball has no licence file although package.json declares an
 * allowlisted licence. A notices file must use the standard licence text with the named holder.
 */
const LICENSE_TEXT_EXCEPTIONS = {
  // Dependency of @tiptap/extension-emoji. package.json: "MIT", author Vincent Thibault.
  'is-emoji-supported': 'MIT; no LICENSE file in the 0.0.5 tarball',
};
const OPTIONAL_PEERS = Object.keys(manifest.peerDependenciesMeta).filter((name) => name !== 'echarts');

const licenseOf = (pkg) => {
  const raw = pkg.license ?? (Array.isArray(pkg.licenses) ? pkg.licenses.map((l) => l.type).join(' OR ') : undefined);
  return typeof raw === 'object' ? raw?.type : raw;
};
const allowed = (expr) => !!expr && expr.replace(/[()]/g, '').split(/\s+OR\s+/).some((part) => ALLOWED.test(part.trim()));

/** The installed dependency closure of the optional peers (dependencies + peerDependencies). */
function closure() {
  const seen = new Map();
  const visit = (name, from) => {
    if (seen.has(name)) return;
    let file;
    try {
      file = createRequire(join(from, 'noop.js')).resolve(`${name}/package.json`);
    } catch {
      // Packages without "./package.json" in exports: walk node_modules upwards.
      for (let dir = from; ; dir = dirname(dir)) {
        const candidate = join(dir, 'node_modules', name, 'package.json');
        if (existsSync(candidate)) { file = candidate; break; }
        if (dirname(dir) === dir) break;
      }
    }
    if (!file) return; // an optional peer that is not installed
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    seen.set(name, { version: pkg.version, license: licenseOf(pkg), dir: dirname(file) });
    for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies })) {
      if (dep === 'react' || dep === 'react-dom' || dep.startsWith('@types/')) continue;
      visit(dep, dirname(file));
    }
  };
  for (const peer of OPTIONAL_PEERS) visit(peer, resolve(here, '..'));
  return seen;
}

test('optional peers are exact pins', () => {
  assert.ok(OPTIONAL_PEERS.length >= 12, OPTIONAL_PEERS.join(', '));
  for (const peer of OPTIONAL_PEERS) {
    assert.match(manifest.peerDependencies[peer], /^\d+\.\d+\.\d+$/, peer);
    assert.equal(manifest.devDependencies[peer], manifest.peerDependencies[peer], `${peer}: dev and peer pins agree`);
  }
});

test('every optional peer and its installed dependencies has an allowlisted licence', () => {
  const packages = closure();
  for (const peer of OPTIONAL_PEERS) assert.ok(packages.has(peer), `${peer} installed`);
  const refused = [...packages].filter(([, info]) => !allowed(info.license)).map(([name, info]) => `${name}@${info.version}: ${info.license}`);
  assert.deepEqual(refused, []);
  // Every package ships its licence text (notices travel with copies).
  const missing = [...packages]
    .filter(([name, info]) => !LICENSE_TEXT_EXCEPTIONS[name] && !readdirSync(info.dir).some((f) => /^(licen[cs]e|copying)/i.test(f)))
    .map(([name]) => name);
  assert.deepEqual(missing, []);
  for (const name of Object.keys(LICENSE_TEXT_EXCEPTIONS)) {
    assert.ok(packages.has(name), `stale licence-text exception: ${name}`);
    assert.ok(!readdirSync(packages.get(name).dir).some((f) => /^licen[cs]e/i.test(f)), `${name} now ships a licence file — drop the exception`);
  }
});

test('no third-party code is bundled into dist', () => {
  const dist = resolve(here, '../dist');
  const cjs = ['index.cjs', 'rich-text.cjs', 'markdown.cjs', 'emoji.cjs'].map((f) => readFileSync(join(dist, f), 'utf8')).join('\n');
  // Signatures of inlined library code or data: ProseMirror's view, Tiptap's manager, marked's lexer, emoji datasets.
  for (const signature of ['class EditorView', 'class MarkdownManager', 'class _Lexer', '"hexcode"', 'regional_indicator_a']) {
    assert.ok(!cjs.includes(signature), `dist inlines ${signature}`);
  }
  assert.match(readFileSync(join(dist, 'rich-text.cjs'), 'utf8'), /require\("@tiptap\/react"\)/);
});
