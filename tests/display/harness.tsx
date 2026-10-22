/* Live harness for the display components, bundled by build.mjs from source. `?case=` picks one
 * section; each section renders the component in the states and containers its spec measures.
 *   - qr: QrCode at its smallest documented size (2 px per module), large, at H, in a card, too long;
 *   - contact: ContactCard active with avatar, purged, unavailable, long Bosnian name and address in a narrow column, bare;
 *   - code: CodeDisplay live with copy, in its last minute, expired, lg in a card, a 16-character voucher, beside a form;
 */
import { StrictMode } from 'react';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Avatar, Button, ButtonLink, Card, CodeDisplay, ContactCard, Field, Input, QrCode } from '../../packages/react/src/index.js';

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

const CONTACT_LABELS = { email: 'E-pošta', emailName: 'E-pošta: {name}', call: 'Pozovi', callName: 'Pozovi: {name}', purgedName: 'Uklonjen kontakt', purged: 'Lični podaci obrisani', unavailable: 'Kontakt podaci nisu dostupni' };

function ContactCase() {
  return (
    <>
      <h1>Kontakti</h1>
      <section>
        <h2>Kartice</h2>
        <div id="contact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: 'var(--uix-space-4)' }}>
          <ContactCard id="contact-active" name="Amra Hadžić" role="Voditeljica ordinacije · Dom zdravlja Centar" avatar={<Avatar size="lg">AH</Avatar>} email="amra.hadzic@dom-zdravlja.example" phone="+387 61 234 567" href="#amra" labels={CONTACT_LABELS} />
          <ContactCard id="contact-purged" name="Edin Kovačević" role="Pacijent" email="edin@example.com" state="purged" labels={CONTACT_LABELS} />
          <ContactCard id="contact-unavailable" name="Selma Đurđević" role="Dobavljač" email="selma@example.com" phone="+387 33 111 222" state="unavailable" labels={CONTACT_LABELS} />
        </div>
      </section>
      <section>
        <h2>Uska kolona</h2>
        <div id="contact-narrow" style={{ width: '15rem', maxWidth: '100%' }}>
          <ContactCard id="contact-long" name="Dr. med. Nermina Mehmedbašić-Hadžiahmetović" role="Specijalistica fizikalne medicine i rehabilitacije" email="nermina.mehmedbasic-hadziahmetovic@kantonalna-bolnica-zenica.example" phone="+387 32 405 133" labels={CONTACT_LABELS}
            actions={<ButtonLink href="#karton" size="sm">Karton</ButtonLink>} />
        </div>
      </section>
      <section>
        <h2>Bez okvira, u kartici</h2>
        <Card title="Odgovorna osoba" style={{ maxWidth: '22rem' }}>
          <ContactCard id="contact-bare" bare name="Haris Dizdarević" role="Administrator" email="haris@example.com" labels={CONTACT_LABELS} />
        </Card>
      </section>
    </>
  );
}

const CASES: Record<string, () => ReactNode> = {
  contact: () => <ContactCase />,
  qr: () => <QrCase />,
  code: () => <CodeCase />,
};

const name = new URLSearchParams(location.search).get('case') ?? 'qr';
const render = CASES[name] ?? (() => <p>Unknown case {name}</p>);
createRoot(document.getElementById('root')!).render(<StrictMode>{render()}</StrictMode>);
