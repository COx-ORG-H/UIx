/* Live harness for the shortcut registry (Docs/specs/2026-11-20-shortcut-registry.md), bundled by
 * build.mjs from source for tests/a11y/shortcut-registry.spec.mjs and the screenshots in the PR.
 * It mounts the docs' live demo (packages/tokens/docs/live/shortcut-demo.tsx), so the spec also
 * proves the demo on the component page works.
 *
 *   ?platform=mac   Mod is ⌘ (default: Windows / Linux, Mod is Ctrl)
 *   ?wide=1         the queue at 48rem instead of the page width */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ShortcutDemo } from '../../packages/tokens/docs/live/shortcut-demo.js';

const q = new URLSearchParams(location.search);
const platform = q.get('platform') === 'mac' ? 'mac' : 'other';

const root = document.getElementById('root')!;
root.textContent = '';
createRoot(root).render(
  <StrictMode>
    <h1>Shortcut registry</h1>
    <section aria-label="Ticket queue" style={q.get('wide') === '1' ? { maxWidth: '48rem' } : undefined}>
      <ShortcutDemo platform={platform} storageKey={null} />
    </section>
  </StrictMode>,
);
