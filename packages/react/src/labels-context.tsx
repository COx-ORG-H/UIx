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
import type { SelectLabels } from './components/Select.js';
import type { RuleBuilderLabels } from './components/RuleBuilder.js';
import type { FileUploadLabels } from './components/FileUpload.js';
import type { AttachmentLabels } from './attachment-labels.js';
import type { EntityPickerLabels } from './components/EntityPicker.js';
import type { TreeLabels } from './components/Tree.js';
import type { OrgChartLabels } from './components/OrgChart.js';
import type { InlineEditLabels } from './components/InlineEdit.js';
import type { DiscardPromptLabels } from './components/DiscardPrompt.js';
import type { SearchBarLabels } from './components/SearchBar.js';
import type { AccountMenuLabels } from './components/AccountMenu.js';
import type { DisplayPreferencesLabels } from './components/DisplayPreferences.js';
import type { ButtonResultLabels } from './components/ButtonFeedback.js';

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
  /** The words a `Button` with `result` shows for a moment after its action (HAR-2581). */
  buttonResult?: Partial<ButtonResultLabels>;
  modal?: { close?: string };
  drawer?: { close?: string };
  /** The "Discard changes?" step of a `dirty` Drawer or Modal (HAR-2029). */
  discardPrompt?: Partial<DiscardPromptLabels>;
  peek?: { previous?: string; next?: string; close?: string };
  toast?: { dismiss?: string };
  toaster?: { region?: string };
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
  /** `resultsOne` / `resultsMany`: the polite result count; `{count}`. */
  commandPalette?: { input?: string; resultsOne?: string; resultsMany?: string };
  entityPicker?: Partial<EntityPickerLabels>;
  tree?: Partial<TreeLabels>;
  /** `OrgChart` (HAR-1807): loading and error rows, the report count, the zoom toolbar. */
  orgChart?: Partial<OrgChartLabels>;
  inlineEdit?: Partial<InlineEditLabels>;
  /** `typeToConfirmMismatch` (HAR-1831): `{value}` is the text to type. */
  confirmDialog?: { typeToConfirm?: string; compensation?: string; typeToConfirmMismatch?: string };
  schedulingCalendar?: Partial<SchedulingCalendarLabels>;
  dateRangePicker?: Partial<DateRangePickerLabels>;
  datePicker?: Partial<DatePickerLabels>;
  dateTimePicker?: Partial<DateTimePickerLabels>;
  schedulingTimeline?: Partial<SchedulingTimelineLabels>;
  textDiff?: Partial<TextDiffLabels>;
  filterEditor?: Partial<FilterEditorLabels>;
  select?: Partial<SelectLabels>;
  ruleBuilder?: Partial<RuleBuilderLabels>;
  fileUpload?: Partial<FileUploadLabels>;
  attachment?: Partial<AttachmentLabels>;
  /** `remove`: the name of a removable chip's × button; `{label}` is the chip text. */
  chip?: { remove?: string };
  /** `dismiss`: the name of a dismissible alert's × button. */
  alert?: { dismiss?: string };
  /** Read by `useUixLabels()` callers; `Pagination` itself is server-safe and takes `labels`. */
  pagination?: Partial<PaginationLabels>;
  /** Read by `useUixLabels()` callers; `BulkBar` itself is server-safe and takes `label`. */
  bulkBar?: { region?: string };
}

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
      merged[key] = inherited && entry ? { ...(inherited as object), ...(entry as object) } : entry ?? inherited;
    }
    return merged as UixLabels;
  }, [parent, labels]);
  return <UixLabelsContext.Provider value={value}>{children}</UixLabelsContext.Provider>;
}

/** The chrome strings in effect here (empty outside a provider). */
export function useUixLabels(): UixLabels {
  return useContext(UixLabelsContext);
}
