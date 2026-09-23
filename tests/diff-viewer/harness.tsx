/* Live harness for DiffViewer's translated action names and controlSize, bundled by build.mjs
 * from source for tests/a11y/diff-viewer.spec.mjs and tests/visual/diff-viewer.spec.mjs.
 * The "programme" fixture mirrors MOTUS's programme conflict comparison (EPE-07): Bosnian
 * words and a theme whose controls are 60px tall. window.__diff records resolution changes. */
import { StrictMode } from 'react';
import type { CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { DiffViewer } from '../../packages/react/src/index.js';
import type { DiffViewerLabels } from '../../packages/react/src/index.js';

type Log = { changes: Array<[string, string]> };
declare global { interface Window { __diff: Log } }
window.__diff = { changes: [] };

const PROGRAMME = {
  base: { title: 'Jutarnja sesija', startsAt: '09:00', venue: 'Sala A' },
  current: { title: 'Jutarnja sesija', startsAt: '09:30', venue: 'Sala A' },
  incoming: { title: 'Jutarnja sesija', startsAt: '10:00', venue: 'Sala B' },
};

const BS: Partial<DiffViewerLabels> = {
  base: 'Osnova', current: 'Trenutno', incoming: 'Dolazno',
  region: 'Razlike u programu', summary: 'Sažetak razlika',
  conflicted: 'U sukobu', changed: 'Izmijenjeno', added: 'Dodano', removed: 'Uklonjeno',
  resolved: 'riješeno', pending: 'na čekanju',
  valueFor: '{version}: vrijednost za {path}', resolve: 'Razriješi {path}',
  acceptIncoming: 'Prihvati dolazno', keepCurrent: 'Zadrži trenutno', markPending: 'Označi na čekanju',
  acceptIncomingFor: 'Prihvati dolazno za {path}', keepCurrentFor: 'Zadrži trenutno za {path}',
  markPendingFor: 'Označi na čekanju za {path}',
  resolutionAccept: 'prihvaćeno', resolutionSkip: 'zadržano', resolutionPending: 'na čekanju',
  notPresent: 'Nije prisutno', progress: 'Riješeno {resolved} od {total} razlika.',
};

const record = (path: string, resolution: string) => { window.__diff.changes.push([path, resolution]); };

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <section id="programme" lang="bs" aria-labelledby="programme-title" style={{ '--uix-control-h': '60px' } as CSSProperties}>
        <h2 id="programme-title">Programme conflict (bs, 60px controls)</h2>
        <DiffViewer {...PROGRAMME} labels={BS} controlSize="md" onResolutionChange={record} />
      </section>
      <section id="large" aria-labelledby="large-title">
        <h2 id="large-title">Large controls</h2>
        <DiffViewer base={{ limit: 1 }} current={{ limit: 2 }} incoming={{ limit: 3 }} controlSize="lg" />
      </section>
      <section id="compact" aria-labelledby="compact-title">
        <h2 id="compact-title">Default (compact)</h2>
        <DiffViewer base={{ retentionDays: 30 }} current={{ retentionDays: 60 }} incoming={{ retentionDays: 90 }} />
      </section>
    </StrictMode>,
  );
}
