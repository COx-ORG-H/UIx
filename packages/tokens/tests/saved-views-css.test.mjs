import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/*
 * SavedViewMenu row anatomy — stylesheet contracts (upstreamed from TENSOR's
 * saved-views menu). A missing rule here fails to invisible, not to an error,
 * so each cue is pinned by selector.
 */

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../styles/components/view-menu.css").replace(/\s+/g, " ");
const forced = read("../styles/forced-colors.css").replace(/\s+/g, " ");

/** The rule body for an exact selector (first match), or "" when absent. */
const ruleBody = (source, selector) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = source.match(new RegExp(`${esc}\\s*\\{([^}]*)\\}`));
  return m ? m[1] : "";
};

test("the panel scrolls and its section labels stay pinned", () => {
  assert.match(ruleBody(css, ".uix-saved-views "), /max-height:[^;]+;/);
  assert.match(ruleBody(css, ".uix-saved-views "), /overflow-y: auto/);
  const label = ruleBody(css, ".uix-saved-views__section-label");
  assert.match(label, /position: sticky/);
  assert.match(label, /background: var\(--uix-surface-2\)/, "an opaque label, so rows scroll under it");
});

test("hover and selection paint the whole row, not the name", () => {
  assert.match(ruleBody(css, ".uix-saved-views__row:hover"), /background: var\(--uix-bg-hover\)/);
  assert.match(ruleBody(css, ".uix-saved-views__row[data-active]"), /background: var\(--uix-brand-muted\)/, "an accent tint, not the hover grey");
  assert.match(ruleBody(css, ".uix-saved-views__row > .uix-menu__item:is(:hover, [data-active])"), /background: transparent/);
  const activeAt = css.indexOf(".uix-saved-views__row[data-active] {");
  const hoverAt = css.indexOf(".uix-saved-views__row:hover {");
  assert.ok(activeAt > hoverAt, "the selected tint comes after hover, so it wins on the hovered current row");
});

test("grip and overflow are quiet until the row is hovered, focused or its menu is open", () => {
  // .75 is the floor, not a taste: the muted grip on the panel surface drops under WCAG 1.4.11's 3:1
  // non-text contrast below it (3.19:1 light, 4.45:1 dark at .75; 1.89:1 / 2.41:1 at .45).
  assert.match(ruleBody(css, ":is(.uix-saved-views__grip, .uix-saved-views__actions)"), /opacity: \.75/);
  const reveal = css.match(/([^{}]+)\{ opacity: 1; \}/)?.[1] ?? "";
  for (const cue of [":hover", ":focus-within", "[data-dragging]", ':has([aria-expanded="true"])']) {
    assert.ok(reveal.includes(cue), `revealed on ${cue}`);
  }
});

test("names truncate instead of widening the menu", () => {
  const name = ruleBody(css, ".uix-saved-views__name");
  assert.match(name, /text-overflow: ellipsis/);
  assert.match(name, /white-space: nowrap/);
});

test("forced-colors mode keeps a visible selected row", () => {
  assert.match(ruleBody(forced, ".uix-saved-views__row[data-active]"), /outline: 2px solid SelectedItem/);
});
