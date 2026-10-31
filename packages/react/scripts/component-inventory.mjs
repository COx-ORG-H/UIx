import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const configPath = `${root}/tsconfig.json`;
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
const sources = {
  '.': 'index.ts', './chart': 'chart.ts', './chart/analytic': 'chart-analytic.tsx',
  './chart/preset': 'chart-preset.tsx', './rich-text': 'rich-text.ts',
  './markdown': 'markdown.ts', './emoji': 'emoji.ts', './icons': 'icons.ts',
};

// Components are public PascalCase values callable as React elements. Types, hooks, utilities,
// constants and classes are excluded. Aliases get their own name; subpath exports retain their
// subpath, even when another entry exports the same name. Check every package entry is classified.
const entries = Object.keys(manifest.exports).filter((key) => key !== './component-inventory.json').sort();
if (JSON.stringify(entries) !== JSON.stringify(Object.keys(sources).sort())) throw new Error('Classify each public entry point in component-inventory.mjs');
const components = [];
const nonComponents = new Set(['.:QrCapacityError']);
for (const subpath of entries) {
  const file = program.getSourceFile(`${root}/src/${sources[subpath]}`);
  if (!file) throw new Error(`Cannot find source for ${subpath}`);
  for (const exported of checker.getExportsOfModule(checker.getSymbolAtLocation(file))) {
    if (!/^[A-Z]/.test(exported.name) || /^[A-Z0-9_]+$/.test(exported.name)) continue;
    const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    if (!(symbol.flags & ts.SymbolFlags.Value)) continue;
    const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
    const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
    const signatures = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
    const component = signatures.some((signature) => /\b(?:Element|ReactElement|DetailedReactHTMLElement|ReactNode)\b/.test(
      checker.typeToString(checker.getReturnTypeOfSignature(signature), declaration, ts.TypeFormatFlags.NoTruncation),
    ));
    if (component) components.push({ name: exported.name, subpath });
    else if (!nonComponents.has(`${subpath}:${exported.name}`)) {
      throw new Error(`Classify PascalCase export ${subpath}:${exported.name} before publishing the inventory`);
    }
  }
}
components.sort((a, b) => a.subpath.localeCompare(b.subpath, 'en') || a.name.localeCompare(b.name, 'en'));
const result = `${JSON.stringify({ schemaVersion: 1, components }, null, 2)}\n`;
const path = new URL('../component-inventory.json', import.meta.url);
if (process.argv.includes('--write')) writeFileSync(path, result);
else if (readFileSync(path, 'utf8') !== result) throw new Error('Component inventory differs from the current public exports; run node packages/react/scripts/component-inventory.mjs --write');
else console.log(`Component inventory matches ${components.length} public component exports.`);
