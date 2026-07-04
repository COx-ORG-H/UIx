#!/usr/bin/env node
/**
 * RDY-JOURNEY-01 — uix-doctor: executable onboarding pre-flight.
 *
 * The README "Start a new project" journey is prose. "No entry point = not
 * shipped." This turns the documented wiring into a check a consumer can run
 * (and that CI runs against both fixtures, so the happy path can't rot):
 *
 *   FAIL (exit 1) — the wiring is broken:
 *     · no globals.css found
 *     · a required @uix/tokens import missing
 *     · the three base imports out of order (tokens → bridge → tailwind)
 *     · @uix/tokens not a dependency
 *   WARN (exit 0) — works, but incomplete:
 *     · no @uix-overrides fence (fine until you brand; the linter needs it then)
 *     · components.json doesn't register the @uix registry (can't `shadcn add`)
 *     · no lint:tokens script wired into the consumer's CI
 *
 * Usage: node uix-doctor.mjs [--dir <consumer-root>]   (default: cwd)
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
let dir = process.cwd();
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir') dir = resolve(args[++i] ?? '.');
  else { console.error(`uix-doctor: unexpected arg "${args[i]}"`); process.exit(2); }
}

const rel = (p) => p; // display paths as given
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
const fails = [];
const warns = [];
const oks = [];

// --- locate globals.css ------------------------------------------------------
const GLOBALS_CANDIDATES = ['app/globals.css', 'src/app/globals.css', 'styles/globals.css', 'app/global.css', 'globals.css'];
let cssPath = null;
for (const c of GLOBALS_CANDIDATES) {
  if (existsSync(join(dir, c))) { cssPath = join(dir, c); break; }
}

if (!cssPath) {
  fails.push(`no globals.css found (looked in: ${GLOBALS_CANDIDATES.join(', ')})`);
} else {
  const css = read(cssPath);
  const stripped = css.replace(/\/\*(?!\s@uix-overrides)[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const idx = (needle) => {
    const m = new RegExp(`@import\\s+["'][^"']*tokens/${needle.replace('.', '\\.')}["']`).exec(stripped);
    return m ? m.index : -1;
  };
  const iTokens = idx('tokens.css');
  const iBridge = idx('shadcn-bridge.css');
  const iTailwind = idx('tailwind.css');
  const required = [['tokens.css', iTokens], ['shadcn-bridge.css', iBridge], ['tailwind.css', iTailwind]];
  for (const [name, i] of required) {
    if (i === -1) fails.push(`${cssPath}: missing @import "@uix/tokens/${name}"`);
  }
  if (iTokens !== -1 && iBridge !== -1 && iTailwind !== -1) {
    if (!(iTokens < iBridge && iBridge < iTailwind)) {
      fails.push(`${cssPath}: @uix imports out of order — must be tokens.css → shadcn-bridge.css → tailwind.css`);
    } else {
      oks.push(`globals.css: three @uix/tokens imports present and ordered`);
    }
  }
  if (!stripped.includes('/* @uix-overrides */')) {
    warns.push(`${cssPath}: no /* @uix-overrides */ … /* @uix-overrides-end */ fence — add it before overriding any token (the linter requires it once you brand)`);
  } else {
    oks.push('globals.css: @uix-overrides fence present');
  }
}

// --- package.json: @uix/tokens dependency + lint:tokens script --------------
const pjRaw = read(join(dir, 'package.json'));
if (!pjRaw) {
  fails.push('no package.json in the consumer root');
} else {
  let pj;
  try { pj = JSON.parse(pjRaw); } catch { pj = null; }
  if (!pj) {
    fails.push('package.json is not valid JSON');
  } else {
    const deps = { ...(pj.dependencies ?? {}), ...(pj.devDependencies ?? {}) };
    if (!deps['@uix/tokens']) fails.push('package.json: @uix/tokens is not a dependency (pnpm add @uix/tokens)');
    else oks.push(`@uix/tokens dependency present (${deps['@uix/tokens']})`);
    const hasLint = Object.values(pj.scripts ?? {}).some((s) => /uix-lint-tokens/.test(s));
    if (!hasLint) warns.push('package.json: no script runs uix-lint-tokens — wire "lint:tokens": "uix-lint-tokens app/globals.css --src ." into CI (land the gate with the adoption)');
    else oks.push('lint:tokens gate wired into scripts');
  }
}

// --- components.json: @uix registry -----------------------------------------
const cjRaw = read(join(dir, 'components.json'));
if (!cjRaw) {
  warns.push('no components.json — needed to `shadcn add @uix/<item>` (tokens-only consumers can ignore this)');
} else {
  let cj;
  try { cj = JSON.parse(cjRaw); } catch { cj = null; }
  if (cj && cj.registries && Object.keys(cj.registries).some((k) => k === '@uix')) {
    oks.push('components.json registers the @uix registry');
  } else {
    warns.push('components.json does not register "@uix" — add "registries": { "@uix": "…/{name}.json" } to install composites');
  }
}

// --- report ------------------------------------------------------------------
console.log(`uix-doctor: ${rel(dir)}`);
for (const o of oks) console.log(`  ✓ ${o}`);
for (const w of warns) console.log(`  ⚠ ${w}`);
for (const f of fails) console.error(`  ✗ ${f}`);

if (fails.length) {
  console.error(`uix-doctor: ${fails.length} blocking problem(s), ${warns.length} warning(s) — wiring incomplete`);
  process.exit(1);
}
console.log(`uix-doctor: OK — wiring valid${warns.length ? ` (${warns.length} warning(s))` : ''}`);
