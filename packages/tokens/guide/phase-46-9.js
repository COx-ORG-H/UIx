export const initAdvancedShowcase = () => {
if (typeof document === 'undefined') return;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

$('.uix-relationship-graph__visual svg')?.setAttribute('role', 'group');
$('.uix-meter')?.setAttribute('aria-label', 'Capacity position: 128 consumed, 100 entitled, 28 over limit');

$('[data-theme-toggle]')?.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('uix-theme', next); } catch { /* storage is optional */ }
});

function updateMoveButtons(container, rowSelector, attribute) {
  const rows = $$(rowSelector, container);
  rows.forEach((row, index) => {
    $(`[${attribute}="up"]`, row).disabled = index === 0;
    $(`[${attribute}="down"]`, row).disabled = index === rows.length - 1;
  });
}

$$('[data-rule-move]').forEach((button) => button.addEventListener('click', () => {
  const row = button.closest('[data-rule-row]');
  const sibling = button.dataset.ruleMove === 'up' ? row.previousElementSibling : row.nextElementSibling;
  if (!sibling) return;
  if (button.dataset.ruleMove === 'up') row.parentElement.insertBefore(row, sibling); else row.parentElement.insertBefore(sibling, row);
  updateMoveButtons(row.parentElement, '[data-rule-row]', 'data-rule-move');
  $('[data-rule-live]').textContent = 'Condition order updated.';
  button.focus();
}));

$$('[data-canvas-move]').forEach((button) => button.addEventListener('click', () => {
  const row = button.closest('[data-canvas-item]');
  const sibling = button.dataset.canvasMove === 'up' ? row.previousElementSibling : row.nextElementSibling;
  if (!sibling) return;
  if (button.dataset.canvasMove === 'up') row.parentElement.insertBefore(row, sibling); else row.parentElement.insertBefore(sibling, row);
  updateMoveButtons(row.parentElement, '[data-canvas-item]', 'data-canvas-move');
  button.focus();
}));
$$('.uix-builder-canvas__item-main').forEach((button) => button.addEventListener('click', () => {
  $$('.uix-builder-canvas__item-main').forEach((item) => { item.setAttribute('aria-pressed', 'false'); item.closest('[data-canvas-item]').classList.remove('uix-builder-canvas__item--selected'); });
  button.setAttribute('aria-pressed', 'true');
  button.closest('[data-canvas-item]').classList.add('uix-builder-canvas__item--selected');
  $('[data-properties-heading]').focus();
}));

$$('[data-calendar-view]').forEach((button) => button.addEventListener('click', () => {
  const agenda = button.dataset.calendarView === 'agenda';
  $('[data-calendar-grid]').hidden = agenda;
  $('[data-calendar-agenda]').hidden = !agenda;
  $$('[data-calendar-view]').forEach((item) => { if (item === button) item.dataset.selected = ''; else delete item.dataset.selected; item.setAttribute('aria-pressed', String(item === button)); });
}));
const calendarDates = $$('[data-calendar-date]');
calendarDates.forEach((button, index) => button.addEventListener('keydown', (event) => {
  const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
  if (!offset) return;
  event.preventDefault();
  const next = calendarDates[Math.max(0, Math.min(calendarDates.length - 1, index + offset))];
  calendarDates.forEach((item) => { item.tabIndex = -1; }); next.tabIndex = 0; next.focus();
}));

const monthNames = ['September 2026', 'October 2026'];
const monthLengths = [30, 31];
const monthOffsets = [1, 3];
const rangeMonths = $('[data-range-months]');
if (rangeMonths) monthNames.forEach((name, monthIndex) => {
  const month = document.createElement('div'); month.className = 'uix-date-range-picker__month';
  const title = document.createElement('h4'); title.textContent = name; month.append(title);
  const weekdays = document.createElement('div'); weekdays.className = 'uix-date-range-picker__weekdays'; weekdays.setAttribute('aria-hidden', 'true');
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach((day) => { const span = document.createElement('span'); span.textContent = day; weekdays.append(span); }); month.append(weekdays);
  const grid = document.createElement('div'); grid.className = 'uix-date-range-picker__grid'; grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', name);
  for (let blank = 0; blank < monthOffsets[monthIndex]; blank += 1) { const span = document.createElement('span'); span.setAttribute('aria-hidden', 'true'); grid.append(span); }
  for (let day = 1; day <= monthLengths[monthIndex]; day += 1) {
    const button = document.createElement('button'); const date = `2026-${monthIndex === 0 ? '09' : '10'}-${String(day).padStart(2, '0')}`;
    button.type = 'button'; button.textContent = String(day); button.dataset.rangeDate = date; button.setAttribute('aria-label', `${day} ${name}`); button.tabIndex = date === '2026-09-08' ? 0 : -1;
    if (date === '2026-09-08') { button.dataset.rangeEdge = 'start'; button.setAttribute('aria-pressed', 'true'); }
    if (date === '2026-09-16' || date === '2026-10-01') button.disabled = true;
    grid.append(button);
  }
  month.append(grid); rangeMonths.append(month);
});
let rangeStart = '2026-09-08';
$$('[data-range-date]').forEach((button, index, buttons) => {
  button.addEventListener('click', () => {
    const date = button.dataset.rangeDate;
    if (!rangeStart) { rangeStart = date; $('[data-range-live]').textContent = `Start date ${button.getAttribute('aria-label')} selected. Choose an end date.`; }
    else { const [start, end] = [rangeStart, date].sort(); buttons.forEach((item) => { const inRange = item.dataset.rangeDate >= start && item.dataset.rangeDate <= end; if (inRange) item.dataset.inRange = ''; else delete item.dataset.inRange; delete item.dataset.rangeEdge; item.setAttribute('aria-pressed', String(inRange)); }); $$(`[data-range-date="${start}"],[data-range-date="${end}"]`).forEach((item) => { item.dataset.rangeEdge = item.dataset.rangeDate === start ? 'start' : 'end'; }); $('[data-range-live]').textContent = `${start} to ${end} selected.`; rangeStart = '';
    }
  });
  button.addEventListener('keydown', (event) => { const offset = { ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7 }[event.key]; if (!offset) return; event.preventDefault(); let target = Math.max(0, Math.min(buttons.length - 1, index + offset)); while (buttons[target]?.disabled && target >= 0 && target < buttons.length) target += offset > 0 ? 1 : -1; const next = buttons[target]; if (next) { buttons.forEach((item) => { item.tabIndex = -1; }); next.tabIndex = 0; next.focus(); } });
});

const graphNodes = $$('[data-node-id]');
graphNodes.forEach((node, index) => node.addEventListener('keydown', (event) => {
  if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
  event.preventDefault(); const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
  const next = graphNodes[(index + direction + graphNodes.length) % graphNodes.length]; graphNodes.forEach((item) => item.tabIndex = -1); next.tabIndex = 0; next.focus();
}));
let zoom = 100;
$$('[data-graph-zoom]').forEach((button) => button.addEventListener('click', () => { zoom = Math.max(50, Math.min(200, zoom + (button.dataset.graphZoom === 'in' ? 20 : -20))); $('[data-graph-live]').textContent = `Zoom ${zoom}%`; $('[data-graph-stage]').setAttribute('transform', `translate(${300 - 3 * zoom} ${200 - 2 * zoom}) scale(${zoom / 100})`); }));

const checks = $$('[data-match-check]');
checks.forEach((check) => check.addEventListener('change', () => { const count = checks.filter((item) => item.checked).length; $('[data-match-count]').textContent = `${count} selected`; $('[data-match-bulk]').disabled = count === 0; }));
$('[data-match-bulk]')?.addEventListener('click', () => { const count = checks.filter((item) => item.checked).length; $('[data-match-live]').textContent = `${count} candidates accepted.`; checks.forEach((item) => { item.checked = false; }); $('[data-match-count]').textContent = '0 selected'; $('[data-match-bulk]').disabled = true; });

$$('[data-metric-step]').forEach((button) => button.addEventListener('click', () => { const input = $('[data-metric]'); const next = Math.max(Number(input.getAttribute('aria-valuemin')), Math.min(Number(input.getAttribute('aria-valuemax')), Number(input.value) + Number(button.dataset.metricStep))); input.value = String(next); input.setAttribute('aria-valuenow', String(next)); }));

$$('[data-diff-action]').forEach((button) => button.addEventListener('click', () => { const resolution = button.dataset.diffAction; $('[data-diff-status]').textContent = resolution; $('[data-diff-status]').className = `uix-pill uix-pill--${resolution === 'pending' ? 'warning' : 'success'}`; $('[data-diff-resolved]').textContent = resolution === 'pending' ? '0' : '1'; $('[data-diff-pending]').textContent = resolution === 'pending' ? '3' : '2'; }));

const colorTrigger = $('[data-color-trigger]');
const colorDialog = $('[data-color-dialog]');
const closeColor = () => { colorDialog.hidden = true; colorTrigger.setAttribute('aria-expanded', 'false'); colorTrigger.focus(); };
colorTrigger?.addEventListener('click', () => { colorDialog.hidden = false; colorTrigger.setAttribute('aria-expanded', 'true'); $('[data-color-hex]').focus(); });
$('[data-color-done]')?.addEventListener('click', closeColor);
colorDialog?.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault(); closeColor(); } });
const colorRanges = colorDialog ? $$('input[type="range"]', colorDialog) : [];
const applyColor = (value, syncRanges = true) => {
  const rgb = value.match(/[0-9A-F]{2}/g).map((part) => parseInt(part, 16) / 255);
  const luminance = rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, v, index) => sum + v * [0.2126, 0.7152, 0.0722][index], 0);
  const contrast = 1.05 / (luminance + 0.05);
  // Scope the user's demo choice to this picker, never the documentation theme.
  colorTrigger.closest('.uix-color-picker').style.setProperty('--uix-brand', value);
  $('[data-color-value]').textContent = value;
  $('[data-color-hex]').value = value;
  $('[data-color-hex]').removeAttribute('aria-invalid');
  const live = $('[data-color-live]');
  live.textContent = `White text contrast ${contrast.toFixed(2)}:1 — ${contrast >= 4.5 ? 'passes' : 'below'} WCAG AA for normal text.`;
  live.classList.toggle('uix-color-picker__contrast--pass', contrast >= 4.5);
  live.classList.toggle('uix-color-picker__contrast--fail', contrast < 4.5);
  if (syncRanges) {
    const [r, g, b] = rgb, max = Math.max(...rgb), min = Math.min(...rgb), delta = max - min;
    const hue = !delta ? 0 : max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
    [hue * 60, max ? delta / max * 100 : 0, max * 100].forEach((v, index) => colorRanges[index].value = Math.round(v));
  }
  colorRanges.forEach((range, index) => range.previousElementSibling.textContent = `${range.value}${index ? '%' : '°'}`);
};
$('[data-color-set]')?.addEventListener('click', () => {
  const input = $('[data-color-hex]');
  const value = input.value.trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(value)) { input.setAttribute('aria-invalid', 'true'); $('[data-color-live]').textContent = 'Enter a six-digit hex color.'; return; }
  applyColor(value);
});
colorRanges.forEach((range) => range.addEventListener('input', () => {
  const [h, saturation, brightness] = colorRanges.map((input) => Number(input.value));
  const s = saturation / 100, v = brightness / 100;
  const channel = (offset) => { const k = (offset + h / 60) % 6; return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))).toString(16).padStart(2, '0'); };
  applyColor(`#${channel(5)}${channel(3)}${channel(1)}`.toUpperCase(), false);
}));
if (colorTrigger) {
  colorDialog.removeAttribute('aria-modal'); // This popover does not trap focus.
  applyColor($('[data-color-hex]').value);
}
$('[data-profile-apply]')?.addEventListener('click', () => { $('[data-profile-live]').textContent = 'Northwind applied. Existing accent, link, ring, and muted roles re-derived.'; });
};
