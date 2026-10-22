/* The docs specimens for the batch-5 display components are the React components' own markup
 * (packages/tokens/docs/display-specimens.js, generated). This test renders them again from the
 * BUILT dist and fails when the committed module differs, so a change to a component's markup
 * cannot leave the docs behind.
 * To update: node packages/react/scripts/render-display-specimens.mjs
 * Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIMEN_MODULE, displaySpecimenModule, renderDisplaySpecimens } from '../scripts/render-display-specimens.mjs';

const committed = readFileSync(SPECIMEN_MODULE, 'utf8');
const specimens = await renderDisplaySpecimens();

test('the committed specimens are exactly what the components render today', () => {
  assert.equal(displaySpecimenModule(specimens), committed, 'packages/tokens/docs/display-specimens.js is out of date — run node packages/react/scripts/render-display-specimens.mjs');
});

test('every state named in a caption is on the page', () => {
  const data = specimens['examples-data-display'];
  // QR code: three symbols, a poster, the smallest size, a voucher at H
  assert.match(data, /data-qr-code-example/);
  assert.equal((data.match(/class="uix-qr-code"/g) ?? []).length, 3);
  assert.match(data, /width="90px"/);
  assert.match(data, /data-error-correction="H"/);
  // code display: live with copy at 9:42, the last minute, expired without copy, a large voucher
  assert.match(data, /data-code-display-example/);
  assert.match(data, /data-state="live"[\s\S]*?Expires in 9:42/);
  assert.match(data, /data-state="soon"[\s\S]*?Expires in 0:45/);
  assert.match(data, /data-state="expired"[\s\S]*?Expired\. Ask for a new code\./);
  assert.equal((data.match(/uix-copy-button/g) ?? []).length, 1);
  assert.match(data, /uix-code-display uix-code-display--lg/);
  // contact card: reachable with mailto/tel, erased without any link or personal data, unavailable
  const crm = specimens['examples-crm-itsm'];
  assert.match(crm, /data-contact-card-example/);
  assert.match(crm, /href="mailto:amra\.hadzic@dom-zdravlja\.example"/);
  assert.match(crm, /href="tel:\+38761234567"/);
  assert.match(crm, /data-state="purged"[\s\S]*?Removed contact[\s\S]*?Personal data erased/);
  assert.doesNotMatch(crm, /Edin|edin@/);
  assert.match(crm, /data-state="unavailable"[\s\S]*?Contact details unavailable/);
  // event rows: a plain one, one with every new slot and a thumbnail, one with a time only
  const home = specimens['examples-editorial-home'];
  assert.match(home, /data-event-row-example/);
  assert.match(home, /<time class="uix-event-date" datetime="2026-10-22T18:00\+02:00"><span class="uix-event-date__weekday">Wed/);
  assert.match(home, /class="uix-event-row uix-event-row--media"/);
  assert.match(home, /<span class="uix-event-date__time">09:30<\/span>/);
  // print layout: an A5 single page, not isolating the docs page, with header, footer and signature
  const prose = specimens['examples-prose'];
  assert.match(prose, /data-print-layout-example/);
  assert.match(prose, /class="uix-print-layout" data-size="A5" data-orientation="portrait" data-page="uix-print-a5-plain" data-single-page=""/);
  assert.doesNotMatch(prose, /data-isolate/);
  assert.match(prose, /<thead class="uix-print-layout__header">/);
  assert.match(prose, /<tfoot class="uix-print-layout__footer">/);
  assert.match(prose, /class="uix-print-signature__stamp"/);
  // QR scanner: idle with the explainer and start button, blocked with retry, unsupported; the manual field in each
  const forms = specimens['examples-form-controls'];
  assert.match(forms, /data-qr-scanner-example/);
  assert.match(forms, /data-status="idle"[\s\S]*?The picture never leaves this device[\s\S]*?Use the camera/);
  assert.match(forms, /data-status="denied"[\s\S]*?The camera is blocked[\s\S]*?Try again/);
  assert.match(forms, /data-status="unsupported"[\s\S]*?This browser cannot use the camera here/);
  assert.equal((forms.match(/class="uix-qr-scanner__manual"/g) ?? []).length, 3);
  for (const html of Object.values(specimens)) assert.doesNotMatch(html, /:r[0-9a-z]+:|_r_[0-9a-z]+_|«r/);
});
