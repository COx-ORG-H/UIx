---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`QrCode`** (HAR-1251; SHOPx PRE-01 poster, the voucher): a string as a scannable, print-safe SVG QR code with the standard four-module quiet zone. `value` (encoded as UTF-8 bytes), `label` (the symbol's accessible name: say where it leads), `errorCorrection` `L` / `M` (default) / `Q` / `H`, `size` (CSS pixels, default 160, or any CSS length such as `'32mm'`; keep at least 2 px per module on a screen and 0.4 mm on paper), `minVersion` (one symbol size for a set of posters). The symbol is print ink on print paper (`--uix-print-ink` / `--uix-print-paper`) in light, dark, print and forced colours, because scanners read dark on light; it shrinks with its container and stays square. A value too long for a QR code renders a labelled square that says so (`labels.tooLong`, or `UixLabelsProvider` `qrCode`).

The encoder is the kit's own and has no runtime dependency: `encodeQr(text, { errorCorrection, minVersion, mask })` returns the module matrix (versions 1 to 40, all eight masks scored by the standard's penalty rules), `qrPath(matrix, margin)` the dark modules as one SVG path, `qrDataCapacity` / `qrVersionFor` the capacity table, and `QrCapacityError` is thrown past version 40. Tests decode the output with a reference decoder (jsQR, a dev dependency only) for the products' inputs at every level, every version from 1 to 12 filled to its last byte and a sample up to 40; a Playwright spec decodes the pixels Chromium paints at the smallest documented size in both themes, with print media and in forced colours.

New stylesheet `styles/components/qr-code.css` (`.uix-qr-code`, `__paper`, `__ink`, `--error`).
