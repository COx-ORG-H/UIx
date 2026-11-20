# Manual Screen-Reader Test Protocol — UIx v2

**Slice:** A11Y-1 · **Owner:** UIx accessibility · **Protocol version:** 2 · **Last updated:** 2026-11-20

This protocol defines how a human tester verifies a UIx v2 component with real assistive technology
(AT), and how automated evidence sits next to that without being mistaken for it. It pairs with:

- `result-template.md`: the machine-parsable result form to copy per component.
- `results/`: one filled `<component-id>.md` per component tested (`results/button.md` is the
  protocol-1 worked example).
- `scripts/`: one step-by-step script per complex widget, with what each step must announce.
- The per-component status table (tested with, date, result, known issues) on the docs site's
  Accessibility page, section "Screen-reader status", fed by `packages/tokens/docs/at-status.js`;
  and `acr-readiness.md`: what an Accessibility Conformance Report can cite today.
- `tests/at-evidence/harness.html`: one page holding the widgets the scripts test, with the kit's
  English defaults. After `npm ci` and `npm run build`, build it with `node tests/at-evidence/build.mjs`,
  serve the repo root (`npm run serve:styleguide`) and open
  `http://localhost:4178/tests/at-evidence/harness.html`.

A component is identified by its **component id**, the lowercase basename of its CSS file in
`packages/tokens/styles/components/` (e.g. `button` from `button.css`, `data-workspace` from
`data-workspace.css`). This vocabulary is shared verbatim with slices A11Y-2 and BREADTH-1; do not
invent new ids. A component without a stylesheet of its own is recorded in the file of the
stylesheet it renders with, and the file says so (EntityPicker → `combobox.md`, see its header).

---

## 1. AT / OS / browser matrix

Protocol 1 (2026-07-03) had three tiers and made NVDA + Firefox the one required pairing. Protocol 2
weights the matrix by what screen-reader users run. WebAIM's Screen Reader User Survey #11
(July–August 2026, 1,780 responses) puts JAWS at 55.0 % and NVDA at 32.9 % as primary desktop
readers, and the most common pairs at JAWS + Chrome 31.2 %, NVDA + Chrome 17.3 %, JAWS + Edge
17.0 %, NVDA + Firefox 9.1 % and VoiceOver + Safari 4.3 %. On mobile, iOS is 73.3 % and Android
24.0 % ([WebAIM #11](https://webaim.org/projects/screenreadersurvey11/)).

| Key | Tier | Assistive tech | OS | Browser | For "Stable" |
|-----|------|----------------|----|---------|--------------|
| `nvda-chrome` | T1 | NVDA (latest stable) | Windows 11 | Chrome (latest) | **REQUIRED** |
| `jaws-chrome` | T1 | JAWS (latest stable) | Windows 11 | Chrome (latest) | **REQUIRED** |
| `jaws-edge` | T2 | JAWS (latest stable) | Windows 11 | Edge (latest) | Recommended |
| `voiceover-safari` | T2 | VoiceOver | macOS (latest) | Safari (latest) | Recommended |
| `voiceover-ios` | T2 | VoiceOver | iOS (latest) | Safari | **REQUIRED** for touch-relevant components |
| `talkback-chrome` | T2 | TalkBack | Android (latest) | Chrome | **REQUIRED** for touch-relevant components |
| `nvda-firefox` | T3 | NVDA (latest stable) | Windows 11 | Firefox (latest) | Recommended (protocol 1's T1) |
| `narrator-edge` | T3 | Narrator | Windows 11 | Edge (latest) | Smoke check |

"Touch-relevant" means the component appears in a touch product (POSx, SHOPx, a phone layout of
TENSOR or MOTUS). Of the six complex widgets in `scripts/`, **DataWorkspace and DatePicker are
touch-relevant**: MOTUS renders DataWorkspace as mobile record cards and TENSOR's phone-oriented
employee portal uses DatePicker (reported by Qodo's cross-repo review on #302, 2026-11-20; check the
consumers again when the list changes). Their `voiceover-ios` and `talkback-chrome` runs are
required for Stable. For the other four the mobile pairings are recommended until a touch product
renders them.

### Tier required for "Stable"

To promote a component to **Stable**, **both T1 pairings MUST pass** every applicable checklist item
(a documented `na` is acceptable where an item genuinely does not apply). T2 and T3 failures MUST be
recorded in the result file and in the status table as known issues, but they do not by themselves block
Stable, except that a touch-relevant component also needs `voiceover-ios` and `talkback-chrome`.
A component with a T1 `fail` on any applicable item CANNOT be Stable.

A component that reached Stable under protocol 1 (NVDA + Firefox) keeps it; its next result file
is written under protocol 2 and must add the T1 pairs.

### Verdict values

| Value | Meaning |
|-------|---------|
| `pass` | A human ran this pairing and every applicable item passed. |
| `fail` | A human ran this pairing and at least one applicable item failed. |
| `na` | The pairing does not apply to this component (say why). Never for "not run". |
| `not-run` | Nobody has run this pairing yet. It needs a human tester. |

Protocol 1 used `na` for "not run" (e.g. `button.md`'s `voiceover-safari: na`); read those as
`not-run`.

---

## 2. Per-component checklist

Run every item for each component. Each item is **pass**, **fail**, or **na** (with a one-line
reason for `na` or `fail`). "Announced" means the AT speaks it without the tester having to hunt for
it.

1. **Accessible name**: the control exposes a correct, non-empty accessible name (from visible
   text, `aria-label`, `aria-labelledby`, or an associated `<label>`). Icon-only controls still
   announce a meaningful name.
2. **Role**: the AT announces the correct role (e.g. "button", "dialog", "combo box"). Native
   elements are preferred over ARIA `role=` overrides.
3. **Value / state announced**: current value and states are announced and update live:
   pressed/checked/selected/expanded, disabled, invalid, required, busy/loading, sorted, etc.
4. **Focus order = visual order**: Tabbing moves through controls in the same order they appear
   visually; no focus is trapped unexpectedly and nothing off-screen steals focus.
5. **Full keyboard operability**: every interaction is reachable and operable from the keyboard
   with the expected keys (Tab / Shift+Tab, Enter, Space, Esc, arrow keys within composite
   widgets). With a screen reader running, the keys must also work in the mode the reader puts the
   widget in (browse or focus mode, VoiceOver interaction).
6. **Focus-visible ring**: a clearly visible focus indicator appears on keyboard focus (UIx uses
   `:focus-visible { outline: 2px solid var(--uix-ring); outline-offset: 2px }`).
7. **aria-live on async**: asynchronous updates (loading → loaded, toast/alert, validation errors,
   live result counts) are announced via a live region that existed before the change
   (`aria-live`, `role="status"` / `role="alert"`) and/or `aria-busy`. `na` if the component has
   no async behaviour.
8. **Reduced-motion honored**: with OS "reduce motion" on, non-essential animation is removed or
   reduced to imperceptible (the global guard in `packages/tokens/styles/motion.css`), and no
   information is conveyed by motion alone.

---

## 3. Workflow

1. Copy `result-template.md` to `results/<component-id>.md`, or update the existing file.
2. Fill the header with the component id, the uix version under test
   (`packages/tokens/package.json` `version`), tester, and date.
3. For each pairing you run, follow the component's script in `scripts/` step by step, write what
   the reader actually said in the transcript table, then walk the checklist.
4. Set each pairing's header key to `pass`, `fail`, `na` or `not-run` (§1).
5. Update the component's row in `packages/tokens/docs/at-status.js` in the same change, and add
   every `fail` to its known issues with a ticket.
6. Keep the header machine-parsable. `tests/a11y-results.test.mjs` (in `npm run test:a11y`) fails
   on a missing or unknown key, a value outside §1's set, or a status-table row that disagrees with
   the result file.

---

## 4. Automated evidence (what it is and what it is not)

Two kinds of automated evidence sit next to the human runs. Neither ever fills a human pairing cell.

- **Accessibility tree** (`tests/a11y/at-evidence.spec.mjs`, every PR, light and dark): Chromium's
  accessibility tree for each widget (`toMatchAriaSnapshot`), plus names, roles, states, focus
  movement and live-region text. It proves the semantics a screen reader reads are present. It does
  not prove any reader speaks them well.
- **NVDA speech capture** (`.github/workflows/at-nvda.yml`, `tests/at-nvda/run.mjs`): Guidepup
  starts a portable NVDA on a GitHub Windows runner, presses each script's keys through NVDA in
  Chrome for Testing, and keeps what NVDA spoke (`nvda-transcript` artifact). It is NVDA's real
  output, but nobody listened, so it cannot judge verbosity, order or whether a pause in speech
  lost the user. A result file records it in its own `nvda-guidepup` key and quotes the run.

An agent or script must never write `pass` into a human pairing, and must never write an
announcement it did not capture. Expected announcements belong in `scripts/`; observed ones belong
in the transcript tables of `results/`.
