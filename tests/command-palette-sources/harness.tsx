/* Live harness for the CommandPalette sources, pages, aliases, boosts and frecency (roadmap #9),
 * bundled by build.mjs from source for tests/a11y/command-palette-sources.spec.mjs and the PR's
 * screenshots. It mounts the docs' live demo (packages/tokens/docs/live/command-palette-demo.tsx),
 * so the spec also proves the demo on the component page works.
 *
 *   ?latency=50   the fake server's delay in ms (default 50)
 *   ?fail=1       the server starts failing
 * window.__server is the fake server: the spec flips `fail` and reads `calls` (with their signals). */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ShortcutProvider } from '../../packages/react/src/index.js';
import { CommandPaletteDemo } from '../../packages/tokens/docs/live/command-palette-demo.js';
import type { DemoServer } from '../../packages/tokens/docs/live/command-palette-demo.js';

declare global { interface Window { __server: Required<DemoServer> } }

const q = new URLSearchParams(location.search);
window.__server = { latency: Number(q.get('latency') ?? 50), fail: q.get('fail') === '1', calls: [] };

const root = document.getElementById('root')!;
root.textContent = '';
createRoot(root).render(
  <StrictMode>
    <ShortcutProvider storageKey={null}>
      <h1>Command palette</h1>
      <CommandPaletteDemo server={window.__server} storageKey={null} />
    </ShortcutProvider>
  </StrictMode>,
);
