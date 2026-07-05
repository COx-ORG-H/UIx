/* search.js — client-side component search for the explorer (DOCS-3).
   Pure, DOM-free ranking helpers (unit-tested in search.test.js) + a guarded DOM block that wires
   a labelled search input to filter the left nav. Ranking: name > category > keyword. The DOM block
   reads the nav catalog and, when present, enriches keywords from docs/data/components.json; it
   degrades to the static nav if that file is absent. Declares no tokens; styled via docs.css. */

import { slugify } from './docs.js';

/* ----------------------------------------------------------------------------
 * Pure helpers (tested in search.test.js — no DOM)
 * --------------------------------------------------------------------------*/

/** Normalise for comparison: trimmed lowercase. */
export const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();

/** Build a search index from component descriptors:
 *  [{ name, slug?, category?/group?, keywords? }] → normalised entries the matcher scores. */
export const buildIndex = (components = []) =>
  (Array.isArray(components) ? components : [])
    .filter((c) => c && (c.name || c.slug))
    .map((c) => {
      const name = c.name || c.slug;
      const slug = c.slug || slugify(name);
      const category = c.category || c.group || '';
      const keywords = Array.isArray(c.keywords) ? c.keywords : [];
      return {
        name,
        slug,
        category,
        keywords,
        _name: norm(name),
        _slug: norm(slug),
        _category: norm(category),
        _keywords: keywords.map(norm),
      };
    });

/** Score one entry against a normalised query. Higher = better; 0 = no match.
 *  Tiers keep the ranking name > category > keyword (per DOCS-3). */
export const scoreEntry = (entry, q) => {
  if (!q) return 0;
  if (entry._name === q) return 100;
  if (entry._name.startsWith(q)) return 80;
  if (entry._name.includes(q)) return 60;
  if (entry._slug.includes(q)) return 55;
  if (entry._category.includes(q)) return 40;
  if (entry._keywords.some((k) => k.includes(q))) return 20;
  return 0;
};

/** Rank an index against a query. Empty query → the full index in original order.
 *  Otherwise: matches only, sorted by score desc then name asc (stable, predictable). */
export const matchComponents = (index = [], query = '') => {
  const q = norm(query);
  const arr = Array.isArray(index) ? index : [];
  if (!q) return arr.slice();
  return arr
    .map((e) => ({ e, s: scoreEntry(e, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.e._name.localeCompare(b.e._name))
    .map((x) => x.e);
};

/* ----------------------------------------------------------------------------
 * DOM wiring (browser only) — guarded like docs.js / guide/app.js
 * --------------------------------------------------------------------------*/
if (typeof document !== 'undefined') {
  // Read the catalog from the nav docs.js already rendered: name + slug + its group heading.
  const readNavCatalog = () => {
    const out = [];
    const nav = document.querySelector('[data-uix-docs-nav]');
    if (!nav) return out;
    let category = '';
    for (const node of nav.children) {
      if (node.classList.contains('uix-docs__navgroup')) category = node.textContent.trim();
      else if (node.classList.contains('uix-docs__navlink')) {
        out.push({ name: node.textContent.trim(), slug: node.dataset.slug, category });
      }
    }
    return out;
  };

  // Optional keyword enrichment from the generated index (degrade silently if absent).
  const enrich = async (catalog) => {
    try {
      const res = await fetch('data/components.json', { cache: 'no-cache' });
      if (!res.ok) return catalog;
      const data = await res.json();
      const bySlug = new Map((data.components || []).map((c) => [c.slug, c]));
      return catalog.map((c) => {
        const hit = bySlug.get(c.slug);
        return hit ? { ...c, keywords: [hit.name, hit.extends].filter(Boolean) } : c;
      });
    } catch (_) {
      return catalog;
    }
  };

  const applyFilter = (index, query) => {
    const matches = matchComponents(index, query);
    const visible = new Set(matches.map((m) => m.slug));
    const nav = document.querySelector('[data-uix-docs-nav]');
    if (!nav) return matches;
    // Toggle links, then hide any group heading whose links are all hidden.
    let lastGroup = null;
    let groupHasVisible = false;
    const flushGroup = () => { if (lastGroup) lastGroup.hidden = !groupHasVisible; };
    for (const node of nav.children) {
      if (node.classList.contains('uix-docs__navgroup')) {
        flushGroup();
        lastGroup = node; groupHasVisible = false;
      } else if (node.classList.contains('uix-docs__navlink')) {
        const show = !query || visible.has(node.dataset.slug);
        node.hidden = !show;
        if (show) groupHasVisible = true;
      }
    }
    flushGroup();
    return matches;
  };

  const init = async () => {
    const input = document.querySelector('[data-uix-docs-search] input');
    if (!input) return;
    let index = buildIndex(readNavCatalog());
    index = buildIndex(await enrich(index.map((e) => ({ name: e.name, slug: e.slug, category: e.category }))));

    let topHit = null;
    const onInput = () => {
      const matches = applyFilter(index, input.value);
      topHit = input.value.trim() ? matches[0] || null : null;
    };
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && topHit) { location.hash = '#' + topHit.slug; input.blur(); }
      else if (e.key === 'Escape') { input.value = ''; onInput(); input.blur(); }
    });
    // '/' focuses the search from anywhere (unless already typing in a field).
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !/^(input|textarea|select)$/i.test(document.activeElement?.tagName || '')) {
        e.preventDefault();
        input.focus();
      }
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
