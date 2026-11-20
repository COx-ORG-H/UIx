/* Live harness for the per-row action panel (Docs/specs/2026-11-20-action-panel.md), bundled by
 * build.mjs from source for tests/a11y/action-panel.spec.mjs and the screenshots in the PR. It
 * mounts the docs' live demo (packages/tokens/docs/live/action-panel-demo.tsx), so the spec also
 * proves the demo on the Data workspace page works.
 *
 *   ?platform=mac   Mod is ⌘ (default: Windows / Linux, Mod is Ctrl) */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ActionPanelDemo } from '../../packages/tokens/docs/live/action-panel-demo.js';

const q = new URLSearchParams(location.search);
const platform = q.get('platform') === 'mac' ? 'mac' : 'other';

const root = document.getElementById('root')!;
root.textContent = '';
createRoot(root).render(
  <StrictMode>
    <h1>Action panel</h1>
    <section aria-label="Ticket queue demo">
      <ActionPanelDemo platform={platform} storageKey={null} />
    </section>
  </StrictMode>,
);
