/* resolve-component.mjs (DIST-3) — registry lookups for the `uix add` CLI.
 * Locates the package root from this file, reads registry/registry.json, and resolves a component's
 * on-disk CSS path (registry `file` is package-relative, e.g. styles/components/button.css).
 * Node built-ins only, zero runtime deps. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

// scripts/lib/ -> scripts/ -> package root
export const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REGISTRY = join(PKG_ROOT, 'registry', 'registry.json');

export function loadRegistry() {
  return JSON.parse(readFileSync(REGISTRY, 'utf8'));
}

export function listComponents(reg) {
  return (reg.components || []).map((c) => c.name);
}

export function findComponent(reg, name) {
  return (reg.components || []).find((c) => c.name === name) || null;
}

/** Absolute path to a component's source CSS within the (installed) package. */
export function componentCssPath(comp) {
  return join(PKG_ROOT, comp.file);
}
