---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

The UIx icon set, a new `@tensor_1/react/icons` subpath (HAR-996). Icons come only from UIx (workspace ADR-0038). This lets TENSOR (270 files, 199 glyphs), MOTUS (8 files), POSx, MEDx and SHOPx drop `lucide-react` and turn on their icon-library bans.

- **233 glyphs**, Lucide's (lucide-react 1.39.0, ISC, notice in `THIRD_PARTY_NOTICES.md`). They cover every name TENSOR and MOTUS import today plus the POSx, MEDx and SHOPx lists on HAR-996.
- **Components:** each glyph is a tree-shakeable `<Name>Icon` component (`ShieldCheckIcon`), plus the older Lucide names the products use as aliases (`AlertTriangleIcon`, `CheckCircle2Icon`, `Loader2Icon`, …). `Icon name="shield-check"` picks one at run time. `UixIcon` replaces `LucideIcon`; `IconName`, `IconProps`, `ICON_GLYPHS` and `createIcon` are also exported. `etc/icon-names.json` maps each Lucide name to its UIx component for a codemod.
- **Props:** `size` (`sm`/`md`/`lg` = `--uix-icon-*`, or a length), `tone` (`current`, `muted`, `accent`, `success`, `warning`, `danger`, `info`), `label` (role="img" with a name; otherwise `aria-hidden`), `strokeWidth`.
- **Tokens:** a new `components/icon` stylesheet (`.uix-icon`, sizes, tones, forced-colors, and a `.uix-icon-grid` reference grid). It is in the bundle.
