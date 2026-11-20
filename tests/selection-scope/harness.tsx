/* Live harness for DataWorkspace's selection scope (enterprise UX study, roadmap #12), bundled by
 * build.mjs from source for tests/a11y/selection-scope.spec.mjs and the screenshots in the PR.
 * It mounts the docs' live demo (packages/tokens/docs/live/selection-scope-demo.tsx), so the spec
 * also proves the demo on the DataWorkspace page works.
 *
 *   ?delay=0   the fake server answers in the next task (default 30 ms here) */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SelectionScopeDemo } from '../../packages/tokens/docs/live/selection-scope-demo.js';

const q = new URLSearchParams(location.search);
const delay = Number(q.get('delay') ?? 30);

const root = document.getElementById('root')!;
root.textContent = '';
createRoot(root).render(
  <StrictMode>
    <h1>Selection scope</h1>
    <SelectionScopeDemo delay={Number.isFinite(delay) ? delay : 30} storageKey={null} />
  </StrictMode>,
);
