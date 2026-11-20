/* Live harness for the undo deltas (roadmap #23; Docs/specs/2026-11-20-undo-deltas.md), bundled by
 * build.mjs from source for tests/a11y/toast-undo.spec.mjs and the screenshots in the PR. It mounts
 * the docs' live demo (packages/tokens/docs/live/toast-undo-demo.tsx), so the spec also proves the
 * demo on the Toast page works. `window.__toast` is the demo's queue, for the spec's own toasts.
 *
 *   ?platform=mac   Mod is ⌘ (default: Windows / Linux, Mod is Ctrl) */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createToastApi, createToastStore } from '../../packages/react/src/index.js';
import { ToastUndoDemo } from '../../packages/tokens/docs/live/toast-undo-demo.js';

const q = new URLSearchParams(location.search);
const platform = q.get('platform') === 'mac' ? 'mac' : 'other';
const api = createToastApi(createToastStore());
(window as unknown as { __toast: typeof api }).__toast = api;

const root = document.getElementById('root')!;
root.textContent = '';
createRoot(root).render(
  <StrictMode>
    <h1>Undo deltas</h1>
    <section aria-label="Ticket queue">
      <ToastUndoDemo platform={platform} storageKey={null} api={api} />
    </section>
  </StrictMode>,
);
