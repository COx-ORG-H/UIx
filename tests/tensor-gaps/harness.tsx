/* Live harness for the gaps TENSOR found while moving its hand-built UI onto the kit
 * (HAR-1346 follow-ups, 2026-10-08), bundled by build.mjs from source for
 * tests/a11y/tensor-gaps.spec.mjs. One <section id> per issue; window.__gaps records what the
 * components reported, so a test reads state instead of scraping it.
 *
 *   #segmented   HAR-1604  one tab stop, arrows, radiogroup mode, right-to-left
 *   #tabs        HAR-1600  a named tablist, wrap and scroll
 *   #collapsible HAR-1628  compact rows in a card, a remembered section, openRequest
 *   #steps       HAR-1628  steps that hold content
 * and, in more.tsx: #chips (HAR-1632), #files (HAR-1630), #callouts / #dialogs / #hover
 * (HAR-1614), #loading (HAR-1606), #view-menu (HAR-1601).
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, Card, CollapsibleSection, Field, Input, Segmented, SegmentedOption, Step, Steps, Tab, TabPanel, Tabs, Textarea,
} from '../../packages/react/src/index.js';
import { MoreCases } from './more.js';

declare global { interface Window { __gaps: { density: string; theme: string; view: string } } }
window.__gaps = { density: 'default', theme: 'system', view: 'list' };

const params = new URLSearchParams(location.search);

function SegmentedCases() {
  const [density, setDensity] = useState(window.__gaps.density);
  const [theme, setTheme] = useState(window.__gaps.theme);
  const [view, setView] = useState(window.__gaps.view);
  const [unset, setUnset] = useState<string | undefined>(undefined);
  return (
    <section id="segmented">
      <h2>Segmented</h2>
      <Button id="before-segmented">Before</Button>
      <Segmented id="density" aria-label="Row density" value={density} onChange={(v) => { window.__gaps.density = v; setDensity(v); }}>
        <SegmentedOption value="compact">Compact</SegmentedOption>
        <SegmentedOption value="default">Default</SegmentedOption>
        <SegmentedOption value="relaxed">Relaxed</SegmentedOption>
      </Segmented>
      <Button id="between-segmented">Between</Button>
      <span id="theme-label">Theme</span>
      <Segmented id="theme" selection="radio" aria-labelledby="theme-label" value={theme} onChange={(v) => { window.__gaps.theme = v; setTheme(v); }}>
        <SegmentedOption value="light">Light</SegmentedOption>
        <SegmentedOption value="system">System</SegmentedOption>
        <SegmentedOption value="high-contrast" disabled>High contrast</SegmentedOption>
        <SegmentedOption value="dark">Dark</SegmentedOption>
      </Segmented>
      <div dir="rtl">
        <Segmented id="view-rtl" aria-label="View" value={view} onChange={(v) => { window.__gaps.view = v; setView(v); }}>
          <SegmentedOption value="list">List</SegmentedOption>
          <SegmentedOption value="board">Board</SegmentedOption>
          <SegmentedOption value="calendar">Calendar</SegmentedOption>
        </Segmented>
      </div>
      <Segmented id="unset" aria-label="Nothing chosen yet" value={unset} onChange={setUnset}>
        <SegmentedOption value="a">Alpha</SegmentedOption>
        <SegmentedOption value="b">Beta</SegmentedOption>
      </Segmented>
      <Button id="after-segmented">After</Button>
    </section>
  );
}

function TabsCases() {
  const [inbox, setInbox] = useState('all');
  const [news, setNews] = useState('latest');
  return (
    <section id="tabs">
      <h2 id="news-heading">Portal news</h2>
      <Tabs aria-label="Inbox filters" value={inbox} onChange={setInbox}>
        <Tab value="all">All</Tab>
        <Tab value="unread">Unread</Tab>
        <TabPanel value="all">Every notification</TabPanel>
        <TabPanel value="unread">Unread notifications</TabPanel>
      </Tabs>
      <div style={{ width: 220 }}>
        <Tabs aria-labelledby="news-heading" overflow="scroll" value={news} onChange={setNews}>
          {['latest', 'company', 'people', 'product', 'archive'].map((v) => <Tab key={v} value={v}>{v[0]!.toUpperCase() + v.slice(1)}</Tab>)}
          <TabPanel value={news}>News: {news}</TabPanel>
        </Tabs>
      </div>
    </section>
  );
}

function CollapsibleCases() {
  // ?open=sla is the deep link: the request is already set when the section mounts.
  const [jump, setJump] = useState(params.get('open') === 'sla' ? 1 : 0);
  return (
    <section id="collapsible">
      <h2>CollapsibleSection</h2>
      <Button id="jump-sla" onClick={() => setJump((n) => n + 1)}>Jump to SLA</Button>
      <Card title="INC-2041" titleAs="h3" id="record-card">
        <CollapsibleSection id="sec-details" compact headingLevel={4} title="Details" summary="4 fields" defaultOpen persistKey="gaps-details" persistStorage="local">
          <p>Priority, owner, category and source.</p>
        </CollapsibleSection>
        <CollapsibleSection id="sec-sla" compact headingLevel={4} title="SLA" summary="2 targets" lazy persistKey="gaps-sla" persistStorage="local" openRequest={jump}>
          <p id="sla-body">Response in 4 h, resolution in 2 days.</p>
        </CollapsibleSection>
        <CollapsibleSection id="sec-links" compact headingLevel={4} title="Related records">
          <p>CHG-1042 blocks this incident.</p>
        </CollapsibleSection>
      </Card>
      <div style={{ height: 900 }} aria-hidden="true" />
    </section>
  );
}

function StepsCases() {
  return (
    <section id="steps">
      <h2>New change</h2>
      <Steps id="intake" progress={false} headingLevel={3} label="New change">
        <Step title="What is changing" description="One sentence is enough.">
          <Field label="Summary" htmlFor="intake-summary"><Input id="intake-summary" /></Field>
        </Step>
        <Step title="When">
          <Field label="Window" htmlFor="intake-window"><Input id="intake-window" placeholder="Saturday 02:00–04:00" /></Field>
        </Step>
        <Step title="Risk and rollback">
          <Field label="Rollback plan" htmlFor="intake-rollback"><Textarea id="intake-rollback" rows={3} /></Field>
        </Step>
        <Step title="Review">
          <p>Check the three parts above, then submit.</p>
        </Step>
      </Steps>
    </section>
  );
}

function Harness() {
  return (
    <>
      <h1>TENSOR migration gaps</h1>
      <SegmentedCases />
      <TabsCases />
      <StepsCases />
      <MoreCases />
      <CollapsibleCases />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
