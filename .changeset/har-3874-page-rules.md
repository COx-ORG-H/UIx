---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

HAR-3874: the page rules every product can run, and the severity ramp they point at.

- **`uix-page-rules`**, a new bin in `@tensor_1/react` that you can also import from `@tensor_1/react/page-rules`. It checks how a product's pages use the kit, with no dependencies. It carries the rules from the TENSOR UI council climbs:
  - severity through a generic tone helper, or "high" mapped to red;
  - labels broken mid-word;
  - the page title said twice;
  - unnamed row menus;
  - lists joined in a table cell;
  - raw buttons, tables and form controls;
  - literal font sizes.

  A product adds a config and seeds a baseline. The baseline counts findings per rule and per file, and it only shrinks. The check fails on new debt, on paid debt left in the baseline and on stale exemptions. `page-rules/README.md` has the setup.
- **`severityTone(severity)`** gives a severity's `StatusPill` tone on the one severity ramp: `critical` is red, `high` is amber (`warning`), and medium, low and anything else are neutral. Use it instead of a generic status map, which turns every "High" red.
