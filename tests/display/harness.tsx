/* Live harness for the display components, bundled by build.mjs from source. `?case=` picks one
 * section; each section renders the component in the states and containers its spec measures.
 *   - qr: QrCode at its smallest documented size (2 px per module), large, at H, in a card, too long;
 *   - code: CodeDisplay live with copy, in its last minute, expired, lg in a card, a 16-character voucher, beside a form;
 */
import { StrictMode } from 'react';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Card, CodeDisplay, Field, Input, QrCode } from '../../packages/react/src/index.js';

const CAMPAIGN = 'https://shopx.example/kampanja/ljetna-akcija-2026?trgovina=SA-0042';

function QrCase() {
  return (
    <>
      <h1>QR kod</h1>
      <section>
        <h2>Najmanja veličina</h2>
        {/* version 5 at M: 37 modules + 8 of quiet zone = 45; 2 px per module */}
        <div><QrCode id="qr-small" value={CAMPAIGN} label="QR kod: ljetna akcija" size={90} /></div>
      </section>
      <section>
        <h2>Plakat</h2>
        <div><QrCode id="qr-large" value={CAMPAIGN} label="QR kod: ljetna akcija" errorCorrection="H" size={240} /></div>
      </section>
      <section>
        <h2>U kartici</h2>
        <Card title="Vaučer" style={{ maxWidth: "20rem" }}>
          <QrCode id="qr-card" value="VOUCHER:2026-10-22:00042" label="QR kod vaučera" size="100%" />
        </Card>
      </section>
      <section>
        <h2>Predugo</h2>
        <QrCode id="qr-too-long" value={'x'.repeat(3000)} label="QR kod" errorCorrection="H" size={160} labels={{ tooLong: 'Predugo za QR kod' }} />
      </section>
    </>
  );
}

const minutes = (n: number) => Date.now() + n * 60_000;
// Bosnian words for the code display, as SHOPx renders them
const CODE_LABELS = { expiresIn: 'Ističe za {time}', expiresSoon: 'Još {time} do isteka koda', expired: 'Kod je istekao. Zatražite novi.', copy: 'Kopiraj kod', copied: 'Kopirano', copyFailed: 'Kopiranje nije uspjelo' };

function CodeCase() {
  return (
    <>
      <h1>Kod za uparivanje</h1>
      <section>
        <h2>Aktivan</h2>
        <CodeDisplay id="code-live" code="K7Q4PX9MW" label="Kod za uparivanje kase" expiresAt={minutes(10)} copyable labels={CODE_LABELS} />
      </section>
      <section>
        <h2>Zadnja minuta</h2>
        <CodeDisplay id="code-soon" code="K7Q4PX9MW" label="Kod za uparivanje kase" expiresAt={minutes(0.75)} labels={CODE_LABELS} />
      </section>
      <section>
        <h2>Istekao</h2>
        <CodeDisplay id="code-expired" code="K7Q4PX9MW" label="Kod za uparivanje kase" expiresAt={minutes(-1)} copyable labels={CODE_LABELS} />
      </section>
      <section>
        <h2>Veliki, u kartici</h2>
        <Card title="Uparivanje kase" style={{ maxWidth: '28rem' }}>
          <CodeDisplay id="code-lg" size="lg" code="K7Q4PX9MW" label="Upišite ovaj kod na kasi" expiresAt={minutes(9.5)} copyable labels={CODE_LABELS} />
        </Card>
      </section>
      <section>
        <h2>Vaučer</h2>
        <CodeDisplay id="code-voucher" code="ŠĐ7Q4PXZ9MWČĆ206" groupSize={4} label="Kod vaučera" copyable labels={CODE_LABELS} />
      </section>
      <section>
        <h2>Uz formu</h2>
        <form className="uix-cluster" style={{ alignItems: 'flex-start' } as React.CSSProperties} onSubmit={(e) => e.preventDefault()}>
          <Field label="Naziv kase"><Input defaultValue="Kasa 2" /></Field>
          <CodeDisplay id="code-form" code="ABC123" label="Kod" />
          <Button type="submit">Spremi</Button>
        </form>
      </section>
    </>
  );
}

const CASES: Record<string, () => ReactNode> = {
  qr: () => <QrCase />,
  code: () => <CodeCase />,
};

const name = new URLSearchParams(location.search).get('case') ?? 'qr';
const render = CASES[name] ?? (() => <p>Unknown case {name}</p>);
createRoot(document.getElementById('root')!).render(<StrictMode>{render()}</StrictMode>);
