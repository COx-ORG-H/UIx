import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import postcss from "postcss";

/*
 * TENSOR HAR-4808 (Home canvas v50): a glance chart in a dashboard grid item has no frame of its
 * own, and a bar list's rows share one capped label column so a long label keeps its bar.
 */

const css = readFileSync(new URL("../styles/components/chart-card.css", import.meta.url), "utf8");
const rules = [];
postcss.parse(css).walkRules((rule) => rules.push(rule));
const decls = (selector) => {
  const rule = rules.find((r) => r.selectors.includes(selector));
  assert.ok(rule, `no rule for ${selector}`);
  return Object.fromEntries(rule.nodes.filter((n) => n.type === "decl").map((d) => [d.prop, d.value]));
};

test("a glance chart in a dashboard grid item draws no frame (no box in a box)", () => {
  const d = decls(".uix-dashboard-grid-item .uix-chart--glance");
  assert.equal(d.border, "0");
  assert.equal(d.padding, "0");
  assert.equal(d["box-shadow"], "none");
  assert.equal(d.background, "transparent");
  // analysis charts keep their frame: the rule names only the glance class
  assert.ok(!rules.some((r) => r.selectors.includes(".uix-dashboard-grid-item .uix-chart")));
});

test("bar list rows share one label column, capped at 40 % of the list", () => {
  const list = decls(".uix-bar-list");
  assert.equal(list.display, "grid");
  assert.match(list["grid-template-columns"], /^fit-content\(40%\) minmax\(0, 1fr\)/);
  const row = decls(".uix-bar-list__row");
  assert.equal(row["grid-template-columns"], "subgrid");
  assert.equal(row["grid-column"], "1 / -1");
  // a long label wraps inside its column instead of widening it
  assert.equal(decls(".uix-bar-list__label")["overflow-wrap"], "anywhere");
});

test("GlanceLineChart and PairedBarChart render the glance class", () => {
  const source = readFileSync(new URL("../../react/src/components/GlanceCharts.tsx", import.meta.url), "utf8");
  assert.equal((source.match(/'uix-chart--glance'/g) ?? []).length, 2);
});
