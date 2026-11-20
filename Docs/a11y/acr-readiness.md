# ACR readiness — what UIx can evidence today

**As of:** 2026-11-20, UIx 2.70.0 plus PR #302 · **For:** whoever writes TENSOR's and MOTUS's
Accessibility Conformance Reports (VPAT 2.5 INT / EN 301 549 edition).

EN 301 549 V4.1.1 (WCAG 2.2 AA) was published on 2 September 2026 and is expected in the EU Official
Journal between 16 December 2026 and 22 January 2027. Buyers ask for an ACR per product. An ACR
reports on a **product**, so UIx evidence supports a product's claims; it never replaces testing the
product's own journeys. This note says which claims the kit can back now, and with what.

## What is evidenced

| Evidence | Covers | Where |
|----------|--------|-------|
| axe (serious and critical gated, light and dark) over the docs, every example route and ~120 harness specs | Automatable parts of WCAG 2.2 A/AA: names, roles, contrast, ARIA validity | `tests/a11y/*.spec.mjs`, CI job `a11y` |
| Target size ratchet, 320 px reflow, forced colours, reduced motion, reduced transparency, text scale | 2.5.8, 1.4.10, 1.4.11 / Windows contrast themes, 2.3.3 (AAA, supportive), 1.4.4 | `target-size.spec.mjs`, `reflow-320.spec.mjs`, `forced-colors.css`, `motion-policy.spec.mjs` |
| Accessibility-tree and live-region assertions for the six complex widgets | 4.1.2 Name, Role, Value; 1.3.1 Info and Relationships; 4.1.3 Status Messages (the region exists and receives the text); 2.1.1 Keyboard and 2.4.3 Focus Order for the scripted paths | `tests/a11y/at-evidence.spec.mjs` (every PR) |
| NVDA's real speech for those widgets, keys pressed by Guidepup on a Windows runner | What NVDA + Chrome says for each scripted step. Automated: nobody listened | `.github/workflows/at-nvda.yml`, `nvda-transcript` artifact, quoted in `results/` |
| Human screen-reader runs | Button only: NVDA + Firefox and JAWS + Chrome, protocol 1, UIx 2.6.0, 2026-07-03 | `results/button.md` |

## What an ACR can say today, per widget

"Supports" in an ACR needs a person to have used the component with the product's AT. No complex
widget has that yet, so none of these can be cited as "Supports" for 4.1.2 / 4.1.3 on the strength
of UIx evidence alone.

| Component | Semantics in place (automated) | NVDA speech (automated) | Human pairings run | Cite as |
|-----------|-------------------------------|-------------------------|--------------------|---------|
| Button | yes | not run | NVDA + Firefox, JAWS + Chrome (protocol 1) | Supports, with JAWS + Chrome; confirm the 2026-07-03 record is a real run (it doubles as the protocol's worked example) |
| DataWorkspace | yes | **fail**: a focused row is spoken as "row" | none | Partially supports until the row-focus finding is fixed or disproved |
| CommandPalette | yes | pass | none | Pending a human NVDA + Chrome and JAWS + Chrome pass |
| Combobox, EntityPicker | yes | **fail** (EntityPicker option and count not spoken) | none | Combobox pending a human pass; EntityPicker partially supports until confirmed |
| DatePicker | yes | **fail**: the focused day is spoken without its date | none | Partially supports until confirmed by a person; the typed field is a supported alternative input path |
| DiffViewer | yes | **fail**: the new pressed state is not spoken | none | Pending; the progress line conveys the outcome |
| Toast and live regions | yes | pass | none | Pending a human pass; 4.1.3 evidence is strong (region mounted before content, spoken once) |

## Still needs a human pass

In this order, each through its script in `scripts/` on the harness, results written to `results/`:

1. **NVDA + Chrome** (T1) for all six. Start with DataWorkspace, DatePicker, EntityPicker and
   DiffViewer, to confirm or disprove the automated findings.
2. **JAWS + Chrome** (T1) for all six. Needs a JAWS licence; nothing in the repo or CI can run it.
3. **JAWS + Edge** (T2), **VoiceOver + Safari** on macOS (T2).
4. **VoiceOver iOS** and **TalkBack + Chrome** (T2) once a touch product uses a widget; until then
   recommended.
5. **NVDA + Firefox** (T3) and a **Narrator + Edge** smoke check.
6. **Button**: NVDA + Chrome (now T1) and VoiceOver + Safari.

That is 6 widgets × 8 pairings = 48 runs for the six, plus Button's two. The two T1 pairings alone
(12 runs) unblock "Stable" and an honest "Supports" for the desktop operator products.

## Defects to resolve before an ACR cites the widgets

- **DataWorkspace row focus** (NVDA, automated): a focused row has no spoken content. Likely needs a
  grid / treegrid row model or focus on a named cell. Design change, needs a ticket.
- **DataWorkspace selection count** is not a live region. Small, but changes what every product
  hears: needs a ticket and a decision on the wording.
- **DatePicker day names**, **EntityPicker options and count**, **DiffViewer pressed state**: seen in
  one automated NVDA run; a person confirms first, then each gets a ticket.
- **EntityPicker "1 results"**: covered by the plural-aware labels work package.
- Fixed in #302: a polite toast spoken twice under React StrictMode.

## How a product cites this

Name the UIx version, link the component's result file and the docs page's screen-reader status
table, and test the product's own journey on top: labels, error recovery, page structure and focus
management across screens are the product's, not the kit's.
