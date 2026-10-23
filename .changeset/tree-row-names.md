---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`Tree`: each treeitem is named by its own row, not by its whole subtree** (HAR-1828). A treeitem had no `aria-label` / `aria-labelledby`, so its name came from its content, nested group included: once expanded, "Grace Hopper" was announced (and matched by `getByRole('treeitem', { name })`) as "Grace Hopper Alice Lovelace Bob Builder …". Each row is now `aria-labelledby` its own `.uix-tree__label` (an id scoped to the tree, so two trees never share one), in the nested and the virtualised tree and for the loading and error rows. New `TreeNodeData.ariaLabel` names a row whose `label` is rich (an avatar, a name and a meta line) by just the part that should be spoken. TENSOR's portal org chart (HAR-1486) can swap to the kit Tree after the bump.
