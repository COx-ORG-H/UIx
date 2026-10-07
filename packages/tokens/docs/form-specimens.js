/* Shared by the component reference and the form composition. CSS is production UIx. */
export const tagInputMarkup = `<div class="uix-stack" data-tag-example>
  <label class="uix-field__label" for="example-tags">Project labels</label>
  <div class="uix-taginput">
    <span class="uix-tag">network <button type="button" class="uix-tag__remove" aria-label="Remove network">×</button></span>
    <input id="example-tags" class="uix-taginput__field" placeholder="Add a label" aria-describedby="example-tags-hint">
  </div>
  <p id="example-tags-hint" class="uix-field__hint">Press Enter to add a label. Duplicate labels are ignored.</p>
  <p class="uix-field__hint" role="status" data-tag-status>No changes yet.</p>
</div>`;

export const fileUploadMarkup = `<div class="uix-stack" data-file-example>
  <label class="uix-dropzone"><strong>Choose attachments</strong>
    <span>Local preview only. Files are not uploaded.</span>
    <input class="uix-input" type="file" multiple aria-label="Choose attachments">
  </label>
  <div class="uix-filelist" data-file-list></div>
  <p class="uix-field__hint" role="status" data-file-status>No files selected.</p>
</div>`;

export const initFormSpecimens = (root) => {
  root.querySelectorAll('[data-tag-example]').forEach((example) => {
    const field = example.querySelector('input');
    const status = example.querySelector('[data-tag-status]');
    example.addEventListener('keydown', (event) => {
      if (event.target !== field || event.key !== 'Enter' || event.isComposing) return;
      event.preventDefault();
      const value = field.value.trim();
      if (!value) return;
      const exists = [...example.querySelectorAll('.uix-tag')].some((tag) => tag.firstChild.textContent.trim().toLowerCase() === value.toLowerCase());
      if (exists) { status.textContent = `${value} is already added.`; return; }
      const tag = document.createElement('span');
      tag.className = 'uix-tag';
      tag.append(document.createTextNode(`${value} `));
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'uix-tag__remove';
      remove.setAttribute('aria-label', `Remove ${value}`); remove.textContent = '×';
      tag.append(remove); field.before(tag); field.value = '';
      status.textContent = `Added ${value}.`;
    });
    example.addEventListener('click', (event) => {
      const button = event.target.closest('.uix-tag__remove');
      if (!button) return;
      const value = button.parentElement.firstChild.textContent.trim();
      button.parentElement.remove(); field.focus(); status.textContent = `Removed ${value}.`;
    });
  });
  root.querySelectorAll('[data-file-example]').forEach((example) => {
    example.querySelector('input').addEventListener('change', (event) => {
      const files = [...event.target.files];
      const list = example.querySelector('[data-file-list]');
      list.replaceChildren();
      for (const file of files) {
        const row = document.createElement('div'); row.className = 'uix-filelist__item';
        const name = document.createElement('span'); name.textContent = file.name;
        const size = document.createElement('span'); size.className = 'uix-filelist__size';
        size.textContent = `${new Intl.NumberFormat().format(file.size)} bytes`;
        row.append(name, size); list.append(row);
      }
      example.querySelector('[data-file-status]').textContent = files.length ? `${files.length} file(s) selected locally. Nothing uploaded.` : 'No files selected.';
    });
  });
  initSelectSpecimens(root);
};

/* ---- Select (HAR-1572) ------------------------------------------------------------------
 * The docs specimen is the markup the React `Select` renders (a <button role="combobox">, the
 * hidden form proxy and a top-layer listbox); packages/react/src/select-parity.test.mjs checks
 * that renderToStaticMarkup(<Select>) has the same elements, roles, classes and ARIA as this.
 * initSelectSpecimens() drives it with the same APG keyboard model, so the page shows the real
 * component's markup and behaviour rather than a docs-only look. */
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SELECT_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';

/** Markup of one Select, as the React adapter renders it closed. `value` is a list. */
export const selectMarkup = ({ id, items, value = [], multiple = false, placeholder, disabled = false, readOnly = false, invalid = false, size, name, ariaLabel }) => {
  const flat = items.flatMap((item) => (item.options ? item.options.map((o) => ({ ...o, disabled: o.disabled || item.disabled })) : [item]));
  const chosen = flat.filter((o) => value.includes(o.value));
  const showPlaceholder = !chosen.length;
  const more = multiple && chosen.length > 1 ? chosen.length - 1 : 0;
  const list = `${id}-listbox`;
  let index = 0;
  const option = (o, groupDisabled) => {
    const on = value.includes(o.value);
    const i = index++;
    return `<div id="${id}-option-${i}" role="option" class="uix-listbox__option" aria-selected="${on}"${o.disabled || groupDisabled ? ' aria-disabled="true"' : ''}><span class="uix-listbox__text"><span class="uix-listbox__label">${escHtml(o.label)}</span>${o.description ? `<span class="uix-listbox__desc">${escHtml(o.description)}</span>` : ''}</span><span class="uix-listbox__check" aria-hidden="true">${on ? SELECT_CHECK : ''}</span></div>`;
  };
  const body = items.map((item, g) => (item.options
    ? `<div role="group" class="uix-listbox__group" aria-labelledby="${id}-group-${g}"${item.disabled ? ' aria-disabled="true"' : ''}><div id="${id}-group-${g}" role="presentation" class="uix-listbox__group-label">${escHtml(item.label)}</div>${item.options.map((o) => option(o, item.disabled)).join('')}</div>`
    : option(item, false))).join('');
  const proxyOptions = [...(!multiple && !flat.some((o) => o.value === '') && (placeholder != null || !value.length) ? [{ value: '', label: placeholder ?? '' }] : []), ...flat]
    .map((o) => `<option value="${escHtml(o.value)}"${o.disabled ? ' disabled=""' : ''}${value.includes(o.value) || (!multiple && !value.length && o.value === '') ? ' selected=""' : ''}>${escHtml(o.label)}</option>`).join('');
  const display = showPlaceholder ? escHtml(placeholder ?? '') : `<span class="uix-select__text">${escHtml(chosen[0].label)}</span>`;
  const toolbar = multiple && chosen.length ? `<div class="uix-select__toolbar"><span>${chosen.length} selected</span><button type="button" class="uix-btn uix-btn--link uix-btn--sm" tabindex="-1">Clear</button></div>` : '';
  return `<button${ariaLabel ? ` aria-label="${escHtml(ariaLabel)}"` : ''} id="${id}" type="button" role="combobox" class="uix-select${size === 'sm' ? ' uix-select--sm' : ''}"${disabled ? ' disabled=""' : ''} aria-haspopup="listbox" aria-expanded="false" aria-controls="${list}"${invalid ? ' aria-invalid="true"' : ''}${readOnly ? ' aria-readonly="true"' : ''}${invalid ? ' data-invalid="true"' : ''}${showPlaceholder ? ' data-placeholder="true"' : ''} data-state="closed"><span class="uix-select__value">${display}</span>${more ? `<span class="uix-select__more"><span aria-hidden="true">+${more}</span><span class="uix-visually-hidden">, ${chosen.length} selected</span></span>` : ''}</button>`
    + `<select data-uix-select-proxy="" class="uix-select__proxy" aria-hidden="true" tabindex="-1"${name ? ` name="${escHtml(name)}"` : ''}${disabled ? ' disabled=""' : ''}${multiple ? ' multiple=""' : ''}>${proxyOptions}</select>`
    + `<div class="uix-select__popup" data-uix-select-popup="" hidden="" popover="manual">${toolbar}<div id="${list}" role="listbox" class="uix-listbox uix-select__listbox"${placeholder ? ` aria-label="${escHtml(placeholder)}"` : ''}${multiple ? ' aria-multiselectable="true"' : ''} tabindex="-1">${body}</div></div>`;
};

/** Inputs of the docs Select specimens (the React parity test renders the same ones). */
export const SELECT_SPECIMENS = {
  status: { id: 'sel-status', name: 'status', value: ['resolved'], items: [{ value: 'open', label: 'Open' }, { value: 'progress', label: 'In progress' }, { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' }] },
  team: { id: 'sel-team', name: 'team', placeholder: 'Choose a team', items: [
    { label: 'Service desk', options: [{ value: 'l1', label: 'First line', description: 'Takes new tickets' }, { value: 'l2', label: 'Second line' }, { value: 'vip', label: 'VIP desk', disabled: true }] },
    { label: 'Engineering', options: [{ value: 'net', label: 'Network' }, { value: 'apps', label: 'Applications' }] },
    { label: 'Retired', disabled: true, options: [{ value: 'legacy', label: 'Legacy support' }] },
  ] },
  labels: { id: 'sel-labels', name: 'labels', multiple: true, placeholder: 'Add labels', value: ['network', 'access', 'email'], items: ['Network', 'Hardware', 'Access', 'Email', 'Printing'].map((l) => ({ value: l.toLowerCase(), label: l })) },
  disabled: { id: 'sel-disabled', disabled: true, value: ['p2'], items: [{ value: 'p2', label: 'P2 · High' }] },
  readonly: { id: 'sel-readonly', readOnly: true, value: ['emea'], items: [{ value: 'emea', label: 'EMEA region' }] },
  invalid: { id: 'sel-invalid', invalid: true, placeholder: 'Choose an impact', items: [{ value: 'low', label: 'Low' }, { value: 'high', label: 'High' }] },
  small: { id: 'sel-small', size: 'sm', ariaLabel: 'Rows per page', value: ['25'], items: ['10', '25', '50', '100'].map((n) => ({ value: n, label: `${n} rows` })) },
  long: { id: 'sel-long', value: ['gte'], items: [{ value: 'gte', label: 'is greater than or equal to the configured threshold' }, { value: 'lt', label: 'is less than' }] },
};

const selectField = (label, spec, extra = '') => `<div class="uix-field"><label class="uix-field__label" for="${spec.id}">${label}</label>${selectMarkup(spec)}${extra}</div>`;
const listState = (inner, role) => `<div class="uix-select__popup" data-uix-select-popup=""><div class="uix-select__state"${role ? ` role="${role}"` : ''}>${inner}</div></div>`;

/** The Select reference: every state of the real markup, plus the list's async states. */
export const selectStatesMarkup = `<div class="uix-stack" data-select-example style="--gap:var(--uix-space-5)">
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(13rem,1fr));gap:var(--uix-space-4);align-items:start">
    ${selectField('Status', SELECT_SPECIMENS.status)}
    ${selectField('Team', SELECT_SPECIMENS.team)}
    ${selectField('Labels', SELECT_SPECIMENS.labels)}
    ${selectField('Priority (disabled)', SELECT_SPECIMENS.disabled)}
    ${selectField('Region (read-only)', SELECT_SPECIMENS.readonly)}
    ${selectField('Impact', SELECT_SPECIMENS.invalid, '<div class="uix-field__msg"><span class="uix-field__error">Choose an impact.</span></div>')}
    <div class="uix-field"><span class="uix-field__label">Small</span>${selectMarkup(SELECT_SPECIMENS.small)}</div>
    ${selectField('Condition (long label)', SELECT_SPECIMENS.long)}
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(13rem,1fr));gap:var(--uix-space-4);align-items:start">
    ${listState('<span class="uix-spinner uix-select__spinner" aria-hidden="true"></span>Loading…', 'status')}
    ${listState('No matching options')}
    ${listState('<span>Could not load the options.</span><button type="button" class="uix-btn uix-btn--link uix-btn--sm">Retry</button>')}
  </div>
</div>`;

/** Drive every docs Select: the APG select-only combobox keys, typeahead, multi-select. */
export const initSelectSpecimens = (root) => {
  root.querySelectorAll('button.uix-select[role="combobox"]').forEach((trigger) => {
    if (trigger.hasAttribute('data-uix-select-ready')) return;
    trigger.setAttribute('data-uix-select-ready', '');
    const proxy = trigger.nextElementSibling;
    const popup = proxy?.nextElementSibling;
    const list = popup?.querySelector('[role="listbox"]');
    if (!list) return;
    const options = [...list.querySelectorAll('[role="option"]')];
    const multiple = list.getAttribute('aria-multiselectable') === 'true';
    const enabled = (o) => o.getAttribute('aria-disabled') !== 'true';
    const labelOf = (o) => o.querySelector('.uix-listbox__label').textContent;
    const valueOf = (o) => [...proxy.options].find((p) => p.textContent === labelOf(o))?.value;
    let open = false;
    let active = -1;
    let typed = '';
    let typedTimer = 0;
    let snapshot = [];
    const selected = () => options.filter((o) => o.getAttribute('aria-selected') === 'true');
    const setActive = (i) => {
      active = i;
      options.forEach((o, k) => o.toggleAttribute('data-active', k === i && open));
      if (i >= 0 && open) {
        const o = options[i];
        trigger.setAttribute('aria-activedescendant', o.id);
        if (o.offsetTop < list.scrollTop) list.scrollTop = o.offsetTop;
        else if (o.offsetTop + o.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = o.offsetTop + o.offsetHeight - list.clientHeight;
      } else trigger.removeAttribute('aria-activedescendant');
    };
    const move = (from, delta) => {
      const step = delta > 0 ? 1 : -1;
      if (from < 0) { const o = (step > 0 ? options : [...options].reverse()).find(enabled); return o ? options.indexOf(o) : -1; }
      const target = Math.max(0, Math.min(options.length - 1, from + delta));
      for (let i = target; i >= 0 && i < options.length; i += step) if (enabled(options[i])) return i;
      for (let i = target; i !== from && i >= 0 && i < options.length; i -= step) if (enabled(options[i])) return i;
      return from;
    };
    const match = (buffer, from) => {
      const q = buffer.toLowerCase();
      const repeated = q.length > 1 && [...q].every((c) => c === q[0]);
      const needle = repeated ? q[0] : q;
      const start = repeated || q.length === 1 ? from + 1 : Math.max(0, from);
      for (let k = 0; k < options.length; k += 1) {
        const i = (((start + k) % options.length) + options.length) % options.length;
        if (enabled(options[i]) && labelOf(options[i]).toLowerCase().startsWith(needle)) return i;
      }
      return -1;
    };
    const setSelected = (o, on) => {
      o.setAttribute('aria-selected', String(on));
      o.querySelector('.uix-listbox__check').innerHTML = on ? SELECT_CHECK : '';
    };
    const render = () => {
      const on = selected();
      const value = trigger.querySelector('.uix-select__value');
      trigger.toggleAttribute('data-placeholder', !on.length);
      if (on.length) {
        const text = document.createElement('span');
        text.className = 'uix-select__text';
        text.textContent = labelOf(on[0]);
        value.replaceChildren(text);
      } else value.textContent = list.getAttribute('aria-label') || '';
      trigger.querySelector('.uix-select__more')?.remove();
      if (multiple && on.length > 1) trigger.insertAdjacentHTML('beforeend', `<span class="uix-select__more"><span aria-hidden="true">+${on.length - 1}</span><span class="uix-visually-hidden">, ${on.length} selected</span></span>`);
      const values = on.map(valueOf);
      [...proxy.options].forEach((p) => { p.selected = values.includes(p.value); });
      const count = popup.querySelector('.uix-select__toolbar span');
      if (count) count.textContent = `${on.length} selected`;
    };
    const place = () => {
      const a = trigger.getBoundingClientRect();
      const room = Math.max(a.top, innerHeight - a.bottom) - 12;
      popup.style.minWidth = `${Math.round(a.width)}px`;
      popup.style.maxHeight = `${Math.max(96, Math.min(320, Math.floor(room)))}px`;
      Object.assign(popup.style, { position: 'fixed', inset: 'auto', margin: '0' });
      const h = popup.offsetHeight;
      const below = innerHeight - a.bottom - 4 >= h + 8 || innerHeight - a.bottom > a.top;
      popup.style.top = `${Math.round(below ? a.bottom + 4 : a.top - 4 - h)}px`;
      popup.style.left = `${Math.round(Math.max(8, Math.min(a.left, innerWidth - popup.offsetWidth - 8)))}px`;
    };
    const onScroll = (e) => { if (!popup.contains(e.target)) place(); };
    const onDown = (e) => {
      if (trigger.contains(e.target) || popup.contains(e.target) || [...(trigger.labels || [])].some((l) => l.contains(e.target))) return;
      close();
    };
    const openList = (target = 'selected', char) => {
      if (open || trigger.disabled || trigger.getAttribute('aria-readonly') === 'true') return;
      open = true;
      snapshot = selected();
      popup.hidden = false;
      try { popup.showPopover(); } catch { /* no Popover API: `hidden` drives it */ }
      place();
      trigger.setAttribute('aria-expanded', 'true');
      trigger.dataset.state = 'open';
      const sel = options.indexOf(selected()[0]);
      let i = target === 'first' ? move(-1, 1) : target === 'last' ? move(-1, -1) : sel >= 0 ? sel : move(-1, 1);
      if (char) { const found = match(char, sel); if (found >= 0) i = found; }
      setActive(i);
      addEventListener('scroll', onScroll, true);
      addEventListener('resize', place);
      document.addEventListener('pointerdown', onDown, true);
    };
    function close(revert = false) {
      if (!open) return;
      if (revert && multiple) { options.forEach((o) => setSelected(o, snapshot.includes(o))); render(); }
      open = false;
      setActive(-1);
      try { popup.hidePopover(); } catch { /* no Popover API */ }
      popup.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.dataset.state = 'closed';
      removeEventListener('scroll', onScroll, true);
      removeEventListener('resize', place);
      document.removeEventListener('pointerdown', onDown, true);
    }
    const choose = (i) => {
      const o = options[i];
      if (!o || !enabled(o)) return;
      if (multiple) { setSelected(o, o.getAttribute('aria-selected') !== 'true'); render(); setActive(i); return; }
      options.forEach((x) => setSelected(x, x === o));
      render();
      close();
      trigger.focus();
    };
    const type = (char) => {
      clearTimeout(typedTimer);
      typed += char;
      typedTimer = setTimeout(() => { typed = ''; }, 500);
      return match(typed, active);
    };
    trigger.addEventListener('click', () => { trigger.focus(); if (open) close(); else openList(); });
    trigger.addEventListener('blur', (e) => { if (!popup.contains(e.relatedTarget)) close(); });
    trigger.addEventListener('keydown', (e) => {
      if (trigger.getAttribute('aria-readonly') === 'true') return;
      const printable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
      if (!open) {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList(); }
        else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); openList(e.key === 'Home' ? 'first' : 'last'); }
        else if (printable) { e.preventDefault(); clearTimeout(typedTimer); typed = e.key; typedTimer = setTimeout(() => { typed = ''; }, 500); openList('selected', e.key); }
        return;
      }
      const steps = { ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10 };
      if (e.key === 'ArrowUp' && e.altKey) { e.preventDefault(); if (multiple) close(); else choose(active); }
      else if (e.key in steps) { e.preventDefault(); if (!e.altKey) setActive(move(active, steps[e.key])); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); setActive(move(-1, e.key === 'Home' ? 1 : -1)); }
      else if (e.key === 'Enter' || (e.key === ' ' && !typed)) { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
      else if (e.key === 'Tab') { if (!multiple && active >= 0 && enabled(options[active])) { options.forEach((x, k) => setSelected(x, k === active)); render(); } close(); }
      else if (printable) { e.preventDefault(); const found = type(e.key); if (found >= 0) setActive(found); }
    });
    popup.addEventListener('mousedown', (e) => e.preventDefault());
    popup.addEventListener('pointermove', (e) => {
      const o = e.target.closest('[role="option"]');
      const i = options.indexOf(o);
      if (i >= 0 && i !== active && enabled(o)) setActive(i);
    });
    popup.addEventListener('click', (e) => {
      e.preventDefault();
      if (e.target.closest('.uix-select__toolbar button')) { options.forEach((o) => setSelected(o, false)); render(); return; }
      const i = options.indexOf(e.target.closest('[role="option"]'));
      if (i >= 0) choose(i);
    });
  });
};
