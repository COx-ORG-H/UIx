/* Live harness for a StatusPill that explains itself (HAR-3109), bundled by build.mjs from source for
 * tests/a11y/status-pill-description.spec.mjs: an incident header row with a button before the pill,
 * as TENSOR's sentiment chip sits; ?case=hand draws the old way, a page's own <button> around a pill. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, StatusPill } from '../../packages/react/src/index.js';

const DETAIL = 'Aus den letzten drei Antworten der meldenden Person geschätzt. Nur ein Hinweis, keine Bewertung.';
const hand = new URLSearchParams(location.search).get('case') === 'hand';

function Harness() {
  return (
    <section aria-label="Störung INC-0173" className="uix-card" style={{ maxWidth: 560, padding: 'var(--uix-space-5)', display: 'flex', alignItems: 'center', gap: 'var(--uix-space-3)' }}>
      <Button data-before>Zuweisen</Button>
      <span>Stimmung</span>
      {hand ? (
        <button type="button" data-hand aria-label="Stimmung: Frustriert" style={{ border: 0, padding: 0, background: 'none', borderRadius: 999, outline: '2px solid #60a5fa', outlineOffset: 2 }}>
          <StatusPill tone="warning">Frustriert</StatusPill>
        </button>
      ) : (
        <StatusPill tone="warning" description={DETAIL} data-described-pill>Frustriert</StatusPill>
      )}
    </section>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
