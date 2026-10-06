/* Live harness for TextDiff (HAR-1368), bundled by build.mjs from source for
 * tests/a11y/text-diff.spec.mjs.
 *   - #split: a line diff with folded unchanged runs (context 1), split view.
 *   - #unified: the same texts, unified.
 *   - #words: prose diffed word by word, split. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TextDiff } from '../../packages/react/src/index.js';

const BEFORE = [
  '# Restart the payment gateway', '', 'Use this when card payments time out for more than five minutes.', '',
  '1. Open the incident and page the on-call engineer.', '2. Drain traffic from the active node.',
  '3. Restart the gateway service.', '4. Watch the error rate for ten minutes.', '5. Close the incident with a short summary.',
  '', 'Owner: payments platform team.', 'Review: every quarter.',
].join('\n');
const AFTER = [
  '# Restart the payment gateway', '', 'Use this when card payments time out for more than five minutes.', '',
  '1. Open the incident and page the duty engineer.', '2. Drain traffic from the active node.', '3. Confirm the standby node is healthy.',
  '4. Restart the gateway service.', '5. Watch the error rate for fifteen minutes.', '6. Close the incident with a short summary.',
  '', 'Owner: payments platform team.', 'Review: every quarter.',
].join('\n');

function Harness() {
  return (
    <>
      <section id="split" aria-label="Split">
        <TextDiff before={BEFORE} after={AFTER} beforeLabel="Version 3" afterLabel="Version 4" label="Article body, split" context={1} />
      </section>
      <section id="unified" aria-label="Unified">
        <TextDiff before={BEFORE} after={AFTER} view="unified" beforeLabel="Version 3" afterLabel="Version 4" label="Article body, unified" context={1} />
      </section>
      <section id="words" aria-label="Words">
        <TextDiff
          before="Card payments fail when the gateway restarts during the nightly batch window."
          after="Card payments time out when the gateway restarts during the nightly settlement window."
          granularity="word" beforeLabel="Version 3" afterLabel="Version 4" label="Summary"
        />
      </section>
    </>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><Harness /></StrictMode>);
