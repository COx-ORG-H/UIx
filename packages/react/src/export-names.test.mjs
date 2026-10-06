/* A named export in an entry file silently wins over a same-named binding from an
 * `export * from` module: TypeScript and esbuild accept it, and the star module's export
 * disappears from the public API. HAR-1365's `FilterKind` replaced table-engine's
 * `FilterKind` that way, and only the API report diff showed it. This reads the sources,
 * so it needs no build. Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = resolve(dirname(fileURLToPath(import.meta.url)));
const read = (file) => readFileSync(join(src, file), 'utf8');

/** Names a module exports with `export (type|interface|function|const|class|enum) Name` or `export { … }`. */
const declaredExports = (code) => {
  const names = new Set();
  for (const m of code.matchAll(/^export\s+(?:declare\s+)?(?:async\s+)?(?:type|interface|function\*?|const|let|class|enum)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of code.matchAll(/^export\s+(?:type\s+)?\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.replace(/^type\s+/, '').trim();
      if (name) names.add(name);
    }
  }
  return names;
};

const entries = readdirSync(src).filter((f) => /\.tsx?$/.test(f) && /^export \* from /m.test(read(f)));

test('no entry export shadows a name from one of its `export *` modules', () => {
  assert.ok(entries.includes('index.ts'), 'index.ts re-exports table-engine with export *');
  for (const entry of entries) {
    const code = read(entry);
    const explicit = declaredExports(code);
    for (const [, spec] of code.matchAll(/^export \* from '\.\/([^']+)\.js';/gm)) {
      const starred = declaredExports(read(`${spec}.ts`));
      const clashes = [...starred].filter((name) => explicit.has(name));
      assert.deepEqual(clashes, [], `${entry}: these names hide ${spec}'s exports`);
    }
  }
});
