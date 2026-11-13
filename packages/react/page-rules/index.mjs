// UIx page rules (HAR-3874): `import { run, scanSource } from '@tensor_1/react/page-rules'`.
// The CLI is `uix-page-rules` (./cli.mjs); README.md has the product setup.

import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { COUNTED_RULES, RULES } from './rules.mjs';
import {
  baselineDocument,
  CONFIG_FILE,
  ConfigError,
  evaluate,
  growth,
  loadBaseline,
  loadConfig,
  scanProject,
} from './scan.mjs';

export * from './rules.mjs';
export * from './scan.mjs';

const USAGE = `Usage: uix-page-rules [check | baseline [--seed] | rules] [--config <file>] [--root <dir>] [--json]

  check      (default) fail on any finding the baseline does not grandfather, and on
             baseline or config entries the tree no longer needs
  baseline   rewrite the baseline from the tree; refuses to grow it (--seed writes it
             anyway: the first baseline, or a reviewed re-seed after moving files)
  rules      list the rules and how to fix each

Exit codes: 0 clean, 1 violations or a refused baseline, 2 usage or config error.`;

function parseArgs(argv) {
  const args = { command: 'check', config: CONFIG_FILE, root: '.', json: false, seed: false };
  const rest = [...argv];
  if (rest[0] && !rest[0].startsWith('-')) args.command = rest.shift();
  while (rest.length) {
    const a = rest.shift();
    if (a === '--json') args.json = true;
    else if (a === '--seed') args.seed = true;
    else if (a === '--config' && rest.length) args.config = rest.shift();
    else if (a === '--root' && rest.length) args.root = rest.shift();
    else if (a === '--help' || a === '-h') args.command = 'help';
    else throw new ConfigError(`unknown argument "${a}"`);
  }
  if (!['check', 'baseline', 'rules', 'help'].includes(args.command)) throw new ConfigError(`unknown command "${args.command}"`);
  if (args.seed && args.command !== 'baseline') throw new ConfigError('--seed only applies to `baseline`');
  return args;
}

const grandfathered = (counts, baseline) => {
  let n = 0;
  for (const rule of COUNTED_RULES) {
    for (const [file, have] of Object.entries(counts[rule] ?? {})) n += Math.min(have, baseline.rules[rule]?.[file] ?? 0);
  }
  return n;
};

function report(violations, out) {
  for (const v of violations) {
    out(`  ${v.file}:${v.line}  ${v.rule}  ${v.msg}`);
    if (v.text) out(`      ${v.text}`);
  }
  const rules = [...new Set(violations.map((v) => v.rule))];
  out('');
  out('How to fix:');
  for (const rule of rules) out(`  ${rule}: ${RULES[rule].fix} (workspace ${RULES[rule].lesson})`);
  const ignorable = rules.filter((r) => RULES[r]?.ignorable);
  if (ignorable.length) {
    out(`  A real exception to ${ignorable.join(', ')} takes an inline \`// uix-page-rules-ignore <rule>: <reason>\` on the line or the line above. The kit-control rules take none: a case the kit cannot serve is built in UIx first.`);
  }
}

/**
 * Run the CLI. Returns the exit code; writes through `io`.
 * @param {string[]} argv
 * @param {{ cwd?: string, stdout?: (s: string) => void, stderr?: (s: string) => void }} [io]
 */
export function run(argv, io = {}) {
  const out = io.stdout ?? ((s) => process.stdout.write(`${s}\n`));
  const err = io.stderr ?? ((s) => process.stderr.write(`${s}\n`));
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    err(`uix-page-rules: ${error.message}\n\n${USAGE}`);
    return 2;
  }
  if (args.command === 'help') {
    out(USAGE);
    return 0;
  }
  if (args.command === 'rules') {
    for (const rule of COUNTED_RULES) out(`${rule}${RULES[rule].ignorable ? '' : ' (no inline ignore)'}\n  ${RULES[rule].fix}\n  workspace ${RULES[rule].lesson}`);
    out('\nHeld back: no-hand-built-pill (a class split by a template interpolation escapes it, HAR-3817).');
    return 0;
  }

  const root = resolve(io.cwd ?? process.cwd(), args.root);
  try {
    const config = loadConfig(root, args.config);
    const baseline = loadBaseline(root, config);
    const scan = scanProject(root, config);
    if (scan.filesScanned === 0) {
      err(`uix-page-rules: no source files under ${config.roots.join(', ')}; a gate that reads nothing proves nothing.`);
      return 2;
    }

    if (args.command === 'baseline') {
      const grown = baseline.exists ? growth(scan.counts, baseline) : [];
      if (!args.seed && !baseline.exists && scan.findings.length) {
        err(`uix-page-rules: ${config.baseline} does not exist. Seed it on purpose: uix-page-rules baseline --seed`);
        return 1;
      }
      if (!args.seed && grown.length) {
        err(`uix-page-rules: refusing to grow ${config.baseline}: ${grown.length} file(s) gained findings. Fix them instead:\n  ${grown.join('\n  ')}`);
        return 1;
      }
      const doc = baselineDocument(scan.counts);
      writeFileSync(join(root, config.baseline), `${JSON.stringify(doc, null, 2)}\n`);
      out(`uix-page-rules: wrote ${config.baseline} (${doc.total} grandfathered finding(s) in ${scan.filesScanned} scanned files)`);
      if (scan.problems.length) {
        err('uix-page-rules: the config still needs fixing:');
        report(scan.problems, err);
        return 1;
      }
      return 0;
    }

    const violations = evaluate(scan, baseline);
    const kept = grandfathered(scan.counts, baseline);
    if (args.json) {
      out(JSON.stringify({ ok: violations.length === 0, filesScanned: scan.filesScanned, grandfathered: kept, violations }, null, 2));
      return violations.length ? 1 : 0;
    }
    if (!violations.length) {
      out(`✓ uix-page-rules: no new violations (${scan.filesScanned} file(s) scanned, ${kept} finding(s) grandfathered in ${config.baseline})`);
      return 0;
    }
    err(`✗ uix-page-rules: ${violations.length} violation(s) (${scan.filesScanned} file(s) scanned, ${kept} finding(s) grandfathered in ${config.baseline})`);
    report(violations, err);
    return 1;
  } catch (error) {
    if (error instanceof ConfigError) {
      err(`uix-page-rules: ${error.message}`);
      return 2;
    }
    throw error;
  }
}
