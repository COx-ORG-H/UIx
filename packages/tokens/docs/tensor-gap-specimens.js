/* Specimens for the gaps TENSOR found while moving its hand-built UI onto the kit at 2.31.0
 * (HAR-1346 follow-ups, 2026-10-08). One readable block per route, appended to that route's
 * showcase page by showcase-data.js. They live here, not inside the one-line page strings there:
 * a line per specimen merges, a single line per page does not.
 *
 * Each block is the HTML the React component renders, so the CSS can be checked without React.
 */

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
const CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false" class="uix-icon uix-icon--sm" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const INFO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
const FILE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>';
const LONG_NAME = 'Quartalsbericht_Finanzen_und_Controlling_2026_Q3_final_final_v7_ueberarbeitet.pdf';

const radioItem = (label, checked) => `<button type="button" role="menuitemradio" aria-checked="${checked}" tabindex="-1" class="uix-menu__item"><span class="uix-menu__check" aria-hidden="true">${checked ? CHECK : ''}</span><span class="uix-menu__text">${label}</span></button>`;
const checkItem = (label, checked) => `<button type="button" role="menuitemcheckbox" aria-checked="${checked}" tabindex="-1" class="uix-menu__item"><span class="uix-menu__check" aria-hidden="true">${checked ? CHECK : ''}</span><span class="uix-menu__text">${label}</span></button>`;
const step = (number, title, body, last) => `<li class="uix-step"><span class="uix-step__marker" aria-hidden="true">${number}</span><div class="uix-step__text"><h3 id="gap-step-${number}" class="uix-step__title">${title}</h3><div class="uix-step__content" role="group" aria-labelledby="gap-step-${number}">${body}</div></div>${last ? '' : '<span class="uix-step__connector" aria-hidden="true"></span>'}</li>`;
const compactSection = (id, title, meta, body, open) => `<details class="uix-collapsible uix-collapsible--compact"${open ? ' open' : ''}><summary class="uix-collapsible__summary"><h3 class="uix-collapsible__heading"><span id="${id}" class="uix-collapsible__title">${title}</span><span class="uix-collapsible__meta">${meta}</span></h3><span class="uix-collapsible__chevron" aria-hidden="true">${CHEVRON}</span></summary><div class="uix-collapsible__body" role="region" aria-labelledby="${id}">${body}</div></details>`;
const heartbeat = (state, label) => `<span class="uix-heartbeat${state === 'live' ? '' : ` uix-heartbeat--${state}`}"${label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"'}><span class="uix-heartbeat__ping"></span><span class="uix-heartbeat__dot"></span></span>`;

export const TENSOR_GAP_SPECIMENS = {
  'examples-navigation': `
<div class="uix-guide__subhead" data-tensor-gaps>Menu radio and checkbox items (React <code>MenuItemRadio</code>, <code>MenuItemCheckbox</code>, <code>MenuRadioGroup</code>) — a check column, so checked and unchecked labels line up</div>
<div class="uix-cluster" style="--gap:24px;align-items:flex-start">
<div class="uix-menu" role="menu" aria-label="Dashboard preset" style="width:240px">
<button type="button" role="menuitem" tabindex="0" class="uix-menu__item" id="gap-manage-presets" data-action-id="preset.manage"><span class="uix-menu__text">Manage presets</span></button>
<div role="separator" class="uix-menu__sep"></div>
<div role="group" aria-labelledby="gap-preset-label"><div id="gap-preset-label" class="uix-menu__label">Dashboard preset</div>
${radioItem('My queue', false)}
${radioItem('Team', true)}
${radioItem('Everything', false)}
</div>
</div>
<div class="uix-menu" role="menu" aria-label="Columns shown" style="width:200px">
${checkItem('State', true).replace('tabindex="-1"', 'tabindex="0"')}
${checkItem('Owner', false)}
${checkItem('Priority', true)}
</div>
</div>
<div class="uix-guide__subhead" data-tensor-gaps>A named tablist (React <code>Tabs aria-label</code>) — the name is on the <code>role="tablist"</code> element</div>
<div class="uix-tabs uix-tabs--line" role="tablist" aria-label="Inbox filters">
<button class="uix-tab" role="tab" aria-selected="true">All</button>
<button class="uix-tab" role="tab" aria-selected="false" tabindex="-1">Unread</button>
<button class="uix-tab" role="tab" aria-selected="false" tabindex="-1">Mentions</button>
</div>
<div class="uix-guide__subhead" data-tensor-gaps>Steps that hold content (React <code>Steps progress={false}</code>) — numbered sections, all on screen, no progress state</div>
<ol aria-label="New change" class="uix-steps uix-steps--list uix-steps--vertical uix-steps--sections" style="max-width:32rem">
${step(1, 'What is changing', '<label class="uix-field__label" for="gap-step-summary">Summary</label><input class="uix-input" id="gap-step-summary" placeholder="Replace the ledger sync job">')}
${step(2, 'When', '<label class="uix-field__label" for="gap-step-window">Window</label><input class="uix-input" id="gap-step-window" placeholder="Saturday 02:00–04:00">')}
${step(3, 'Review', '<p>Check the two parts above, then submit.</p>', true)}
</ol>`,

  'examples-form-controls': `
<div class="uix-guide__subhead" data-tensor-gaps>Segmented as a radio group (React <code>Segmented selection="radio"</code>) — one tab stop, arrow keys change the choice</div>
<div class="uix-cluster" style="--gap:12px">
<span id="gap-theme-label">Theme</span>
<div class="uix-segmented" role="radiogroup" aria-labelledby="gap-theme-label">
<button type="button" role="radio" class="uix-segmented__option" aria-checked="false" tabindex="-1">Light</button>
<button type="button" role="radio" class="uix-segmented__option" aria-checked="true" tabindex="0">System</button>
<button type="button" role="radio" class="uix-segmented__option" aria-checked="false" tabindex="-1">Dark</button>
</div>
</div>
<div class="uix-guide__subhead" data-tensor-gaps>FileUpload and Attachment in a 288 px rail (React <code>FileUpload</code>, <code>Attachment</code>) — an 80-character file name wraps instead of widening the rail; sizes in 1024s with <code>sizeBase={1024}</code></div>
<div style="width:288px;max-width:100%">
<div class="uix-file-upload">
<div class="uix-dropzone">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M7 9l5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></svg>
<strong>Drop files here</strong>
<span class="uix-file-upload__hint">PDF, up to 20 MB</span>
<button type="button" class="uix-btn uix-btn--secondary uix-btn--sm">Choose files</button>
</div>
<ul class="uix-file-upload__errors" role="alert"><li>${LONG_NAME.replace('.pdf', '.exe')} is not an accepted file type (.pdf).</li></ul>
<ul class="uix-filelist uix-file-upload__list" aria-label="Files">
<li class="uix-filelist__item uix-file-upload__item" data-status="done"><span class="uix-attachment__icon">${FILE}</span><div class="uix-file-upload__body"><span class="uix-file-upload__name">${LONG_NAME}</span><span class="uix-file-upload__meta"><span>2.3 MB</span><span class="uix-file-upload__status">Uploaded</span></span></div></li>
</ul>
</div>
<ul class="uix-attachments uix-attachments--list" aria-label="Attachments" style="margin-top:12px">
<li class="uix-attachment"><span class="uix-attachment__icon" aria-hidden="true">${FILE}</span><span class="uix-attachment__body"><span class="uix-attachment__line"><a href="#examples-form-controls" class="uix-attachment__name" download=""><span aria-hidden="true">${LONG_NAME}</span><span class="uix-visually-hidden">Download ${LONG_NAME}</span></a></span><span class="uix-attachment__meta"><span class="uix-attachment__size">2.3 MB</span><span>Ana Petrović · 6 Oct</span></span></span></li>
</ul>
</div>`,

  'examples-data-display': `
<div class="uix-guide__subhead" data-tensor-gaps>Chip: a current link chip, and a removable chip whose body button opens an editor (React <code>Chip current</code>, <code>bodyProps</code>, a forwarded ref)</div>
<div class="uix-cluster" style="--gap:16px">
<nav aria-label="Record types"><div role="group" class="uix-chip-group">
<a href="#examples-data-display" class="uix-chip" aria-current="page" data-on><span class="uix-chip__label">Incidents</span></a>
<a href="#examples-data-display" class="uix-chip"><span class="uix-chip__label">Changes</span></a>
</div></nav>
<span class="uix-chip uix-chip--removable"><button type="button" class="uix-chip__main" id="gap-status-chip" aria-haspopup="dialog" aria-expanded="false"><span class="uix-chip__label">Status: Open</span></button><button type="button" class="uix-chip__remove" aria-label="Remove Status: Open">${CROSS}</button></span>
</div>
<div class="uix-guide__subhead" data-tensor-gaps>StatusPill sizes (React <code>StatusPill size</code>) — sm for a dense cell, the default, lg for a page header</div>
<div class="uix-cluster" style="--gap:12px">
<span class="uix-pill uix-pill--success uix-pill--sm"><span class="uix-pill__dot" aria-hidden="true"></span>Operational</span>
<span class="uix-pill uix-pill--success"><span class="uix-pill__dot" aria-hidden="true"></span>Operational</span>
<span class="uix-pill uix-pill--success uix-pill--lg"><span class="uix-pill__dot" aria-hidden="true"></span>Operational</span>
</div>
<div class="uix-guide__subhead" data-tensor-gaps>Meter for a share that is neither good nor bad (React <code>Meter tone="neutral"</code>, <code>tone="accent"</code>) — not the status green</div>
<div class="uix-stack" style="--gap:10px;max-width:20rem">
<div role="meter" aria-valuenow="42" aria-valuemin="0" aria-valuemax="100" aria-label="Option A, 42% of votes" class="uix-meter"><div class="uix-meter__fill" style="width:42%" data-tone="neutral"></div></div>
<div role="meter" aria-valuenow="58" aria-valuemin="0" aria-valuemax="100" aria-label="Option B, 58% of votes" class="uix-meter"><div class="uix-meter__fill" style="width:58%" data-tone="accent"></div></div>
</div>
<div class="uix-guide__subhead" data-tensor-gaps>ViewMenu density with German labels in a 304 px panel — no label is broken inside a word</div>
<div class="uix-view-menu" style="width:304px;max-width:100%">
<div class="uix-view-menu__group">
<div class="uix-view-menu__label" id="gap-density-label">Zeilenabstand</div>
<div class="uix-segmented" role="group" aria-labelledby="gap-density-label">
<button type="button" class="uix-segmented__option" aria-pressed="false" tabindex="-1">Kompakt</button>
<button type="button" class="uix-segmented__option" aria-pressed="true" tabindex="0">Standard</button>
<button type="button" class="uix-segmented__option" aria-pressed="false" tabindex="-1">Großzügig</button>
</div>
</div>
</div>
<div class="uix-guide__subhead" data-tensor-gaps>Compact sections inside a record card (React <code>CollapsibleSection compact headingLevel</code>) — a heading and a named region each; the description term carries an id (<code>DescriptionItem termProps</code>)</div>
<div class="uix-card" style="max-width:28rem"><div class="uix-card__body">
${compactSection('gap-sec-details', 'Details', '2 fields', '<dl class="uix-dl"><dt id="gap-setting-zone">Time zone</dt><dd>Europe/Sarajevo</dd><dt>Owner</dt><dd>Service desk</dd></dl>', true)}
${compactSection('gap-sec-sla', 'SLA', '2 targets', '<p>Response in 4 h, resolution in 2 days.</p>', false)}
${compactSection('gap-sec-links', 'Related records', '1 link', '<p>CHG-1042 blocks this incident.</p>', false)}
</div></div>`,

  'examples-overlays': `
<div class="uix-guide__subhead" data-tensor-gaps>Alert with an action and a dismiss button (React <code>Alert actions onDismiss</code>) — the text column wraps, the buttons keep their size</div>
<div class="uix-stack" style="--gap:10px;max-width:32rem">
<div class="uix-alert uix-alert--info" role="status"><div class="uix-alert__icon">${INFO}</div><div class="uix-alert__content"><div class="uix-alert__title">Scheduled maintenance on Saturday between 02:00 and 04:00 affects every tenant on the platform</div><div class="uix-alert__body">Sign-in is not available during that time.</div></div><div class="uix-alert__actions"><button type="button" class="uix-btn uix-btn--ghost uix-btn--xs">Details</button></div><button type="button" class="uix-btn uix-btn--ghost uix-btn--xs uix-btn--icon uix-alert__dismiss" aria-label="Dismiss">${CROSS}</button></div>
</div>
<div class="uix-guide__subhead" data-tensor-gaps>Spinner sizes (React <code>Spinner size</code>) — sm 16 px for inline use, 20 px, lg 32 px</div>
<div class="uix-cluster" style="--gap:16px">
<span class="uix-spinner uix-spinner--sm" role="status"><span class="uix-visually-hidden">Loading…</span></span>
<span class="uix-spinner" role="status"><span class="uix-visually-hidden">Loading…</span></span>
<span class="uix-spinner uix-spinner--lg" role="status"><span class="uix-visually-hidden">Loading…</span></span>
</div>
<div class="uix-guide__subhead" data-tensor-gaps>A panel taller than its room is capped and scrolls inside (React <code>Popover capHeight</code>, <code>Menu</code>); an anchored panel that fits neither above nor below its trigger stays inside the viewport</div>
<div class="uix-menu" role="menu" aria-label="Actions" tabindex="0" style="width:220px;max-height:168px;overflow-y:auto">
${Array.from({ length: 12 }, (_, i) => `<button type="button" role="menuitem" tabindex="-1" class="uix-menu__item"><span class="uix-menu__text">Action ${i + 1}</span></button>`).join('\n')}
</div>
<div class="uix-guide__subhead" data-tensor-gaps>A destructive prompt with a multi-line answer (React <code>PromptDialog multiline destructive error</code>) — the dialog body</div>
<div class="uix-prompt" style="max-width:28rem">
<div id="gap-prompt-description">The existing record is overwritten and the collision is closed.</div>
<label class="uix-field__label" for="gap-prompt-reason">Reason</label>
<textarea class="uix-textarea" id="gap-prompt-reason" rows="4" aria-invalid="true" aria-describedby="gap-prompt-error"></textarea>
<div id="gap-prompt-error" class="uix-field__error" role="alert">The import service did not answer.</div>
<div class="uix-cluster" style="--gap:8px;justify-content:flex-end">
<button type="button" class="uix-btn uix-btn--secondary">Cancel</button>
<button type="button" class="uix-btn uix-btn--danger">Import anyway</button>
</div>
</div>`,

  'examples-utility': `
<div class="uix-guide__subhead" data-tensor-gaps>Heartbeat and LiveIndicator (React <code>Heartbeat</code>, <code>LiveIndicator</code>) — decorative beside its text, named when it stands alone</div>
<div class="uix-cluster" style="--gap:22px">
<span class="uix-live">${heartbeat('live')}Live</span>
<span class="uix-live">${heartbeat('idle')}Paused</span>
<span class="uix-live">${heartbeat('warning')}Delayed</span>
${heartbeat('danger', 'Connection lost')}
</div>`,

  // An 'advanced' route: its whole page is the copied component example, so no docs-only class here.
  'examples-rule-builder': `
<p data-tensor-gaps style="margin:var(--uix-space-6) 0 var(--uix-space-3)"><strong>Conditions only, AND only, every word translated (React <code>RuleBuilder conditionsOnly combinator="and" allowGroups={false}</code>) — no "Then" block, no all/any choice, no "Add group"</strong></p>
<div class="uix-rule-builder" aria-label="Regel-Editor" role="group">
<fieldset class="uix-rule-builder__group" data-depth="1"><legend class="uix-rule-builder__group-heading"><span>Wenn</span><span class="uix-rule-builder__match">Treffer bei allen (UND)</span></legend>
<div class="uix-rule-builder__rows">
<div class="uix-rule-builder__condition"><label><span class="uix-visually-hidden">Feld</span><select class="uix-select"><option>Priorität</option><option>Dienst</option></select></label><label><span class="uix-visually-hidden">Vergleich</span><select class="uix-select"><option>ist</option><option>ist nicht</option></select></label><div class="uix-rule-builder__value"><input class="uix-input" value="P1" aria-label="Wert für Priorität"></div><span class="uix-rule-builder__row-actions"><button type="button" class="uix-btn uix-btn--ghost uix-btn--sm" aria-label="Bedingung entfernen">Entfernen</button></span></div>
</div>
<div class="uix-rule-builder__add"><button type="button" class="uix-btn uix-btn--secondary uix-btn--sm">Bedingung hinzufügen</button></div>
</fieldset>
<div class="uix-rule-builder__validation"><span>Die Regel ist gültig.</span></div>
</div>
<p data-tensor-gaps style="margin:var(--uix-space-6) 0 var(--uix-space-3)"><strong>Read-only (React <code>RuleBuilder readOnly</code>) — the same builder with its controls disabled and no add, move or remove buttons</strong></p>
<div class="uix-rule-builder" aria-label="Rule builder, read-only" role="group">
<fieldset class="uix-rule-builder__group" data-depth="1"><legend class="uix-rule-builder__group-heading"><span>When</span><span class="uix-rule-builder__match">Match all (AND)</span></legend>
<div class="uix-rule-builder__rows">
<div class="uix-rule-builder__condition"><label><span class="uix-visually-hidden">Field</span><select class="uix-select" disabled><option>Priority</option></select></label><label><span class="uix-visually-hidden">Operator</span><select class="uix-select" disabled><option>is</option></select></label><div class="uix-rule-builder__value"><input class="uix-input" value="P1" aria-label="Value for Priority" disabled></div></div>
</div>
</fieldset>
</div>`,
};
