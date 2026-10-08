"use client";

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { PaginationLabels } from './components/Pagination.js';
import type { SchedulingCalendarLabels } from './components/SchedulingCalendar.js';
import type { DateRangePickerLabels } from './components/DateRangePicker.js';
import type { SchedulingTimelineLabels } from './components/SchedulingTimeline.js';
import type { TextDiffLabels } from './components/TextDiff.js';
import type { FilterEditorLabels } from './components/FilterEditor.js';
import type { SelectLabels } from './components/Select.js';
import type { RuleBuilderLabels } from './components/RuleBuilder.js';
import type { FileUploadLabels } from './components/FileUpload.js';
import type { AttachmentLabels } from './attachment-labels.js';
import type { EntityPickerLabels } from './components/EntityPicker.js';
import type { TreeLabels } from './components/Tree.js';

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
  modal?: { close?: string };
  drawer?: { close?: string };
  peek?: { previous?: string; next?: string; close?: string };
  toast?: { dismiss?: string };
  toaster?: { region?: string };
  appShell?: { skipToContent?: string; exitFocus?: string };
  sidebar?: { expand?: string; collapse?: string };
  searchSuggest?: { clear?: string };
  /** `resultsOne` / `resultsMany`: the polite result count; `{count}`. */
  commandPalette?: { input?: string; resultsOne?: string; resultsMany?: string };
  entityPicker?: Partial<EntityPickerLabels>;
  tree?: Partial<TreeLabels>;
  confirmDialog?: { typeToConfirm?: string; compensation?: string };
  schedulingCalendar?: Partial<SchedulingCalendarLabels>;
  dateRangePicker?: Partial<DateRangePickerLabels>;
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
