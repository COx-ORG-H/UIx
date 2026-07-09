---
"@tensor_1/react": minor
---

**UIX-FIX-05 — virtualize the Tree for large hierarchies.**

`Tree` can now render only the rows in view, so a tree with thousands of visible nodes stays fast. It reuses the table engine's `virtualWindow` / `shouldVirtualize` and preserves the WAI-ARIA semantics from UIX-FIX-04.

- New pure, framework-agnostic model (exported): `flattenTree(nodes, expanded)` → the visible rows with `level` / `setsize` / `posinset` / `hasChildren` / `isExpanded`, and `treeNav(flat, currentId, key)` → the keyboard-navigation decision. Both are unit-tested and drive the plain and virtualized render paths, so keyboard nav works even for rows scrolled out of the window (it scrolls the target into view before moving focus).
- New `Tree` props: `virtualize` (defaults to auto, on past `shouldVirtualize`'s threshold of visible rows), `rowHeight` (default 32), `maxHeight` (default 384).
- When virtualized, the nested `role="group"` structure is replaced by a flat list where each treeitem carries `aria-level` / `aria-setsize` / `aria-posinset` — a valid tree representation — keeping roving tabindex, arrow-key navigation, expand/collapse, and selection intact.

The default (non-virtualized) `Tree` is unchanged. Verified with `flattenTree` / `treeNav` unit tests plus a server-render of the built artifact (a 203-row tree renders ~24 windowed treeitems with correct `aria-level` / `aria-setsize` / `aria-posinset` and scroll spacers).
