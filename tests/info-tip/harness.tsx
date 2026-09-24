/* Live harness for InfoTip and the `help` slots (HAR-737), bundled by build.mjs from source for
 * tests/a11y/info-tip.spec.mjs and tests/visual/info-tip.spec.mjs.
 *   - #slots: PageHeader, Card, SectionHead and Field with help (Field required, so the marker sits
 *     after the ?), plus a Field without help for comparison. This is the visual golden.
 *   - #long: a bare InfoTip with long text, for the panel measure. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Card, Field, InfoTip, PageHeader, SectionHead } from '../../packages/react/src/index.js';

const PAGE_HELP = 'An incident is an unplanned interruption to a service, or a drop in its quality.\n\nWork the list from the top: it is sorted by priority, then by how close each incident is to breaching its SLA.';
const LONG = Array.from({ length: 6 }, () => 'Plain-text help wraps inside a measure of about 360 px so it stays readable.').join(' ');

function Harness() {
  return (
    <>
      <section id="slots" aria-label="Help slots">
        <PageHeader
          title="Incidents"
          help={PAGE_HELP}
          actions={<Button variant="primary">New incident</Button>}
        />
        <Card title="Open work" titleAs="h2" help="Everything assigned to you or your groups that is not resolved yet.">
          <p>12 open · 3 breaching</p>
        </Card>
        <SectionHead title="Latest news" help="Posts from the last 30 days." />
        <Field label="Impact" required help="How many people or services are affected. Pick the widest group you know of.">
          <input className="uix-input" defaultValue="" />
        </Field>
        <Field label="Short description" required hint="One line, under 80 characters.">
          <input className="uix-input" />
        </Field>
      </section>
      <section id="long" aria-label="Long help">
        <p>Bare InfoTip <InfoTip content={LONG} label="About: long help" /></p>
      </section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
