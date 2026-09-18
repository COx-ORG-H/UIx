/* Live harness for Tabs overflow="scroll" (+ keepMounted), the toned / interactive Stat and
 * CopyButton, bundled by build.mjs from source for tests/a11y/operator-primitives.spec.mjs.
 * window.__op records what the tests need to observe. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CopyButton, Stat, Tab, TabPanel, Tabs } from '../../packages/react/src/index.js';

type Log = { activations: number };
declare global { interface Window { __op: Log } }
window.__op = { activations: 0 };

const TAB_NAMES = [
  'Overview', 'Worklog', 'Linked configuration items', 'Regulatory reporting', 'Attachments',
  'Assignment history', 'Service level agreements', 'Related problems', 'Change requests', 'Audit trail',
];
const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, '-');

function ScrollingTabs() {
  const [value, setValue] = useState('overview');
  return (
    <section aria-labelledby="tabs-title">
      <h2 id="tabs-title">Record tabs</h2>
      <div id="tabs-frame" style={{ width: '20rem', maxWidth: '100%' }}>
        <Tabs value={value} onChange={setValue} overflow="scroll">
          {TAB_NAMES.map((name) => <Tab key={name} value={slug(name)}>{name}</Tab>)}
          {TAB_NAMES.map((name) => (
            <TabPanel key={name} value={slug(name)} keepMounted={name === 'Worklog'}>
              {name === 'Worklog'
                ? <label>Draft note <input id="worklog-draft" /></label>
                : <p>{name} content</p>}
            </TabPanel>
          ))}
        </Tabs>
      </div>
    </section>
  );
}

function Tiles() {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="stats-title">
      <h2 id="stats-title">Key facts</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', gap: 'var(--uix-space-3)' }}>
        <Stat id="stat-sla" label="SLA" value="14 min left" tone="danger" size="compact" meta="Resolution target 16:30" />
        <Stat id="stat-queue" label="Waiting" value="3" tone="warning" size="compact" />
        <Stat
          id="stat-priority"
          label="Priority"
          value="P1"
          meta="Impact high · urgency high"
          size="compact"
          onActivate={() => { window.__op.activations += 1; setOpen((o) => !o); }}
          activateLabel="change"
          expanded={open}
        />
      </div>
      {open && <div id="priority-editor" role="dialog" aria-label="Change priority"><p>Editor</p></div>}
    </section>
  );
}

function Copying() {
  return (
    <section aria-labelledby="copy-title">
      <h2 id="copy-title">Contact</h2>
      <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--uix-space-2)' }}>
        <span>ada@example.com</span>
        <CopyButton value="ada@example.com" label="Copy email" copiedLabel="Copied" failedLabel="Could not copy" />
      </p>
    </section>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ScrollingTabs />
      <Tiles />
      <Copying />
    </StrictMode>,
  );
}
