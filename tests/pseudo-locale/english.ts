/* Every UixLabels namespace with the kit's English defaults: the source the pseudo-locales are made
 * from (tests/pseudo-locale/pseudo.mjs). The DEFAULT_* exports where a component has one; the inline
 * defaults (modal, drawer, select …) copied from the components. tests/a11y/pseudo-locale.spec.mjs
 * fails when UixLabels gains a namespace this object does not list.
 *
 * When the complete English pack lands (`@tensor_1/react/locales/en`, the plural-labels work), this
 * file becomes `export { en as ENGLISH } from '../../packages/react/src/locales/en.js'`. */
import {
  DEFAULT_ACCOUNT_MENU_LABELS, DEFAULT_ATTACHMENT_LABELS, DEFAULT_AUDIT_LOG_LABELS, DEFAULT_BUTTON_RESULT_LABELS,
  DEFAULT_CODE_DISPLAY_LABELS, DEFAULT_CONTACT_CARD_LABELS, DEFAULT_DASHBOARD_CANVAS_LABELS, DEFAULT_DATA_WORKSPACE_LABELS, DEFAULT_DATE_PICKER_LABELS,
  DEFAULT_DATE_RANGE_PICKER_LABELS, DEFAULT_DATE_TIME_PICKER_LABELS, DEFAULT_DIFF_VIEWER_LABELS,
  DEFAULT_DISPLAY_PREFERENCES_LABELS, DEFAULT_ENTITY_PICKER_LABELS, DEFAULT_FILE_UPLOAD_LABELS, DEFAULT_FILTER_EDITOR_LABELS,
  DEFAULT_FILTER_SUMMARY_LABELS, DEFAULT_INLINE_EDIT_LABELS, DEFAULT_KANBAN_LABELS, DEFAULT_KEYBOARD_GRAB_LABELS, DEFAULT_LIGHTBOX_LABELS,
  DEFAULT_MATCH_REVIEW_LABELS, DEFAULT_ORG_CHART_LABELS, DEFAULT_PAGINATION_LABELS, DEFAULT_PASSWORD_INPUT_LABELS,
  DEFAULT_PRINT_LAYOUT_LABELS, DEFAULT_QR_CODE_LABELS, DEFAULT_QR_SCANNER_LABELS, DEFAULT_RULE_BUILDER_LABELS,
  DEFAULT_SCHEDULING_CALENDAR_LABELS, DEFAULT_SCHEDULING_TIMELINE_LABELS, DEFAULT_SESSION_TIMEOUT_LABELS, DEFAULT_SHORTCUT_LABELS, DEFAULT_SORTABLE_LIST_LABELS,
  DEFAULT_TAG_INPUT_LABELS, DEFAULT_TEXT_DIFF_LABELS, DEFAULT_TIME_PICKER_LABELS, DEFAULT_TREE_LABELS,
  FILE_DROP_LABELS_EN, FILE_KIND_LABELS_EN, FILE_ROW_LABELS_EN,
} from '../../packages/react/src/index.js';
import type { UixLabels } from '../../packages/react/src/index.js';

const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 0 });
const STATUS = { done: 'Done', failed: 'Failed', cancelled: 'Cancelled' } as const;

export const ENGLISH = {
  buttonResult: DEFAULT_BUTTON_RESULT_LABELS,
  modal: { close: 'Close dialog' },
  drawer: { close: 'Close drawer' },
  discardPrompt: { title: 'Discard changes?', description: 'What you entered here will be lost.', keepEditing: 'Keep editing', discard: 'Discard' },
  sessionTimeout: DEFAULT_SESSION_TIMEOUT_LABELS,
  peek: { previous: 'Previous record', next: 'Next record', close: 'Close preview' },
  toolbar: { more: 'More' },
  lightbox: DEFAULT_LIGHTBOX_LABELS,
  toast: { dismiss: 'Dismiss' },
  toaster: { region: 'Notifications' },
  taskTray: {
    region: 'Background tasks', clearFinished: 'Clear finished', cancel: 'Cancel', dismiss: 'Dismiss',
    running: () => 'running', done: () => 'done', failed: () => 'failed', cancelled: () => 'cancelled',
    status: STATUS, formatPercent: (fraction: number) => percent.format(fraction),
    announceStarted: (title: string) => `Started: ${title}`,
    announceFinished: (status: keyof typeof STATUS, title: string, message?: string) => `${STATUS[status]}: ${title}.${message ? ` ${message}` : ''}`,
  },
  appShell: { skipToContent: 'Skip to content', exitFocus: 'Esc · Exit focus', openNav: 'Open navigation', navigation: 'Navigation' },
  displayPreferences: DEFAULT_DISPLAY_PREFERENCES_LABELS,
  accountMenu: DEFAULT_ACCOUNT_MENU_LABELS,
  sidebar: { expand: 'Expand sidebar', collapse: 'Collapse sidebar' },
  searchSuggest: { clear: 'Clear search' },
  searchBar: { clear: 'Clear search', submit: 'Search' },
  commandPalette: { input: 'Command palette', resultsOne: '{count} result', resultsMany: '{count} results', empty: 'No results', recent: 'Recent' },
  qrCode: DEFAULT_QR_CODE_LABELS,
  codeDisplay: DEFAULT_CODE_DISPLAY_LABELS,
  contactCard: DEFAULT_CONTACT_CARD_LABELS,
  printLayout: DEFAULT_PRINT_LAYOUT_LABELS,
  qrScanner: DEFAULT_QR_SCANNER_LABELS,
  entityPicker: DEFAULT_ENTITY_PICKER_LABELS,
  tree: DEFAULT_TREE_LABELS,
  orgChart: DEFAULT_ORG_CHART_LABELS,
  inlineEdit: DEFAULT_INLINE_EDIT_LABELS,
  sortableList: DEFAULT_SORTABLE_LIST_LABELS,
  keyboardGrab: DEFAULT_KEYBOARD_GRAB_LABELS,
  confirmDialog: { typeToConfirm: 'Type {value} to confirm', compensation: 'How to undo this', typeToConfirmMismatch: 'That does not match {value}.' },
  schedulingCalendar: DEFAULT_SCHEDULING_CALENDAR_LABELS,
  dateRangePicker: DEFAULT_DATE_RANGE_PICKER_LABELS,
  datePicker: DEFAULT_DATE_PICKER_LABELS,
  dateTimePicker: DEFAULT_DATE_TIME_PICKER_LABELS,
  timePicker: DEFAULT_TIME_PICKER_LABELS,
  schedulingTimeline: DEFAULT_SCHEDULING_TIMELINE_LABELS,
  textDiff: DEFAULT_TEXT_DIFF_LABELS,
  diffViewer: DEFAULT_DIFF_VIEWER_LABELS,
  matchReview: DEFAULT_MATCH_REVIEW_LABELS,
  auditLog: DEFAULT_AUDIT_LOG_LABELS,
  dataWorkspace: DEFAULT_DATA_WORKSPACE_LABELS,
  filterEditor: DEFAULT_FILTER_EDITOR_LABELS,
  filterSummary: DEFAULT_FILTER_SUMMARY_LABELS,
  select: {
    search: 'Search options', searchPlaceholder: 'Search…', loading: 'Loading…', empty: 'No options', noMatches: 'No matching options',
    error: 'Could not load the options.', retry: 'Retry', clear: 'Clear', done: 'Done', selectedCount: '{count} selected', results: '{count} options',
  },
  ruleBuilder: DEFAULT_RULE_BUILDER_LABELS,
  fileUpload: DEFAULT_FILE_UPLOAD_LABELS,
  fileRow: FILE_ROW_LABELS_EN,
  fileDrop: FILE_DROP_LABELS_EN,
  fileKinds: FILE_KIND_LABELS_EN,
  attachment: DEFAULT_ATTACHMENT_LABELS,
  tagInput: DEFAULT_TAG_INPUT_LABELS,
  passwordInput: DEFAULT_PASSWORD_INPUT_LABELS,
  chip: { remove: 'Remove {label}' },
  alert: { dismiss: 'Dismiss' },
  pagination: DEFAULT_PAGINATION_LABELS,
  bulkBar: { region: 'Bulk actions' },
  infoTip: { about: 'About: {title}', more: 'More information' },
  shortcuts: DEFAULT_SHORTCUT_LABELS,
  kanban: DEFAULT_KANBAN_LABELS,
  dashboardCanvas: DEFAULT_DASHBOARD_CANVAS_LABELS,
  viewMenu: {
    rowActions: 'Column actions: {label}', reorder: 'Drag to reorder: {label}', moveUp: 'Move up', moveDown: 'Move down',
    hide: 'Hide', show: 'Show', required: 'Always shown', moved: '{label} moved to position {position} of {count}',
  },
} satisfies Omit<Required<UixLabels>, 'dateFormat'>;
