/* Live harness for the router-link adapters of Breadcrumbs (HAR-1385) and the Segmented link mode
 * (HAR-1380), bundled by build.mjs from source for tests/a11y/nav-links.spec.mjs.
 * window.__nav records every client navigation the stand-in router made.
 *   - #crumbs: Breadcrumbs with renderLink, German and Bosnian labels, one long unbroken title;
 *   - #header: a page header row with a LocaleSwitcher (short codes) beside a Button and a
 *     toggle Segmented, to compare heights and the lifted segment;
 *   - #long: a Segmented link group with full language names in a narrow Card;
 *   - #sidebar: a LocaleSwitcher in a 14rem column. */
import { StrictMode, useState } from 'react';
import type { MouseEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { Breadcrumbs, Button, Card, LocaleSwitcher, Segmented, SegmentedOption } from '../../packages/react/src/index.js';
import type { UixLinkProps } from '../../packages/react/src/index.js';

declare global { interface Window { __nav: string[] } }

function Harness() {
  const [path, setPath] = useState('/de/program/2026');
  const [view, setView] = useState('list');
  const locale = path.split('/')[1];
  // A stand-in for next/link: client navigation, so the page never reloads.
  const routerLink = (props: UixLinkProps) => (
    <a
      {...props}
      data-router-link=""
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        props.onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
        event.preventDefault();
        window.__nav.push(props.href);
        setPath(props.href);
      }}
    />
  );
  const locales = [
    { code: 'bs', label: 'BS', href: '/bs/program/2026' },
    { code: 'de', label: 'DE', href: '/de/program/2026' },
    { code: 'en', label: 'EN', href: '/en/program/2026' },
  ];
  return (
    <>
      <h1>Navigation</h1>
      <p id="where">{path}</p>
      <section>
        <h2>Brotkrümel</h2>
        <Breadcrumbs
          id="crumbs"
          label="Brotkrümel"
          renderLink={routerLink}
          items={[
            { label: 'Katalog', href: `/${locale}/katalog` },
            { label: 'Autorinnen und Autoren', href: `/${locale}/autor` },
            { label: 'Meša Selimović', href: `/${locale}/autor/mesa-selimovic` },
            { label: 'Derviš i smrt — Donaudampfschifffahrtsgesellschaftskapitänsausgabe' },
          ]}
        />
      </section>
      <section>
        <h2>Kopfzeile</h2>
        <div id="header" className="uix-cluster" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Segmented aria-label="Ansicht" value={view} onChange={setView}>
            <SegmentedOption value="list">Liste</SegmentedOption>
            <SegmentedOption value="grid">Raster</SegmentedOption>
          </Segmented>
          <div className="uix-cluster" style={{ alignItems: 'center' }}>
            <Button size="sm">Anmelden</Button>
            <LocaleSwitcher id="locale" label="Sprache" current={locale} locales={locales} renderLink={routerLink} />
          </div>
        </div>
      </section>
      <section>
        <h2>Lange Namen in einer Karte</h2>
        <Card title="Sprache" style={{ maxWidth: "22rem" }}>
            <Segmented id="long" selection="link" aria-label="Jezik / Sprache" value={locale} renderLink={routerLink}>
              <SegmentedOption value="bs" href="/bs/program/2026" hrefLang="bs" lang="bs">Bosanski (latinica)</SegmentedOption>
              <SegmentedOption value="de" href="/de/program/2026" hrefLang="de" lang="de">Deutsch (Österreich)</SegmentedOption>
              <SegmentedOption value="en" href="/en/program/2026" hrefLang="en" lang="en">English (United Kingdom)</SegmentedOption>
            </Segmented>
        </Card>
      </section>
      <section>
        <h2>Seitenleiste</h2>
        <aside id="sidebar" style={{ width: '14rem', padding: 'var(--uix-space-3)', border: '1px solid var(--uix-border)', borderRadius: 'var(--uix-radius-md)', background: 'var(--uix-surface)' }}>
          <LocaleSwitcher label="Sprache der Seitenleiste" current={locale} locales={locales} renderLink={routerLink} />
        </aside>
      </section>
    </>
  );
}

window.__nav = [];
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
