# Gradient chart studies

A local design exploration for the next UIx chart treatment. Open `index.html` directly in a browser, or serve the repository and visit `/packages/tokens/mockups/gradient-charts/`.

The brief: show a restrained use of gradients in four familiar chart forms, using UIx's existing typography, chart palette, surfaces, chart cards, buttons, and segmented controls. Compare blue, teal, and orchid palettes, three gradient strengths, light/dark themes, and the same geometry rendered flat. All numbers are explicitly illustrative fixtures; there is no service, tracking, or persistence. This is a mockup, not a package API change.

Acceptance: controls update the charts in place; flat mode preserves values and geometry; visible legends and data tables supplement colour; time-series and bar values can be inspected with pointer or keyboard; the page fits desktop and 320 px layouts in both themes. Check contrast, clipping, keyboard interaction, and script errors in a real browser. Primary risks are low-contrast fades and small-screen chart labels, so marks retain solid edges and narrow charts use a readable minimum plot width inside a labelled scroller.

The studies:

- **Soft fill:** a solid trend line above a translucent area that disappears into the surface.
- **Satin bars:** a vertical hue shift, with the top edge retaining the exact value.
- **Chromatic ring:** gradients within each categorical segment, with explicit counts and percentages.
- **Layered comparison:** a restrained current-period wash against a neutral, solid previous-period line.

Tab to an inspectable chart and use Left/Right, Home/End, or Escape. Expand **View sample data** for exact values. With JavaScript disabled, the data tables remain available. No motion is added; all changes are immediate. For forced-colour displays the charts defer to system colours and the tables retain the values.

These files stay separate from the shipped component styles and generated tokens. Choosing a treatment for the production ECharts adapter is a later step.

Verified in Microsoft Edge: all 36 appearance combinations preserve chart geometry; pointer and keyboard inspection work; both themes fit 320, 390, 768, 1024, and 1440 px viewports, including expanded tables. Reduced-motion and forced-colour modes were checked, and all 32 sample-data rows remain available with JavaScript disabled. Eight axe scans reported no violations; axe could not assess 38 SVG text nodes, so their computed foreground/background contrast was checked separately (minimum 5.33:1 in light and 7.31:1 in dark). JavaScript syntax and whitespace checks passed. No package build is needed for these standalone files.
