# Screen-reader scripts — the six complex widgets

One script per widget the enterprise-UX study named for manual evidence (first-five item #4):
DataWorkspace, CommandPalette, Combobox with EntityPicker, DatePicker, DiffViewer, and Toast with the
kit's live regions. They follow `../manual-sr-protocol.md` (protocol 2) and are filled in to
`../results/<component-id>.md`.

## Before you start

1. `npm ci`, `npm run build`, `node tests/at-evidence/build.mjs`, `npm run serve:styleguide`.
2. Open `http://localhost:4178/tests/at-evidence/harness.html` in the pairing's browser. Every widget
   sits in a region with an h2 of its name: jump with the reader's heading key (H in NVDA and JAWS
   browse mode, VO+Cmd+H on macOS, the headings rotor on iOS, headings granularity in TalkBack).
3. Reload the page before each script, so selections and toasts from the last one are gone.
4. Speech settings: default verbosity, punctuation "some". Note the reader and browser versions in
   the result file.

## How to read a script

- **Do**: the keys or gestures. Desktop keys are written for NVDA / JAWS; the VoiceOver and
  TalkBack equivalents are in the step when they differ.
- **Must convey**: the information the step must announce, in any wording and order the reader
  uses. This is the oracle: a step passes when every item is heard without hunting for it.
- **Watch for**: what is known to vary between readers, or what the automated checks could not
  settle. Write what you heard into the result file's transcript table, verbatim where you can.

A step fails when an item in "Must convey" is missing, wrong, or only reachable by exploring with the
virtual cursor. Record the failure, the pairing and what was heard; do not retry until it passes.

The words in the scripts are the harness's English defaults. Product labels (German, Bosnian) change
the words, not the structure.

## Scripts

| Widget | Script | Result file |
|--------|--------|-------------|
| DataWorkspace | [data-workspace.md](data-workspace.md) | `../results/data-workspace.md` |
| CommandPalette | [command-palette.md](command-palette.md) | `../results/command-palette.md` |
| Combobox, EntityPicker | [combobox.md](combobox.md) | `../results/combobox.md` |
| DatePicker | [date-picker.md](date-picker.md) | `../results/date-picker.md` |
| DiffViewer | [diff-viewer.md](diff-viewer.md) | `../results/diff-viewer.md` |
| Toast and live regions | [toast.md](toast.md) | `../results/toast.md` |
