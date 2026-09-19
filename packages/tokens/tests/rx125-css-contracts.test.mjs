import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

/*
 * TENSOR RX-125 (deep pass 2026-09-18) — stylesheet contracts, checked from
 * what ships: the built tokens.css and the component stylesheets.
 *
 * UIX-01 the loading ring must not be painted in the on-accent colour on every
 *        variant (a loading secondary/ghost button rendered blank).
 * UIX-02 every token a box-shadow uses must have a dark definition.
 * UIX-03 every var(--uix-*) a stylesheet uses without a fallback must exist.
 * UIX-05 no natural-language text in CSS `content:` (untranslatable).
 * UIX-07 .uix-table-wrap must not cap every table's height.
 * UIX-08 the tree indent must stop growing, and labels may wrap.
 * UIX-14 the relationship-graph legend swatch must follow the entry's colour.
 * UIX-16 positioned flow layouts must scroll rather than squeeze their nodes.
 * UIX-17 the compact pipeline stage must actually draw a border.
 */

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const componentsDir = new URL("../styles/components/", import.meta.url);
const componentFiles = readdirSync(componentsDir).filter((f) => f.endsWith(".css"));
const component = (name) => read(`../styles/components/${name}`);
const allStyles = [
  ...componentFiles.map((f) => [`components/${f}`, component(f)]),
  ["utilities.css", read("../styles/utilities.css")],
];

/** The rule body for an exact selector (first match), or "" when absent. */
const ruleBody = (css, selector) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`${esc}\\s*\\{([^}]*)\\}`));
  return m ? m[1] : "";
};

const tokens = read("../build/css/tokens.css");
const defined = new Set([...tokens.matchAll(/--uix-([\w-]+)\s*:/g)].map((m) => m[1]));
for (const [, css] of allStyles) {
  for (const m of css.matchAll(/--uix-([\w-]+)\s*:/g)) defined.add(m[1]);
}

test("UIX-03: every var(--uix-*) used without a fallback resolves", () => {
  const missing = [];
  for (const [file, css] of allStyles) {
    for (const m of css.matchAll(/var\(--uix-([\w-]+)\s*\)/g)) {
      if (!defined.has(m[1])) missing.push(`${file}: --uix-${m[1]}`);
    }
  }
  process.stdout.write(`css-vars: ${allStyles.length} stylesheets, ${defined.size} tokens defined\n`);
  assert.deepEqual([...new Set(missing)], []);
});

test("UIX-02: every token used in a box-shadow has a dark definition", () => {
  const darkBlocks = [...tokens.matchAll(/:root:where\([^)]*\)\s*\{([^}]*)\}/g)].map((m) => m[1]).join("\n");
  const darkDefined = new Set([...darkBlocks.matchAll(/--uix-([\w-]+)\s*:/g)].map((m) => m[1]));
  const used = new Set();
  for (const [, css] of allStyles) {
    for (const decl of css.matchAll(/box-shadow\s*:\s*([^;}]+)/g)) {
      for (const v of decl[1].matchAll(/var\(--uix-((?:shadow|highlight)[\w-]*)/g)) used.add(v[1]);
    }
  }
  const lacking = [...used].filter((t) => !darkDefined.has(t)).sort();
  assert.deepEqual(lacking, [], "shadow tokens with no dark value (a dark surface gets a light-mode shadow)");
});

test("UIX-01: the loading ring inherits the variant's foreground; on-accent only on filled variants", () => {
  const css = component("button.css");
  const base = ruleBody(css, ".uix-btn[data-loading]::after");
  assert.ok(base, "base loading ring rule exists");
  assert.doesNotMatch(base, /color:\s*var\(--uix-accent-fg\)/, "base ring must not force the on-accent colour");
  assert.match(css, /\.uix-btn--primary\[data-loading\]::after/, "primary scopes the on-accent ring");
  assert.match(css, /\.uix-btn--danger\[data-loading\]::after/, "danger scopes the on-accent ring");
});

test("UIX-05: no natural-language text inside CSS content:", () => {
  const offenders = [];
  for (const [file, css] of allStyles) {
    for (const m of css.matchAll(/content\s*:\s*(["'])([^"']*)\1/g)) {
      if (/[A-Za-z]{3,}/.test(m[2])) offenders.push(`${file}: "${m[2]}"`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("UIX-07: the table wrap does not cap height by default", () => {
  const base = ruleBody(component("table.css"), ".uix-table-wrap");
  assert.doesNotMatch(base, /max-height:\s*\d/, "height cap must be opt-in (.uix-table-wrap--scroll)");
  assert.match(component("table.css"), /\.uix-table-wrap--scroll\s*\{[^}]*max-height/);
});

test("UIX-08: tree indent stops growing and labels may wrap", () => {
  const css = component("tree.css");
  assert.match(
    css,
    /(\.uix-tree__group\s+){4}\.uix-tree__group\s*\{[^}]*padding-left:\s*var\(--uix-space-1\)/,
    "from the 5th level the indent stops growing",
  );
  assert.doesNotMatch(ruleBody(css, ".uix-tree__label"), /white-space:\s*nowrap/, "labels wrap");
});

test("UIX-14: the legend swatch follows the entry's own colour", () => {
  const css = component("relationship-graph.css");
  assert.match(css, /__legend[^{]*\{[^}]*var\(--uix-graph-type-color/, "swatch reads a per-type custom property");
});

test("UIX-16: positioned flow layouts scroll instead of squeezing their nodes", () => {
  const css = component("flow.css");
  assert.match(
    css,
    /\.uix-flow--branch,\s*\.uix-flow--loop,\s*\.uix-flow--mindmap\s*\{\s*min-width:\s*\d+px/,
    "positioned layouts keep a minimum canvas inside the scrolling panel",
  );
});

test("UIX-17: the compact pipeline stage draws its border", () => {
  const css = component("pipeline.css");
  assert.match(ruleBody(css, ".uix-pipeline__stage"), /border:\s*1px solid/, "compact stage declares a border");
});
