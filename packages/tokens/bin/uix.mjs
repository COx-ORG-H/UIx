#!/usr/bin/env node
/* uix — the copy-in CLI for the UIx CSS components (DIST-3, per ADR-0017 option C).
 *
 *   uix list                      list every component in the registry
 *   uix add <name> --dest <dir>   copy <name>'s CSS into <dir> and print the tokens it needs
 *
 * It reads the shipped registry/registry.json, copies styles/components/<file>, and prints the
 * imports the copied component depends on (the --uix-* contract + a theme + the component's own
 * --uix-* variables). Unknown component / bad args exit non-zero. Zero runtime deps (node built-ins).
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { loadRegistry, listComponents, findComponent, componentCssPath } from '../scripts/lib/resolve-component.mjs';

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const opts = { _: [] };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--dest' || a === '-d') opts.dest = rest[++i];
    else if (a.startsWith('--dest=')) opts.dest = a.slice('--dest='.length);
    else opts._.push(a);
  }
  return { cmd, opts };
}

function usage() {
  console.log(`uix — copy UIx CSS components into your project

Usage:
  uix list
  uix add <name> --dest <dir>

Examples:
  uix add button --dest ./src/styles/uix
  uix list`);
}

function cmdList() {
  const reg = loadRegistry();
  const names = listComponents(reg).sort();
  console.log(names.join('\n'));
}

function cmdAdd(opts) {
  const name = opts._[0];
  if (!name) {
    console.error('✗ uix add: missing <name>.  Usage: uix add <name> --dest <dir>');
    process.exit(1);
  }
  if (!opts.dest) {
    console.error('✗ uix add: missing --dest <dir>.');
    process.exit(1);
  }
  const reg = loadRegistry();
  const comp = findComponent(reg, name);
  if (!comp) {
    console.error(`✗ uix add: unknown component "${name}". Run \`uix list\` to see available components.`);
    process.exit(1);
  }
  const src = componentCssPath(comp);
  if (!existsSync(src)) {
    console.error(`✗ uix add: source CSS not found at ${src} (is the package built/shipped with styles/?).`);
    process.exit(1);
  }
  const destDir = resolve(opts.dest);
  mkdirSync(destDir, { recursive: true });
  const destFile = join(destDir, basename(comp.file));
  copyFileSync(src, destFile);

  console.log(`✓ copied ${comp.name} → ${destFile}`);
  console.log('\nImport the token contract + a theme first (the copied CSS only references --uix-* vars):');
  console.log('  @import "@tensor_1/tokens/css";');
  console.log('  @import "@tensor_1/tokens/themes/tensor";   /* or posx | shopx | mission-control */');
  console.log(`  @import "./${basename(comp.file)}";`);
  if (comp.tokens && comp.tokens.length) {
    console.log(`\n${comp.name} depends on ${comp.tokens.length} --uix-* token(s):`);
    console.log('  ' + comp.tokens.join(', '));
  }
}

function main() {
  const { cmd, opts } = parseArgs(process.argv.slice(2));
  switch (cmd) {
    case 'list':
      cmdList();
      break;
    case 'add':
      cmdAdd(opts);
      break;
    case undefined:
    case '-h':
    case '--help':
    case 'help':
      usage();
      break;
    default:
      console.error(`✗ uix: unknown command "${cmd}".`);
      usage();
      process.exit(1);
  }
}

main();
