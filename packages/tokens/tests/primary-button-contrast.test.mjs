import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { contrast, evaluate, scopeFor, themes } from './css-color.mjs';

const css = readFileSync(new URL('../styles/components/button.css', import.meta.url), 'utf8');
assert.match(css, /\.uix-btn--primary\s*\{\s*background:\s*var\(--uix-accent\);\s*color:\s*var\(--uix-accent-fg\)/);
assert.match(css, /\.uix-btn--primary:hover\s*\{\s*background:\s*var\(--uix-accent-hover\)/);

for (const [name, blocks] of Object.entries(themes)) for (const dark of [false, true]) for (const state of ['accent', 'accent-hover']) {
  test(`${name} ${dark ? 'dark' : 'light'} ${state} button text meets 4.5:1`, () => {
    const scope = scopeFor(blocks, dark);
    const ratio = contrast(evaluate('var(--uix-accent-fg)', scope), evaluate(`var(--uix-${state})`, scope));
    assert.ok(ratio >= 4.5, `contrast ${ratio}:1`);
  });
}

test('authored theme pairs and dark hover meet 4.5:1 before generating artifacts', () => {
  const darkTokens = JSON.parse(readFileSync(new URL('../tokens/dark/color.json', import.meta.url), 'utf8'));
  for (const [name, blocks] of Object.entries(themes)) for (const dark of [false, true]) {
    const scope = scopeFor(blocks, dark);
    if (name !== 'default') {
      const source = JSON.parse(readFileSync(new URL(`../themes/${name}.tokens.json`, import.meta.url), 'utf8'));
      for (const [key, modes] of Object.entries(source)) {
        if (key.startsWith('__')) continue;
        if (modes.light != null) scope[key] = modes.light;
        if (dark && modes.dark != null) scope[key] = modes.dark;
      }
    }
    if (dark) scope['accent-hover'] = darkTokens['accent-hover'].$value;
    for (const state of ['accent', 'accent-hover']) {
      const ratio = contrast(evaluate('var(--uix-accent-fg)', scope), evaluate(`var(--uix-${state})`, scope));
      assert.ok(ratio >= 4.5, `${name} ${dark ? 'dark' : 'light'} ${state}: ${ratio}:1`);
    }
  }
});
