/* Live harness for HAR-1369 (MOTUS B-A9), bundled by build.mjs for tests/a11y/diff-match-adopt.spec.mjs.
 * Bosnian/German catalogue data. window.__adopt records every adopt and decision.
 *   - #diff: a DiffViewer of a programme entry (mine / theirs) with names for the paths, values
 *     shown as text and chips, and who changed each version;
 *   - #match: a MatchReview in adopt mode over two registry candidates (DNB, Wikidata), one
 *     already dismissed; adopting takes 600 ms, an ISBN adopt fails once. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Chip, DiffViewer, MatchReview, UixLabelsProvider } from '../../packages/react/src/index.js';
import type { MatchReviewCandidate } from '../../packages/react/src/index.js';

declare global { interface Window { __adopt: { adopted: [string, string[]][]; decisions: string[] } } }
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const base = { title: 'Derviš i smrt', authors: ['Meša Selimović'], tags: ['roman', 'klasik'], year: 1966, venue: { hall: 'Velika sala' } };
const current = { title: 'Derviš i smrt', authors: ['Mesa Selimovic'], tags: ['roman'], year: 1966, venue: { hall: 'Velika sala' } };
const incoming = { title: 'Derviš i smrt (novo izdanje)', authors: ['Meša Selimović'], tags: ['roman', 'klasik', 'lektira'], year: 1967, venue: { hall: 'Mala sala' } };
const NAMES: Record<string, string> = { '$.title': 'Naslov', '$.authors': 'Autori', '$.tags': 'Oznake', '$.year': 'Godina prvog izdanja', '$.venue.hall': 'Dvorana' };
const WHO: Record<string, string> = { current: 'Izmijenila Ana, 12. 10. 2026', incoming: 'Uvoz iz registra (DNB), 20. 10. 2026' };

const FIELDS = [{ id: 'title', label: 'Titel' }, { id: 'author', label: 'Autor' }, { id: 'year', label: 'Jahr' }, { id: 'isbn', label: 'ISBN' }, { id: 'publisher', label: 'Verlag' }];
const RECORD = { title: 'Derviš i smrt', author: 'Mesa Selimovic', year: 1966, isbn: null, publisher: 'Svjetlost' };

function Harness() {
  const [candidates, setCandidates] = useState<MatchReviewCandidate[]>([
    { id: 'dnb-1', confidence: 0.92, record: { title: 'Derviš i smrt', author: 'Meša Selimović', year: 1966, isbn: '978-3-10-071506-8', publisher: 'S. Fischer Verlag' } },
    { id: 'wd-7', confidence: 0.61, record: { title: 'Death and the Dervish', author: 'Meša Selimović', year: 1966, isbn: null, publisher: 'Northwestern University Press' }, status: 'resolved', decision: 'dismissed' },
  ]);
  const [failedOnce, setFailedOnce] = useState(false);
  return (
    <UixLabelsProvider labels={{
      diffViewer: { base: 'Osnova', current: 'Moje', incoming: 'Njihovo', acceptIncoming: 'Preuzmi njihovo', keepCurrent: 'Zadrži moje', markPending: 'Na čekanju', acceptIncomingFor: 'Preuzmi njihovo za {path}', keepCurrentFor: 'Zadrži moje za {path}', markPendingFor: 'Na čekanju za {path}', valueFor: '{version}: {path}', resolve: 'Riješi {path}', changed: 'Izmijenjeno', resolutionPending: 'na čekanju', resolutionAccept: 'preuzeto', resolutionSkip: 'zadržano', notPresent: 'Nema' },
      matchReview: { adoptSelectedOne: '{count} Feld übernehmen', adoptSelectedMany: '{count} Felder übernehmen', adoptField: '{field} von {candidate} übernehmen', same: 'Gleich', field: 'Feld', currentValue: 'Jetzt', candidateValue: 'Kandidat', adopt: 'Übernehmen', provenance: 'Herkunft', adoptedOne: '{count} Feld von {candidate} übernommen', adoptedMany: '{count} Felder von {candidate} übernommen', adoptFailed: 'Übernehmen fehlgeschlagen. Bitte erneut versuchen.', dismiss: 'Verwerfen', pendingOf: '{pending} offen von {total}', decisionDismissed: 'Verworfen' },
    }}>
      <h1>Abgleich</h1>
      <section>
        <h2>Konflikt</h2>
        <DiffViewer
          className="harness-diff" base={base as Json} current={current as Json} incoming={incoming as Json} controlSize="md"
          labelFor={(path) => NAMES[path]}
          renderValue={(value, path) => {
            if (value === undefined) return undefined;
            if (path === '$.tags' && Array.isArray(value)) return <span className="uix-cluster" style={{ gap: 'var(--uix-space-1)' }}>{(value as string[]).map((t) => <Chip key={t}>{t}</Chip>)}</span>;
            return Array.isArray(value) ? value.join(', ') : String(value);
          }}
          provenance={(_path, side) => WHO[side]}
        />
      </section>
      <section>
        <h2>Registerkandidaten</h2>
        <MatchReview
          className="harness-match" fieldMode="adopt" incoming={RECORD} incomingLabel="Katalogeintrag" fields={FIELDS} candidates={candidates}
          candidateLabel={(c) => (c.id === 'dnb-1' ? 'Deutsche Nationalbibliothek' : 'Wikidata')}
          provenance={(c) => (c.id === 'dnb-1' ? 'Abgerufen am 22. 10. 2026 über SRU; Treffer über Titel und Autor (92 %).' : 'Abgerufen am 22. 10. 2026; Treffer über den Autor.')}
          onDecision={(id, action) => { window.__adopt.decisions.push(`${id}:${action}`); setCandidates((cs) => cs.map((c) => (c.id === id ? { ...c, status: 'resolved', decision: 'dismissed' } : c))); }}
          onAdopt={(id, fieldIds) => new Promise<void>((resolve, reject) => {
            window.__adopt.adopted.push([id, fieldIds]);
            setTimeout(() => {
              if (fieldIds.includes('isbn') && !failedOnce) { setFailedOnce(true); reject(new Error('down')); } else resolve();
            }, 600);
          })}
        />
      </section>
    </UixLabelsProvider>
  );
}

window.__adopt = { adopted: [], decisions: [] };
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
