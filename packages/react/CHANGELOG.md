# @tensor_1/react

## 2.4.0

### Minor Changes

- Add `StarButton` and `NavFavourites` — controlled sidebar favourites primitives.

  `StarButton` is the pin/unpin control over the existing `.uix-navitem__star` CSS contract: a STATIC accessible name (`Add {label} to favourites`) plus `aria-pressed` for the pinned state, warning-toned filled glyph when pinned, reveal-on-hover inside a `.uix-navitem`.

  `NavFavourites` is the Favourites disclosure: a header + region (`aria-expanded` / `aria-controls`, focus pulled to the header before collapse) over a controlled, already-resolved item list, each row carrying a consumer-rendered link plus an APG menu-button overflow menu (Move up / Move down / Remove) and Alt+ArrowUp/Down keyboard reorder. UIx owns the look + the controlled contract; consumers keep the favourites list and its persistence.

## 2.3.0

### Minor Changes

- Add `--uix-amber` / `--uix-amber-text` — the SEV-3 (medium) severity tone that completes the ramp (danger = SEV-1, warning = SEV-2, amber = SEV-3). Light `#C98A1E` / `#795006`, dark `#E6B25C`. A muted ochre kept distinct from the brighter `--uix-warning` so the three severity tiers read apart.

## 2.2.0

### Minor Changes

- Add `DescriptionList` / `DescriptionItem` — a controlled key-value body primitive (the `uix-dl` grid) for detail surfaces like the side-peek drawer. UIx owns the layout; consumers supply the formatted values.

  Add typography utility classes (`.uix-text-display` / `-h1` / `-h2` / `-h3` / `-body` / `-body-hushed` / `-meta` / `-eyebrow` / `-data-hero`) and elevation utilities (`.uix-elevated` / `-popover` / `-pill`). These let consumers apply the `--uix-text-*` scale and `--uix-shadow-*` elevation by class instead of re-deriving them inline — the migration target for house products replacing bespoke `type-*` / `surface-*` classes.

  Scope the `uix.base` margin reset to typographic/form elements instead of a bare `* { margin: 0 }`. The universal form sits above a Tailwind consumer's `utilities` layer and silently zeroed every margin utility (`mb-2`, `mt-4`, `space-y-*`) on layout elements. Dialogs (`uix-dialog`/`uix-drawer`/`uix-peek`/`uix-lightbox`) already set their own margins, so centering is unaffected.
