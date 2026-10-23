#!/usr/bin/env node
/*
 * HAR-1576 — the CSS mask form of a UIx icon, for plain-CSS slots that cannot hold an <svg>
 * (a table header's sort arrow, a native select's chevron, a `.uix-glyph` span).
 *
 * The mask is the Lucide glyph from src/icons/glyphs.ts (the same paths the React icons draw),
 * stroked in black at the icon set's stroke width; CSS paints it with `background: currentColor`
 * through `mask`, so it follows the theme colour like an inline icon. Forced-colours mode replaces
 * backgrounds, so each rule that uses a mask also sets `CanvasText` there.
 *
 *   node scripts/glyph-mask.mjs chevron-down     print the url(...) for one glyph
 * packages/react/src/glyph-masks.test.mjs checks every mask in the stylesheets against this.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const source = readFileSync(new URL('../src/icons/glyphs.ts', import.meta.url), 'utf8');

/** Lucide kebab name -> IconNode, read from the generated glyphs.ts. */
export function glyphNode(name) {
  const constName = source.match(new RegExp(`'${name}': (glyph\\w+),`))?.[1];
  if (!constName) throw new Error(`no glyph named ${name} in src/icons/glyphs.ts`);
  const json = source.match(new RegExp(`export const ${constName}: IconNode = (\\[.*\\]);`))?.[1];
  return JSON.parse(json);
}

const attr = (attrs) => Object.entries(attrs).map(([k, v]) => ` ${k}='${v}'`).join('');

/** The `url("data:image/svg+xml,…")` mask for a glyph. */
export function maskUrl(name) {
  const body = glyphNode(name).map(([tag, attrs]) => `<${tag}${attr(attrs)}/>`).join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${body}</svg>`;
  return `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23')}")`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  for (const name of process.argv.slice(2)) console.log(`${name}: ${maskUrl(name)}`);
}
