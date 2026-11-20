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

## What the kit can back today, per widget

This table describes **UIx's evidence**, not a conformance verdict. A product's ACR row ("Supports",
"Partially supports", "Does not support") comes from testing **that product** with people using AT;
UIx evidence can be cited alongside it, never instead of it. No complex widget has a human run yet,
so none of them can back a "Supports" claim, and an automated finding does not decide a verdict
either: it tells the product's tester where to look first.

| Component | Semantics in place (automated) | NVDA speech (automated) | Human pairings recorded | Before a product cites it |
|-----------|-------------------------------|-------------------------|-------------------------|---------------------------|
| Button | yes | not run | NVDA + Firefox, JAWS + Chrome (protocol 1, 2.6.0) | Confirm the 2026-07-03 record is a real run (it doubles as the protocol's worked example); add NVDA + Chrome; test the product's own buttons |
| DataWorkspace | yes | fail: a focused row is spoken as "row" | none | Human NVDA + Chrome, JAWS + Chrome, VoiceOver iOS, TalkBack (touch-relevant); resolve or disprove the row-focus and selection-count findings |
| CommandPalette | yes | pass | none | Human NVDA + Chrome and JAWS + Chrome |
| Combobox, EntityPicker | yes | fail: EntityPicker option and count not spoken | none | Human NVDA + Chrome and JAWS + Chrome; confirm the EntityPicker finding |
| DatePicker | yes | fail: the focused day is spoken without its date | none | Human NVDA + Chrome, JAWS + Chrome, VoiceOver iOS, TalkBack (touch-relevant); confirm the day-name finding |
| DiffViewer | yes | fail: the new pressed state is not spoken | none | Human NVDA + Chrome and JAWS + Chrome; confirm the pressed-state finding |
| Toast and live regions | yes | pass | none | Human NVDA + Chrome and JAWS + Chrome |

## Still needs a human pass

In this order, each through its script in `scripts/` on the harness, results written to `results/`:

1. **NVDA + Chrome** (T1) for all six. Start with DataWorkspace, DatePicker, EntityPicker and
   DiffViewer, to confirm or disprove the automated findings.
2. **JAWS + Chrome** (T1) for all six. Needs a JAWS licence; nothing in the repo or CI can run it.
3. **JAWS + Edge** (T2), **VoiceOver + Safari** on macOS (T2).
4. **VoiceOver iOS** and **TalkBack + Chrome** (T2): required for DataWorkspace and DatePicker,
   which already render in touch layouts (protocol §1); recommended for the other four.
5. **NVDA + Firefox** (T3) and a **Narrator + Edge** smoke check.
6. **Button**: NVDA + Chrome (now T1) and VoiceOver + Safari.

That is 6 widgets × 8 pairings = 48 runs for the six, plus Button's two. Stable needs the two T1
pairings for all six (12 runs) plus the two mobile pairings for DataWorkspace and DatePicker (4 runs).

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
table as supporting evidence, and decide the product's verdict from the product's own test with
people using AT: labels, error recovery, page structure and focus management across screens are the
product's, not the kit's. Where UIx records a known issue, the product's row says how the product
works around it or reports it as a limitation.
