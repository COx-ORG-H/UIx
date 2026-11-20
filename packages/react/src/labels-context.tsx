"use client";

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { PaginationLabels } from './components/Pagination.js';
import type { SchedulingCalendarLabels } from './components/SchedulingCalendar.js';
import type { DateRangePickerLabels } from './components/DateRangePicker.js';
import type { DatePickerLabels, DateTimePickerLabels } from './components/DatePicker.js';
import type { SchedulingTimelineLabels } from './components/SchedulingTimeline.js';
import type { TextDiffLabels } from './components/TextDiff.js';
import type { FilterEditorLabels } from './components/FilterEditor.js';
import type { FilterSummaryLabels } from './filter-model.js';
import type { SelectLabels } from './components/Select.js';
import type { RuleBuilderLabels } from './components/RuleBuilder.js';
import type { FileUploadLabels } from './components/FileUpload.js';
import type { AttachmentLabels } from './attachment-labels.js';
import type { FileKindLabels } from './file-model.js';
import type { FileRowLabels } from './components/FileRow.js';
import type { FileDropLabels } from './components/FileDrop.js';
import type { EntityPickerLabels } from './components/EntityPicker.js';
import type { TreeLabels } from './components/Tree.js';
import type { OrgChartLabels } from './components/OrgChart.js';
import type { InlineEditLabels } from './components/InlineEdit.js';
import type { DiscardPromptLabels } from './components/DiscardPrompt.js';
import type { ErrorSummaryLabels } from './components/ErrorSummary.js';
import type { ConflictNoticeLabels } from './components/ConflictNotice.js';
import type { LeaveGuardLabels } from './hooks/useLeaveGuard.js';
import type { SessionTimeoutLabels } from './components/SessionTimeout.js';
import type { SearchBarLabels } from './components/SearchBar.js';
import type { KeyboardGrabLabels } from './hooks/useKeyboardGrab.js';
import type { LightboxLabels } from './components/Lightbox.js';
import type { SortableListLabels } from './components/SortableList.js';
import type { KanbanLabels } from './components/Kanban.js';
import type { DashboardCanvasLabels } from './components/DashboardCanvas.js';
import type { ViewMenuColumnLabels } from './components/TableControls.js';
import type { DiffViewerLabels } from './components/DiffViewer.js';
import type { MatchReviewLabels } from './components/MatchReview.js';
import type { QrCodeLabels } from './components/QrCode.js';
import type { CodeDisplayLabels } from './components/CodeDisplay.js';
import type { ContactCardLabels } from './components/ContactCard.js';
import type { PrintLayoutLabels } from './components/PrintLayout.js';
import type { QrScannerLabels } from './components/QrScanner.js';
import type { PasswordInputLabels } from './components/PasswordInput.js';
import type { TimePickerLabels } from './components/TimePicker.js';
import type { TagInputLabels } from './components/TagInput.js';
import type { AccountMenuLabels } from './components/AccountMenu.js';
import type { DisplayPreferencesLabels } from './components/DisplayPreferences.js';
import type { TaskTrayLabels } from './components/TaskTray.js';
import type { SlaTimerLabelOverrides } from './components/SlaTimer.js';
import type { ShortcutLabels } from './components/ShortcutSheet.js';
import type { ButtonResultLabels } from './components/ButtonFeedback.js';
import type { AuditLogLabels } from './components/AuditLog.js';
import type { DataWorkspaceLabels } from './components/DataWorkspace.js';
import type { AiLabels } from './ai-labels.js';
import type { UseTableLabels } from './hooks/useTable.js';
import { countLabel } from './plural.js';
import type { UixCountLabel } from './plural.js';

/**
 * Kit chrome strings by component (HAR-1358; TENSOR C20, MOTUS executive summary #3).
 * Each entry overrides that component's English defaults for every instance below the
 * provider; an explicit prop on one instance still wins.
 *
 * Client components read the provider. Server-renderable ones (`Pagination`, `BulkBar`)
 * cannot read context: pass `labels` from `useUixLabels()` in a client parent, or translate
 * on the server.
 */
export interface UixLabels {
  /**
   * Not words: the BCP 47 tag of the language these labels are in, e.g. `de`, `bs`, `sr-Latn`.
   * Every plural-aware label picks its form with `Intl.PluralRules` in this locale, and the date
   * fields format in it when `dateFormat.locale` is not set. Every label pack sets it. Name the
   * script for Serbian (`sr-Latn`, `sr-Cyrl`): a bare `sr` means Cyrillic to `Intl`.
   */
  locale?: string;
  /** The words a `Button` with `result` shows for a moment after its action (HAR-2581). */
  buttonResult?: Partial<ButtonResultLabels>;
  modal?: { close?: string };
  drawer?: { close?: string };
  /** The "Discard changes?" step of a `dirty` Drawer or Modal (HAR-2029). */
  discardPrompt?: Partial<DiscardPromptLabels>;
  /**
   * `ErrorSummary` and `useFormErrors`: the summary's heading, and the "Error:" before each field
   * error and the page title while a summary shows.
   */
  errorSummary?: Partial<ErrorSummaryLabels>;
  /** `useLeaveGuard`: the descriptions of the leave step; its title and buttons are `discardPrompt`'s. */
  leaveGuard?: Partial<LeaveGuardLabels>;
  /** `ConflictNotice`: the banner, its actions, and the comparison's version names and buttons. */
  conflictNotice?: Partial<ConflictNoticeLabels>;
  /** `SessionTimeout`: the warning, its countdown and actions, and the "signed out" notice. */
  sessionTimeout?: Partial<SessionTimeoutLabels>;
  peek?: { previous?: string; next?: string; close?: string };
  /** `ToolbarMore` (HAR-3090): the overflow menu's trigger word. */
  toolbar?: { more?: string };
  /** `Lightbox` (HAR-1826): previous / next / close, the counter, the zoom toggle. */
  lightbox?: Partial<LightboxLabels>;
  toast?: { dismiss?: string };
  toaster?: { region?: string };
  /** `TaskTray`: the landmark's name, its buttons, the pill's count words and the announcements. */
  taskTray?: Partial<TaskTrayLabels>;
  /** `SlaTimer`: the time words around `Intl`'s durations, the state words and the spoken text. `states` merges per key. */
  slaTimer?: SlaTimerLabelOverrides;
  /** The shortcut registry: `ShortcutSheet`, the "then" of a sequence in `KbdCombo`, and the names of the kit's own shortcuts. */
  shortcuts?: Partial<ShortcutLabels>;
  /**
   * `openNav`: the phone-tier button that opens the navigation drawer; `navigation`: that
   * drawer's title (HAR-1371).
   */
  appShell?: { skipToContent?: string; exitFocus?: string; openNav?: string; navigation?: string };
  /** `ThemeSwitcher` and `DisplayPreferences` (HAR-1372): the setting names and their choices. */
  displayPreferences?: Partial<DisplayPreferencesLabels>;
  /** `AccountMenu` (HAR-1371): the menu's name. */
  accountMenu?: Partial<AccountMenuLabels>;
  sidebar?: { expand?: string; collapse?: string };
  searchSuggest?: { clear?: string };
  /** `SearchBar` (HAR-2030): the clear button's name and the submit button's text. */
  searchBar?: Partial<SearchBarLabels>;
  /**
   * `resultsOne` / `resultsMany`: the polite result count; `{count}`. `resultsMany` also takes the
   * plural forms (`{ one, few, other }`) or a function of the count, and then `resultsOne` is not
   * read. Items mode (HAR-1378): `empty` when nothing matches, `recent` the heading of the recent items.
   */
  commandPalette?: { input?: string; resultsOne?: string; resultsMany?: UixCountLabel; empty?: string; recent?: string };
  /** `QrCode` (HAR-1251): the text shown when the value is too long for a QR code. */
  qrCode?: Partial<QrCodeLabels>;
  /** `CodeDisplay` (HAR-1253): the countdown, the expiry announcements, the copy button's words. */
  codeDisplay?: Partial<CodeDisplayLabels>;
  /** `ContactCard` (HAR-1379): the Email / Call actions and the erased and unavailable states. */
  contactCard?: Partial<ContactCardLabels>;
  /** `PrintSignature` (HAR-986): the captions of the signature line and the stamp box. */
  printLayout?: Partial<PrintLayoutLabels>;
  /** `QrScanner` (HAR-1254): the start / stop buttons, every state's title and text, the read announcement. */
  qrScanner?: Partial<QrScannerLabels>;
  entityPicker?: Partial<EntityPickerLabels>;
  tree?: Partial<TreeLabels>;
  /** `OrgChart` (HAR-1807): loading and error rows, the report count, the zoom toolbar. */
  orgChart?: Partial<OrgChartLabels>;
  inlineEdit?: Partial<InlineEditLabels>;
  /** `SortableList` (HAR-1375): the grip, Move up / Move down, the move announcement. */
  sortableList?: Partial<SortableListLabels>;
  /** `KanbanCard` (WCAG 2.5.7): the Move menu's button and its moves. */
  kanban?: Partial<KanbanLabels>;
  /** `DashboardCanvas`: the handles, their step buttons (WCAG 2.5.7) and the announcements. */
  dashboardCanvas?: Partial<DashboardCanvasLabels>;
  /** `ViewMenu` column rows: the grip, the ⋯ menu's Move up / Move down / Hide / Show, the move announcement. */
  viewMenu?: Partial<ViewMenuColumnLabels>;
  /** `useKeyboardGrab` (HAR-2590): picked up, dropped, cancelled; `{label}`. */
  keyboardGrab?: Partial<KeyboardGrabLabels>;
  /** `typeToConfirmMismatch` (HAR-1831): `{value}` is the text to type. */
  confirmDialog?: { typeToConfirm?: string; compensation?: string; typeToConfirmMismatch?: string };
  schedulingCalendar?: Partial<SchedulingCalendarLabels>;
  dateRangePicker?: Partial<DateRangePickerLabels>;
  datePicker?: Partial<DatePickerLabels>;
  dateTimePicker?: Partial<DateTimePickerLabels>;
  /** `TimePicker` (HAR-1835), also the time part of `DateTimePicker`. */
  timePicker?: Partial<TimePickerLabels>;
  schedulingTimeline?: Partial<SchedulingTimelineLabels>;
  textDiff?: Partial<TextDiffLabels>;
  /** `DiffViewer` (HAR-1369): the version names, the resolution buttons, the summary. */
  diffViewer?: Partial<DiffViewerLabels>;
  /** `MatchReview` (HAR-1369): the decision table, bulk actions and the adopt mode. */
  matchReview?: Partial<MatchReviewLabels>;
  /** `AuditLog` (HAR-987): the filters, Details, Show older entries, and every state. */
  auditLog?: Partial<AuditLogLabels>;
  /**
   * The AI primitives: `AiLabel` and its panel, `SourceList`, `AiSuggestion`, `Field ai`,
   * `ProposalReview`, `AiOutputCard` and `AiActor`, and what the shared AI announcer says.
   */
  ai?: Partial<AiLabels>;
  /** `DataWorkspace` (HAR-1388): the toolbar, selection, footer and states. */
  dataWorkspace?: Partial<DataWorkspaceLabels>;
  filterEditor?: Partial<FilterEditorLabels>;
  /**
   * `summarizeFilter` as a filter chip shows it (DataWorkspace): the operators, ranges and the
   * "not {values}" of an excluding enum value (HAR-2631). A product's `filters.summary.labels` wins.
   */
  filterSummary?: Partial<FilterSummaryLabels>;
  select?: Partial<SelectLabels>;
  ruleBuilder?: Partial<RuleBuilderLabels>;
  fileUpload?: Partial<FileUploadLabels>;
  /** `FileRow` (file kit 2.57): German by default; `FILE_ROW_LABELS_EN` for English. */
  fileRow?: Partial<FileRowLabels>;
  /** `FileDrop` (file kit 2.57): German by default; `FILE_DROP_LABELS_EN` for English. */
  fileDrop?: Partial<FileDropLabels>;
  /** The kind names `FileRow` and `FileDrop` show: German by default; `FILE_KIND_LABELS_EN` for English. */
  fileKinds?: Partial<FileKindLabels>;
  attachment?: Partial<AttachmentLabels>;
  /** `TagInput` (HAR-1377): the chips' × names, the announcements and the refusals. */
  tagInput?: Partial<TagInputLabels>;
  /** `PasswordInput` (HAR-1376): the reveal toggle's name. */
  passwordInput?: Partial<PasswordInputLabels>;
  /** `remove`: the name of a removable chip's × button; `{label}` is the chip text. */
  chip?: { remove?: string };
  /** `dismiss`: the name of a dismissible alert's × button. */
  alert?: { dismiss?: string };
  /** Not words: the date format of every date field (HAR-2432). See {@link UixDateFormat}. */
  dateFormat?: UixDateFormat;
  /** Read by `useUixLabels()` callers; `Pagination` itself is server-safe and takes `labels`. */
  pagination?: Partial<PaginationLabels>;
  /** `useTable`'s `announcement`: the sort, result and selection words. */
  table?: Partial<UseTableLabels>;
  /** Read by `useUixLabels()` callers; `BulkBar` itself is server-safe and takes `label`. */
  bulkBar?: { region?: string };
  /**
   * The accessible name of every ? help button (`InfoTip`, and the `help` slot of `Field`,
   * `PageHeader`, `Card` and `SectionHead`) that has no `helpLabel` of its own (HAR-3100).
   * `about`: for a text title, `{title}` is replaced by it; default `"About: {title}"`.
   * `more`: for a title that is not text; default `"More information"`.
   */
  infoTip?: { about?: string; more?: string };
}

/**
 * One date format for every date field below the provider (HAR-2432): `DatePicker`,
 * `DateTimePicker`, `DateRangePicker` and `TimePicker` (its `locale`). Each field's own prop wins.
 */
export interface UixDateFormat {
  /** The locale of the field's text, month and weekday names, and the clock. */
  locale?: string;
  /** How a field writes a `YYYY-MM-DD` date, e.g. `(d) => d.split('-').reverse().join('.')`. */
  formatDate?: (date: string) => string;
  /** Read typed text into `YYYY-MM-DD`, or `null` when it is not a date. Pass it with `formatDate`. */
  parseDate?: (text: string) => string | null;
  /** The date field's placeholder, e.g. `TT.MM.JJJJ`. */
  placeholder?: string;
}

/**
 * A complete set of kit chrome words for one language: every namespace of `UixLabels`, every
 * key, and the `locale` they are written in. A language pack (`@tensor_1/react/locales/de`, …) is
 * one; a pack that misses a key fails the type check.
 */
export type UixLabelPack = {
  [K in Exclude<keyof UixLabels, 'locale' | 'dateFormat'>]-?: Required<NonNullable<UixLabels[K]>>;
} & { locale: string };

const UixLabelsContext = createContext<UixLabels>({});

export interface UixLabelsProviderProps {
  labels: UixLabels;
  children?: ReactNode;
}

/** Translates kit chrome once for a subtree. Nested providers merge per component. */
export function UixLabelsProvider({ labels, children }: UixLabelsProviderProps) {
  const parent = useContext(UixLabelsContext);
  const value = useMemo(() => {
    const merged: Record<string, unknown> = { ...parent };
    for (const [key, entry] of Object.entries(labels)) {
      const inherited = (parent as Record<string, unknown>)[key];
      // `locale` is a string: an inner provider replaces it, it is not spread
      const objects = typeof inherited === 'object' && typeof entry === 'object';
      merged[key] = inherited && entry && objects ? { ...(inherited as object), ...(entry as object) } : entry ?? inherited;
    }
    return merged as UixLabels;
  }, [parent, labels]);
  return <UixLabelsContext.Provider value={value}>{children}</UixLabelsContext.Provider>;
}

/** The chrome strings in effect here (empty outside a provider). */
export function useUixLabels(): UixLabels {
  return useContext(UixLabelsContext);
}

/**
 * The locale of the labels in effect here: the provider's `locale`, then `dateFormat.locale`;
 * `undefined` outside a provider (plural forms then follow English, the kit's own language).
 */
export function useUixLocale(): string | undefined {
  const labels = useContext(UixLabelsContext);
  return labels.locale ?? labels.dateFormat?.locale;
}

/**
 * `countLabel` with the provider's locale: the template of a count label for `count`, e.g.
 * `usePluralLabel()(labels.groupCount, 3)`. See {@link countLabel}.
 */
export function usePluralLabel(): (label: UixCountLabel, count: number, one?: string) => string {
  const locale = useUixLocale();
  return useMemo(() => (label: UixCountLabel, count: number, one?: string) => countLabel(label, count, locale, one), [locale]);
}
