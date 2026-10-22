/* Live harness for the display components, bundled by build.mjs from source. `?case=` picks one
 * section; each section renders the component in the states and containers its spec measures.
 *   - qr: QrCode at its smallest documented size (2 px per module), large, at H, in a card, too long;
 */
import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, QrCode } from '../../packages/react/src/index.js';

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

const CASES: Record<string, () => ReactNode> = {
  qr: () => <QrCase />,
};

const name = new URLSearchParams(location.search).get('case') ?? 'qr';
const render = CASES[name] ?? (() => <p>Unknown case {name}</p>);
createRoot(document.getElementById('root')!).render(<StrictMode>{render()}</StrictMode>);
