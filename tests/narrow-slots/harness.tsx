/* Live harness for the Alert `actions` and SectionHead `action` slots at narrow widths (HAR-4803),
 * bundled by build.mjs from source for tests/a11y/narrow-slots.spec.mjs. TENSOR's vulnerability
 * programme page, in German, is where both broke at 320 px:
 *   - #alert: icon, title, a long sentence and a button;
 *   - #alert-short / #alert-short-dismiss: icon, a sentence and a short button ("Öffnen"), the
 *     case that squeezed the sentence most, without and with a ×;
 *   - #alert-plain: no icon, a link action;
 *   - #alert-panel: a short message and its action in a 30rem panel (a drawer, a dialog);
 *   - #alert-fit / #alert-col / #alert-grid: alerts sized by their content (a fit-content
 *     wrapper, a column flex with align-items: flex-start, a grid with justify-items: start);
 *   - #head: a section head with a three-option Segmented;
 *   - #head-link: a section head with a quiet link that fits beside a short title. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Alert, Button, SectionHead, Segmented, SegmentedOption } from '../../packages/react/src/index.js';
import { TriangleAlertIcon } from '../../packages/react/src/icons/components.js';

const SENTENCE =
  'Für 12 Befunde gibt es noch keine Frist. Legen Sie Fristen nach Schweregrad fest, damit überfällige Befunde auffallen.';
const SHORT = 'Drei Importe warten seit gestern auf die Prüfung der Asset-Zuordnung.';

function Periods() {
  const [value, setValue] = useState('30');
  return (
    <Segmented aria-label="Zeitraum" value={value} onChange={setValue}>
      <SegmentedOption value="30">30 Tage</SegmentedOption>
      <SegmentedOption value="90">90 Tage</SegmentedOption>
      <SegmentedOption value="365">12 Monate</SegmentedOption>
    </Segmented>
  );
}

const undo = <Button variant="secondary">Rückgängig</Button>;

function Harness() {
  return (
    <>
      <h1>Schwachstellenprogramm</h1>
      <section>
        <Alert id="alert" tone="warning" icon={<TriangleAlertIcon />} title="Fristen fehlen"
          actions={<Button variant="secondary">Fristen festlegen</Button>}>
          {SENTENCE}
        </Alert>
      </section>
      <section>
        <Alert id="alert-short" tone="info" icon={<TriangleAlertIcon />} actions={<Button variant="secondary">Öffnen</Button>}>
          {SHORT}
        </Alert>
      </section>
      <section>
        <Alert id="alert-short-dismiss" tone="info" icon={<TriangleAlertIcon />}
          actions={<Button variant="secondary">Öffnen</Button>} onDismiss={() => {}} dismissLabel="Schließen">
          {SHORT}
        </Alert>
      </section>
      <section>
        <Alert id="alert-plain" actions={<a href="#x">Alle Befunde</a>}>{SENTENCE}</Alert>
      </section>
      <section id="panel" style={{ width: '30rem', maxWidth: '100%' }}>
        <Alert id="alert-panel" tone="success" icon={<TriangleAlertIcon />} actions={undo}>Gespeichert.</Alert>
      </section>
      <section>
        <div id="fit-wrap" style={{ width: 'fit-content', maxWidth: '100%' }}>
          <Alert id="alert-fit" tone="success" actions={undo}>Gespeichert.</Alert>
        </div>
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <Alert id="alert-col" tone="warning" icon={<TriangleAlertIcon />} actions={<Button variant="secondary">Öffnen</Button>}>
          {SENTENCE}
        </Alert>
      </section>
      <section style={{ display: 'grid', justifyItems: 'start' }}>
        <Alert id="alert-grid" tone="info" actions={undo}>{SHORT}</Alert>
      </section>
      <section>
        <SectionHead id="head" title="Offen nach Schweregrad" action={<Periods />} />
      </section>
      <section>
        <SectionHead id="head-link" title="Dienste" action={<a className="uix-section-link" href="#x">Alle</a>} />
      </section>
    </>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
