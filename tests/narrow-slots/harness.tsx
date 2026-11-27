/* Live harness for the Alert `actions` and SectionHead `action` slots at narrow widths (HAR-4803),
 * bundled by build.mjs from source for tests/a11y/narrow-slots.spec.mjs. TENSOR's vulnerability
 * programme page, in German, is where both broke at 320 px:
 *   - #alert: an alert with an icon, a title, a sentence and a button;
 *   - #alert-dismiss: the same with a × as well;
 *   - #alert-plain: no icon, a link action;
 *   - #alert-flex: an alert as a flex item with no width of its own (sized by its content);
 *   - #head: a section head with a three-option Segmented;
 *   - #head-link: a section head with a quiet link that fits beside a short title. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Alert, Button, SectionHead, Segmented, SegmentedOption } from '../../packages/react/src/index.js';
import { TriangleAlertIcon } from '../../packages/react/src/icons/components.js';

const SENTENCE =
  'Für 12 Befunde gibt es noch keine Frist. Legen Sie Fristen nach Schweregrad fest, damit überfällige Befunde auffallen.';

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
        <Alert id="alert-dismiss" tone="info" icon={<TriangleAlertIcon />} title="Importe prüfen"
          actions={<Button variant="secondary">Importe öffnen</Button>} onDismiss={() => {}} dismissLabel="Schließen">
          {SENTENCE}
        </Alert>
      </section>
      <section>
        <Alert id="alert-plain" actions={<a href="#x">Alle Befunde</a>}>{SENTENCE}</Alert>
      </section>
      <section style={{ display: 'flex' }}>
        <Alert id="alert-flex" tone="info" actions={<Button variant="secondary">Öffnen</Button>}>Kurz.</Alert>
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
