# @tensor_1/react

Thin React wrappers over the UIx v2 CSS component library — every component is driven by the [`@tensor_1/tokens`](https://www.npmjs.com/package/@tensor_1/tokens) `--uix-*` contract.

## Install

```sh
npm i @tensor_1/react @tensor_1/tokens
```
Peer deps: `react` / `react-dom` (`^18` or `^19`).

## Use

Load the token CSS once (see [`@tensor_1/tokens`](https://www.npmjs.com/package/@tensor_1/tokens)), then import components:

```tsx
import { Button, Card } from "@tensor_1/react";

export default function Example() {
  return (
    <Card>
      <Button>Save</Button>
    </Card>
  );
}
```

Large fixed-height tables can use the opt-in `useVirtualRows` hook. Attach its
`containerRef` to `TableWrap`, render `rows`, and use `padTop` / `padBottom` for
spacer rows. Existing tables continue to render every row by default.

Charts live behind separate entries so they stay out of the main bundle. Install
the optional ECharts peer when using either entry:

```sh
npm i echarts
```

The full-compatibility adapter supports arbitrary ECharts options:

```tsx
import { Chart } from "@tensor_1/react/chart";
```

For line, bar, and pie charts, the preset adapter registers only the common SVG
modules and is substantially smaller:

```tsx
import { Chart } from "@tensor_1/react/chart/preset";
```

Ships **ESM + CJS + types**, with per-file `"use client"` so it's safe under React Server Components. Part of the **[UIx v2 styleguide](https://github.com/COx-ORG-H/UIx)**.
