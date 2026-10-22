/* Live harness for the display components, bundled by build.mjs from source. `?case=` picks one
 * section; each section renders the component in the states and containers its spec measures.
 *   - qr: QrCode at its smallest documented size (2 px per module), large, at H, in a card, too long;
 *   - events: EventRow plain, with weekday / year / time, with a thumbnail, long Bosnian titles, in a card;
 *   - contact: ContactCard active with avatar, purged, unavailable, long Bosnian name and address in a narrow column, bare;
 *   - print: an app shell around a PrintLayout A4 findings document over several pages and an A5 poster with a QR
 *     code; &overfull=1 adds a one-page layout whose content does not fit;
 *   - code: CodeDisplay live with copy, in its last minute, expired, lg in a card, a 16-character voucher, beside a form;
 */
import { StrictMode } from 'react';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Avatar, Button, ButtonLink, Card, CodeDisplay, ContactCard, DescriptionList, EventRow, Field, Input, PrintLayout, PrintSignature, QrCode } from '../../packages/react/src/index.js';

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

// an offline thumbnail: a gradient SVG as a data URI
const COVER = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#1447e6"/><stop offset="1" stop-color="#047857"/></linearGradient></defs><rect width="160" height="120" fill="url(#g)"/></svg>')}`;

function EventsCase() {
  return (
    <>
      <h1>Program</h1>
      <section>
        <h2>Događaji</h2>
        <Card title="Oktobar" style={{ maxWidth: '40rem' }}>
          <div id="events">
            <EventRow id="event-plain" month="Okt" day="22" title="Sastanak čitalačkog kluba" meta="Čitaonica, prvi sprat" />
            <EventRow id="event-full" weekday="Sri" month="Okt" day="22" year="2026" time="18:00" dateTime="2026-10-22T18:00+02:00"
              title={<a href="#promocija">Promocija knjige „Đulići i uvehli“ uz razgovor s autoricom i čitanje odlomaka</a>} meta="Narodna i univerzitetska biblioteka · ulaz slobodan"
              media={<img src={COVER} alt="" />} />
            <EventRow id="event-time" month="Nov" day="3" time="09:30" title="Radionica: digitalni katalog" meta="Sala 2" />
            <EventRow id="event-media" month="Dec" day="31" year="2026" title="Novogodišnji koncert" media={<img src={COVER} alt="" />} />
          </div>
        </Card>
      </section>
    </>
  );
}

// a findings document over several A4 pages, an A5 poster, and (with &overfull=1) a poster that does not fit
const PATIENTS = Array.from({ length: 70 }, (_, i) => ({ time: `${String(7 + Math.floor(i / 6)).padStart(2, '0')}:${String((i % 6) * 10).padStart(2, '0')}`, name: `Pacijent ${i + 1} — Đurđević-Šehić`, reason: i % 3 === 0 ? 'Kontrolni pregled nakon terapije' : 'Prvi pregled' }));

declare global { interface Window { __printOverflow: Record<string, boolean> } }

function PrintCase() {
  const overfull = new URLSearchParams(location.search).has('overfull');
  window.__printOverflow ??= {};
  return (
    <div className="uix-shell" style={{ height: '100vh' }}>
      <aside className="uix-shell__sidebar"><nav aria-label="Glavni meni" style={{ padding: 'var(--uix-space-4)' }}>Ordinacija</nav></aside>
      <header className="uix-shell__topbar">Dom zdravlja Centar</header>
      <main className="uix-shell__main">
        <div id="print-toolbar" className="uix-cluster" style={{ marginBottom: 'var(--uix-space-4)' }}>
          <Button variant="primary" onClick={() => window.print()}>Štampaj</Button>
        </div>
        <PrintLayout
          id="nalaz"
          header={<><div><strong>Dom zdravlja Centar</strong><div><a href="https://dom-zdravlja.example/">dom-zdravlja.example</a> · Titova 12, Sarajevo</div></div><div>Nalaz i mišljenje</div></>}
          footer={<span>dr. Amra Hadžić, spec. pedijatrije · <a href="https://dom-zdravlja.example/kontakt">kontakt</a></span>}
        >
          <h1 style={{ margin: 0 }}>Nalaz i mišljenje</h1>
          <DescriptionList items={[
            { term: 'Pacijent', description: 'Lejla Mehmedbašić' },
            { term: 'Datum rođenja', description: '14. 3. 2019.' },
            { term: 'Datum pregleda', description: '22. 10. 2026.' },
          ]} />
          <table className="uix-table">
            <thead><tr><th>Vrijeme</th><th>Pacijent</th><th>Razlog</th></tr></thead>
            <tbody>{PATIENTS.map((row) => <tr key={row.name}><td>{row.time}</td><td>{row.name}</td><td>{row.reason}</td></tr>)}</tbody>
          </table>
          <PrintSignature placeAndDate="Sarajevo, 22. 10. 2026." name="dr. Amra Hadžić, spec. pedijatrije" stamp labels={{ signature: 'Potpis ljekara', stamp: 'Pečat' }} />
        </PrintLayout>
        <PrintLayout id="poster" size="A5" singlePage onOverflowChange={(value) => { window.__printOverflow.poster = value; }}>
          <h1 style={{ margin: 0, textAlign: 'center' }}>Ljetna akcija</h1>
          <p style={{ textAlign: 'center' }}>Skenirajte kod i pogledajte pravila akcije.</p>
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <QrCode value="https://shopx.example/kampanja/ljetna-akcija-2026?uloga=blagajna" label="QR kod: pravila ljetne akcije" errorCorrection="Q" size="60mm" />
          </div>
          <p style={{ textAlign: 'center' }}>Prodavnica SA-0042 · blagajna</p>
        </PrintLayout>
        {overfull && <PrintLayout id="overfull" size="A5" singlePage onOverflowChange={(value) => { window.__printOverflow.overfull = value; }}>
          {Array.from({ length: 40 }, (_, i) => <p key={i}>Red {i + 1}: sedmični pregled prodaje po kasama i smjenama.</p>)}
        </PrintLayout>}
      </main>
    </div>
  );
}

const CASES: Record<string, () => ReactNode> = {
  print: () => <PrintCase />,
  events: () => <EventsCase />,
  contact: () => <ContactCase />,
  qr: () => <QrCase />,
  code: () => <CodeCase />,
};

const name = new URLSearchParams(location.search).get('case') ?? 'qr';
const render = CASES[name] ?? (() => <p>Unknown case {name}</p>);
createRoot(document.getElementById('root')!).render(<StrictMode>{render()}</StrictMode>);
