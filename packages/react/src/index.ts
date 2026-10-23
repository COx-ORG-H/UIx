// Utilities
export { cx } from './cx.js';

// Hooks
export { useDialog } from './hooks/useDialog.js';
export { useTable } from './hooks/useTable.js';
export type { UseTableOptions, UseTableResult } from './hooks/useTable.js';
export { useVirtualRows } from './hooks/useVirtualRows.js';
export type { UseVirtualRowsOptions, UseVirtualRowsResult } from './hooks/useVirtualRows.js';
export { useAnchoredPosition } from './hooks/useAnchoredPosition.js';
export type { UseAnchoredPositionOptions } from './hooks/useAnchoredPosition.js';
export { useReducedMotion, prefersReducedMotion } from './hooks/useReducedMotion.js';
// Display preferences: theme, contrast, text size, motion, density (HAR-1372)
export { DisplayPreferences, ThemeSwitcher, useDisplayPreferences, DEFAULT_DISPLAY_PREFERENCES_LABELS } from './components/DisplayPreferences.js';
export type {
  DisplayPreferencesProps, DisplayPreferencesLabels, ThemeSwitcherProps, UseDisplayPreferencesOptions, UseDisplayPreferencesResult,
} from './components/DisplayPreferences.js';
export {
  DEFAULT_DISPLAY_PREFERENCES, DISPLAY_PREFERENCES_STORAGE_KEY, DISPLAY_PREFERENCE_OPTIONS, applyDisplayAttributes, displayPreferencesScript,
  parseDisplayPreferences, readSystemDisplayPreferences, resolveDisplayAttributes,
} from './display-preferences-model.js';
export type {
  ContrastPreference, DensityPreference, DisplayAttributes, DisplayPreferenceValues, MotionPreference, SystemDisplayPreferences,
  TextScalePreference, ThemePreference,
} from './display-preferences-model.js';
export { useDelayedPending } from './hooks/useDelayedPending.js';
export type { DelayedPendingOptions } from './hooks/useDelayedPending.js';
export { PENDING_DELAY_MS, PENDING_MIN_VISIBLE_MS, RESULT_HOLD_MS } from './motion-timing.js';
export { useChangeHighlight, flashChanged } from './hooks/useChangeHighlight.js';
export type { ChangeHighlightOptions } from './hooks/useChangeHighlight.js';
export { useOptimisticValue } from './hooks/useOptimisticValue.js';
export type { OptimisticRollback, UseOptimisticValueOptions, UseOptimisticValueResult } from './hooks/useOptimisticValue.js';
export { announcePolite } from './announce.js';
export { useKeyboardGrab, settleDrop, DEFAULT_KEYBOARD_GRAB_LABELS } from './hooks/useKeyboardGrab.js';
export type { GrabDirection, KeyboardGrabLabels, UseKeyboardGrabOptions, UseKeyboardGrabResult } from './hooks/useKeyboardGrab.js';

// Overlay positioning — framework-agnostic flip/shift placement for anchored overlays
export { computePosition } from './overlay-position.js';
export type {
  Placement, Side, Align, Rect, Size, PositionOptions, PositionResult,
} from './overlay-position.js';

// Form primitives
export { Button, ButtonGroup, ButtonLink } from './components/Button.js';
export type { ButtonProps, ButtonGroupProps, ButtonLinkProps, ButtonSize, ButtonVariant } from './components/Button.js';

// Kit chrome strings for a subtree (HAR-1358)
export { UixLabelsProvider, useUixLabels } from './labels-context.js';
export type { UixDateFormat, UixLabels, UixLabelsProviderProps } from './labels-context.js';

// Link adapter — one renderLink callback for every component that can render a link (HAR-1348)
export { renderPlainLink } from './link.js';
export type { UixLinkProps, UixRenderLink } from './link.js';

export { Input, InputGroup } from './components/Input.js';
export type { InputProps, InputGroupProps } from './components/Input.js';
export { PasswordInput, DEFAULT_PASSWORD_INPUT_LABELS } from './components/PasswordInput.js';
export type { PasswordInputProps, PasswordInputLabels } from './components/PasswordInput.js';
export { OtpInput } from './components/OtpInput.js';
export type { OtpInputProps } from './components/OtpInput.js';
export { TagInput, DEFAULT_TAG_INPUT_LABELS } from './components/TagInput.js';
export type { TagInputProps, TagInputLabels } from './components/TagInput.js';

export { Combobox } from './components/Combobox.js';
export type { ComboboxProps, ComboboxOption, ComboboxGroup } from './components/Combobox.js';
export { filterComboboxItems, filterComboboxOptions } from './combobox-model.js';

export { SearchSuggest } from './components/SearchSuggest.js';
// One search field look and behaviour over .uix-searchbar (HAR-2030)
export { SearchBar } from './components/SearchBar.js';
export type { SearchBarProps, SearchBarLabels } from './components/SearchBar.js';
export { EntityPicker, DEFAULT_ENTITY_PICKER_LABELS } from './components/EntityPicker.js';
export type { EntityPickerProps, EntityPickerLabels, EntityPickerSearchError, EntityPickerSearchResult } from './components/EntityPicker.js';
export type { SearchSuggestProps, SearchSuggestOption, SearchSuggestAction } from './components/SearchSuggest.js';
export { searchSegments, foldForSearch } from './search-suggest-model.js';
export type { SearchSegment, FoldedText } from './search-suggest-model.js';

export { Textarea } from './components/Textarea.js';
export type { TextareaProps } from './components/Textarea.js';

// A list the person reorders, with the reorder model shared by ViewMenu / SavedViewMenu / NavFavourites (HAR-1375)
export { SortableList, DEFAULT_SORTABLE_LIST_LABELS } from './components/SortableList.js';
export type { SortableListProps, SortableListLabels, SortableListItemContext } from './components/SortableList.js';
export { placeId } from './reorder.js';
export { InlineEdit, DEFAULT_INLINE_EDIT_LABELS } from './components/InlineEdit.js';
export type { InlineEditProps, InlineEditLabels, InlineEditEditorProps, InlineEditErrorContext, InlineEditState } from './components/InlineEdit.js';

export { Select } from './components/Select.js';
export type { SelectProps, SelectLabels, SelectOption, SelectGroup } from './components/Select.js';

export { Checkbox, CheckboxGroup } from './components/Checkbox.js';
export type { CheckboxProps, CheckboxGroupProps } from './components/Checkbox.js';

export { Radio, RadioCard, RadioGroup } from './components/Radio.js';
export type { RadioProps, RadioCardProps, RadioGroupProps } from './components/Radio.js';

export { Switch } from './components/Switch.js';
export type { SwitchProps } from './components/Switch.js';

export { Field } from './components/Field.js';
export type { FieldProps } from './components/Field.js';

// Overlays
export { Modal } from './components/Modal.js';
export type { ModalProps } from './components/Modal.js';

export { ConfirmDialog, Popconfirm, PromptDialog } from './components/Dialogs.js';
export type { ConfirmButtonProps, ConfirmDialogProps, PopconfirmProps, PromptDialogProps } from './components/Dialogs.js';

export { Drawer } from './components/Drawer.js';
export type { DrawerProps } from './components/Drawer.js';
// The discard step of a dirty Drawer or Modal, and the Cancel that goes through it (HAR-2029)
export { DialogClose } from './components/DiscardPrompt.js';
export type { DialogCloseEvent, DialogCloseProps, DiscardPromptLabels } from './components/DiscardPrompt.js';

export { Peek } from './components/Peek.js';

export { Lightbox, DEFAULT_LIGHTBOX_LABELS } from './components/Lightbox.js';
export type { LightboxProps, LightboxItem, LightboxLabels, LightboxOverlayContext } from './components/Lightbox.js';
export type { PeekProps } from './components/Peek.js';

// Layout
export { Card, CardLink, Inset } from './components/Card.js';
export type { CardProps, CardLinkProps, InsetProps } from './components/Card.js';

export { DashboardGrid, DashboardGridItem, dashboardGridClassName, dashboardGridItemClassName } from './components/DashboardGrid.js';
export type {
  DashboardGridProps, DashboardGridItemProps, DashboardGridColumns, DashboardGridColumnCount,
  DashboardGridBreakpoint, DashboardGridSpan, DashboardGridGap,
} from './components/DashboardGrid.js';
// TENSOR HAR-1823 — DashboardCanvas: a free 12-column dashboard layout with drag, resize and a keyboard path
export { DashboardCanvas, DEFAULT_DASHBOARD_CANVAS_LABELS } from './components/DashboardCanvas.js';
export type {
  DashboardCanvasProps, DashboardCanvasLabels, DashboardCanvasGap, DashboardCanvasChange,
} from './components/DashboardCanvas.js';
export {
  DASHBOARD_CANVAS_COLUMNS, canvasItemLimits, clampCanvasItem, canvasItemsOverlap, canvasReadingOrder,
  canvasRowCount, normalizeCanvas, placeCanvasItem, canvasMoveTarget, canvasResizeTarget,
  moveCanvasItem, resizeCanvasItem, compactCanvas,
} from './dashboard-canvas-model.js';
export type {
  DashboardCanvasItem, DashboardCanvasDirection, DashboardCanvasResize, DashboardCanvasPlacement,
} from './dashboard-canvas-model.js';

export { Breadcrumbs } from './components/Breadcrumbs.js';
export type { BreadcrumbsProps, BreadcrumbItem } from './components/Breadcrumbs.js';

export { PageHeader } from './components/PageHeader.js';
export type { PageHeaderProps } from './components/PageHeader.js';

export { DetailLayout } from './components/DetailLayout.js';
export type { DetailLayoutProps } from './components/DetailLayout.js';

export { DetailPage } from './components/DetailPage.js';
export type { DetailPageLinkProps, DetailPageProps, DetailPageTab, DetailPageMetric } from './components/DetailPage.js';

export { RelatedLinks } from './components/RelatedLinks.js';
export type { RelatedLinksProps, RelatedLinkItem } from './components/RelatedLinks.js';

export { ToggleRow } from './components/ToggleRow.js';
export type { ToggleRowProps } from './components/ToggleRow.js';

export { CollapsibleSection } from './components/CollapsibleSection.js';
export type { CollapsibleSectionProps } from './components/CollapsibleSection.js';

export { List, ListItem } from './components/List.js';
export type { ListProps, ListItemProps } from './components/List.js';

export { DescriptionList, DescriptionItem } from './components/DescriptionList.js';
export type { DescriptionListProps, DescriptionListItem, DescriptionItemProps } from './components/DescriptionList.js';

export { Tabs, Tab, TabPanel } from './components/Tabs.js';
export type { TabsProps, TabProps, TabPanelProps } from './components/Tabs.js';

export { AppShell } from './components/AppShell.js';
export type { AppShellProps, ShellNav } from './components/AppShell.js';

export { Sidebar, SidebarSection, NavItem, NavGroup, SubNavItem } from './components/Sidebar.js';
export type { SidebarProps, SidebarSearch, SidebarSectionProps, NavItemProps, NavGroupProps, SubNavItemProps } from './components/Sidebar.js';
// The signed-in person's menu for the sidebar foot (HAR-1371)
export { AccountMenu, DEFAULT_ACCOUNT_MENU_LABELS, accountInitials } from './components/AccountMenu.js';
export type { AccountMenuProps, AccountMenuUser, AccountMenuLabels } from './components/AccountMenu.js';

export { StarButton } from './components/StarButton.js';
export type { StarButtonProps } from './components/StarButton.js';
export { CopyButton } from './components/CopyButton.js';
export type { CopyButtonProps } from './components/CopyButton.js';
// A scannable, print-safe QR code from the kit's own encoder (HAR-1251)
export { QrCode, DEFAULT_QR_CODE_LABELS } from './components/QrCode.js';
export type { QrCodeProps, QrCodeLabels } from './components/QrCode.js';
export { encodeQr, qrPath, qrDataCapacity, qrVersionFor, QrCapacityError } from './qr-model.js';
export type { QrMatrix, QrErrorCorrection, QrEncodeOptions } from './qr-model.js';
// A camera viewfinder that reads codes with the product's own decoder (HAR-1254)
export { QrScanner, DEFAULT_QR_SCANNER_LABELS } from './components/QrScanner.js';
export type { QrScannerProps, QrScannerLabels, QrScannerStatus, QrScannerFrame, QrScannerDecoder } from './components/QrScanner.js';
// A one-time code shown large, spelled out, with an optional expiry countdown (HAR-1253)
export { CodeDisplay, DEFAULT_CODE_DISPLAY_LABELS, codeGroups, formatCountdown } from './components/CodeDisplay.js';
export type { CodeDisplayProps, CodeDisplayLabels } from './components/CodeDisplay.js';
// A person at a glance with mailto/tel actions and an erased state (HAR-1379)
export { ContactCard, DEFAULT_CONTACT_CARD_LABELS, telHref } from './components/ContactCard.js';
export type { ContactCardProps, ContactCardLabels, ContactCardState } from './components/ContactCard.js';
// A print document frame: A4 / A5 pages, repeating header and footer, signature (HAR-986)
export { PrintLayout, PrintSignature, PrintPageBreak, DEFAULT_PRINT_LAYOUT_LABELS } from './components/PrintLayout.js';
export type { PrintLayoutProps, PrintSignatureProps, PrintLayoutLabels, PrintPageSize } from './components/PrintLayout.js';

export { NavFavourites } from './components/NavFavourites.js';
export type { NavFavouritesProps, NavFavouriteItem, NavFavouritesLabels } from './components/NavFavourites.js';

// Files (HAR-984/985): upload with validation and progress, and file rows
export { FileUpload, DEFAULT_FILE_UPLOAD_LABELS } from './components/FileUpload.js';
export type { FileUploadProps, FileUploadItem, FileUploadLabels, FileUploadStatus } from './components/FileUpload.js';
export { Attachment, AttachmentList, DEFAULT_ATTACHMENT_LABELS } from './components/Attachment.js';
export type { AttachmentProps, AttachmentListProps, AttachmentLabels } from './components/Attachment.js';
export { fileKind, fileMatchesAccept, formatFileSize, partitionFiles } from './file-model.js';
export type { FileRejection, FileRejectionReason, FileSizeOptions, FileSizeFormatter } from './file-model.js';

// Feedback
export { Alert } from './components/Alert.js';
export type { AlertProps, AlertTone } from './components/Alert.js';

export { Spinner } from './components/Spinner.js';
export type { SpinnerProps } from './components/Spinner.js';

export { Heartbeat, LiveIndicator } from './components/Heartbeat.js';
export type { HeartbeatProps, HeartbeatState, LiveIndicatorProps } from './components/Heartbeat.js';

export { Toast, Toaster } from './components/Toast.js';
export type { ToastProps, ToasterProps, ToastTone } from './components/Toast.js';
// Imperative toast queue (HAR-1363): toast.success(…), toast.promise(…), toast.undoable(…)
export { toast, createToastStore, createToastApi, TOAST_LEAVE_MS } from './toast-store.js';
export type {
  ToastApi, ToastStore, ToastRecord, ToastKind, ToastOptions, ToastAction, ToastDismissReason,
  ToastPromiseMessages, UndoableToastOptions,
} from './toast-store.js';

// Data display
export {
  TableWrap, Table, Th, Td, Tr,
  BulkBar, RowActions, RowAction, ExpandToggle, CellStrong, CellSub, Mark, Highlighted,
} from './components/Table.js';
export type {
  TableWrapProps, TableProps, ThProps, TdProps, TrProps, TableDensity, SortDirection,
  BulkBarProps, RowActionsProps, RowActionProps, ExpandToggleProps, MarkProps, HighlightedProps, CellSubProps,
} from './components/Table.js';

// Table engine — framework-agnostic sort / filter / search / view-state / virtualization / selection
export * from './table-engine.js';

export { DEFAULT_PAGINATION_LABELS, Pagination } from './components/Pagination.js';
export type { PaginationLabels, PaginationProps } from './components/Pagination.js';

export { StatusPill } from './components/StatusPill.js';
export type { StatusPillProps, PillTone, PillTreatment, PillSize } from './components/StatusPill.js';

export { Progress } from './components/Progress.js';
export type { ProgressProps } from './components/Progress.js';

export { Meter } from './components/Meter.js';
export type { MeterProps, MeterTone } from './components/Meter.js';

export { Stat, StatRow } from './components/Stat.js';
export type { StatProps, StatTrend, StatRowProps } from './components/Stat.js';

export { Bullet, DEFAULT_INSIGHT_CARD_LABELS, InsightCard } from './components/InsightCard.js';
export type {
  BulletProps,
  InsightCardLabels,
  InsightCardProps,
  InsightComparison,
  InsightCoverage,
  InsightKpi,
  InsightStatus,
  InsightStatusTone,
  InsightTarget,
} from './components/InsightCard.js';

// Chart statistics (HAR-1554): pure, so servers can compute what the chart draws.
export { linearFit, normalQuantile, predictionBand, quantiles, studentTQuantile } from './chart-stats.js';
export type { ChartStatPoint, LinearFit, PredictionBandPoint } from './chart-stats.js';

export { Chip, ChipGroup } from './components/Chip.js';
export type { ChipProps, ChipGroupProps } from './components/Chip.js';

export { Kbd, KbdCombo, ariaKeyShortcuts } from './components/Kbd.js';
export type { KbdProps, KbdComboProps, KbdPlatform, KeyShortcut } from './components/Kbd.js';

export { Steps, Step, DEFAULT_STEP_STATE_LABELS } from './components/Steps.js';
export type { StepsProps, StepProps, StepState, StepStateLabels } from './components/Steps.js';

export { Tooltip } from './components/Tooltip.js';
export type { TooltipProps } from './components/Tooltip.js';
export { InfoTip } from './components/InfoTip.js';
export type { InfoTipProps } from './components/InfoTip.js';

// States / feedback
export { EmptyState, ErrorState, ForbiddenState, NotFoundState, FilteredEmptyState, Skeleton, LoadingState } from './components/States.js';
export type {
  EmptyStateProps,
  ErrorStateProps,
  AccessStateProps,
  StateVariant,
  SkeletonProps,
  LoadingStateProps,
} from './components/States.js';

export { RelativeTime } from './components/RelativeTime.js';
export type { RelativeTimeProps, RelativeTimeFormatContext } from './components/RelativeTime.js';
export { parseDateValue, relativeTimeValue } from './relative-time-model.js';
export type { RelativeTimeUnit, RelativeTimeValue } from './relative-time-model.js';

export { AsyncOperationStatus } from './components/AsyncOperationStatus.js';
export type { AsyncOperationStatusProps, AsyncOperationState } from './components/AsyncOperationStatus.js';

export { Label } from './components/Label.js';
export type { LabelProps } from './components/Label.js';

export { Avatar, AvatarGroup, PresenceDot, UserChip, DEFAULT_PRESENCE_LABELS } from './components/Avatar.js';
export type { AvatarProps, AvatarGroupProps, UserChipProps, AvatarPresence, PresenceDotProps } from './components/Avatar.js';

export { Comments, Comment } from './components/Comments.js';
export type { CommentsProps, CommentProps } from './components/Comments.js';
export { SaveStatus, DEFAULT_SAVE_STATUS_LABELS } from './components/SaveStatus.js';
export { BusyRegion } from './components/BusyRegion.js';
export { ChangeHighlight } from './components/ChangeHighlight.js';
export type { ChangeHighlightProps } from './components/ChangeHighlight.js';
export { Count } from './components/Count.js';
export type { CountProps } from './components/Count.js';
export type { BusyRegionProps } from './components/BusyRegion.js';
export { DEFAULT_BUTTON_RESULT_LABELS } from './components/ButtonFeedback.js';
export type { ButtonResult, ButtonResultLabels } from './components/ButtonFeedback.js';
export type { SaveStatusProps, SaveStatusLabels, SaveStatusState } from './components/SaveStatus.js';

export { Composer, ComposerBar } from './components/Composer.js';
export type { ComposerProps, ComposerBarProps } from './components/Composer.js';

export { Segmented, SegmentedOption, LocaleSwitcher } from './components/Segmented.js';
export type { SegmentedProps, SegmentedOptionProps, LocaleSwitcherProps, LocaleSwitcherLocale } from './components/Segmented.js';

export { ViewMenu, FilterPopover, SavedViewMenu } from './components/TableControls.js';
// The generic presentation half of a product's data table (HAR-1388, UIx ADR-0005)
export { DataWorkspace, DEFAULT_DATA_WORKSPACE_LABELS } from './components/DataWorkspace.js';
export type {
  DataWorkspaceProps, DataWorkspaceColumn, DataWorkspaceIdColumn, DataWorkspaceLabels, DataWorkspacePagination, DataWorkspaceSort,
} from './components/DataWorkspace.js';
// Typed column filters (HAR-1365): FilterEditor content + a pure model for values and chip summaries
export { FilterEditor, DEFAULT_FILTER_EDITOR_LABELS } from './components/FilterEditor.js';
export type { FilterEditorProps, FilterEditorLabels } from './components/FilterEditor.js';
export {
  DEFAULT_FILTER_SUMMARY_LABELS, NUMBER_FILTER_OPERATORS, TEXT_FILTER_OPERATORS, emptyFilterValue, isFilterEmpty, matchFilterPreset, summarizeFilter,
  // HAR-1832: date conditions, labels for restored reference ids
  DATE_FILTER_OPERATORS, dateFilterBounds, isUnresolvedChoice, resolveFilterLabels,
} from './filter-model.js';
export type {
  FilterChoice, FilterField, FilterPreset, FilterValueKind, FilterSummaryLabels, FilterValue, NumberFilterOperator, SummarizeFilterOptions, TextFilterOperator,
  DateFilterOperator,
} from './filter-model.js';
export type {
  ViewMenuProps, ViewMenuColumn, ViewMenuColumnLabels, FilterPopoverProps, FilterOption, SavedViewMenuProps, SavedViewItem, SavedViewSection,
} from './components/TableControls.js';

export { Timeline, TimelineItem } from './components/Timeline.js';
export type { TimelineProps, TimelineItemProps } from './components/Timeline.js';

export { Pipeline, PipelineStage } from './components/Pipeline.js';
export type { PipelineProps, PipelineStageProps, PipelineStageState } from './components/Pipeline.js';

export { Flow, FlowNode } from './components/Flow.js';
export type { FlowProps, FlowNodeProps, FlowNodeState, FlowVariant } from './components/Flow.js';

export { Prose, Note } from './components/Prose.js';
export type { ProseProps, NoteProps, NoteTone } from './components/Prose.js';

export { Popover } from './components/Popover.js';

export { Menu, MenuItem, MenuItemRadio, MenuItemCheckbox, MenuRadioGroup, MenuGroup, MenuSeparator } from './components/Menu.js';
export type {
  MenuProps, MenuItemProps, MenuItemAttributes, MenuItemRadioProps, MenuItemCheckboxProps, MenuRadioGroupProps, MenuGroupProps,
} from './components/Menu.js';
export type { PopoverProps } from './components/Popover.js';

export { CommandPalette, CommandGroup, CommandItem } from './components/CommandPalette.js';
export type {
  CommandPaletteProps,
  CommandGroupProps,
  CommandItemProps,
} from './components/CommandPalette.js';
// Items mode (HAR-1378): the palette filters, groups and runs commands itself
export { filterCommandItems, groupCommandItems } from './command-palette-model.js';
export type { CommandPaletteItem, CommandPaletteGroup } from './command-palette-model.js';

// ITSM capability
export { Inbox, InboxList, InboxItem, InboxDetail } from './components/Inbox.js';
export type { InboxProps, InboxListProps, InboxItemProps, InboxDetailProps } from './components/Inbox.js';

export { Kanban, KanbanColumn, KanbanCard, KanbanDropLine } from './components/Kanban.js';
export type { KanbanProps, KanbanColumnProps, KanbanCardProps, KanbanMoveDirection } from './components/Kanban.js';

export { Tree, DEFAULT_TREE_LABELS } from './components/Tree.js';
export type { TreeProps, TreeNodeData, TreeNodeProps, TreeLabels } from './components/Tree.js';

export { OrgChart, DEFAULT_ORG_CHART_LABELS, orgChartInitials, orgChartZoomStep } from './components/OrgChart.js';
export type { OrgChartProps, OrgChartNode, OrgChartLabels } from './components/OrgChart.js';

// Tree model — framework-agnostic flatten + keyboard-nav helpers (drive plain + virtualized Tree)
export { flattenTree, treeNav } from './tree-model.js';
export type { FlatNode, TreeLike, TreeNavAction } from './tree-model.js';

// Editorial-home kit (intranet landing patterns — INTRA-04)
export {
  PageIntro, SectionHead, NoticeQueue,
  FeaturedStage, FeaturedRundown, FeaturedRundownItem,
  NewsLead, ContentList, ContentListItem, ResourceGrid,
  StatLine, EventRow, StatusRow,
} from './components/EditorialHome.js';
export type {
  PageIntroProps, SectionHeadProps, NoticeQueueProps,
  FeaturedStageProps, FeaturedRundownProps, FeaturedRundownItemProps,
  NewsLeadProps, ContentListProps, ContentListItemProps, ResourceGridProps,
  StatLineProps, StatLineItem, EventRowProps, StatusRowProps,
} from './components/EditorialHome.js';

// Phase 46.9 — domain-neutral authoring, scheduling, review, branding, and diff capabilities
export type { JsonPrimitive, JsonValue } from './json-value.js';

export { DEFAULT_RULE_BUILDER_LABELS, RuleBuilder } from './components/RuleBuilder.js';
export type {
  RuleBuilderLabels, RuleBuilderProps, RuleValueEditorProps, RuleFieldDefinition,
  RuleOperatorDefinition, RuleActionDefinition,
} from './components/RuleBuilder.js';
export {
  appendRuleNode, findRuleNodeDepth, isRuleGroup, mapRuleGroup, moveRuleNode,
  removeRuleNode, ruleDepth, setRuleCombinator, summarizeRule, validateRuleDefinition,
  DEFAULT_RULE_VALIDATION_MESSAGES, DEFAULT_RULE_SUMMARY_WORDS,
} from './rule-builder-model.js';
export type {
  RuleCondition, RuleGroup, RuleAction, RuleDefinition, RuleValidationIssue,
  RuleCheck, RuleValidationOptions, RuleSummaryWords,
} from './rule-builder-model.js';

export { BuilderCanvas, DEFAULT_BUILDER_CANVAS_LABELS } from './components/BuilderCanvas.js';
export type { BuilderCanvasLabels, BuilderCanvasProps, BuilderCanvasItem, BuilderPaletteItem } from './components/BuilderCanvas.js';

export { DEFAULT_SCHEDULING_CALENDAR_LABELS, SchedulingCalendar } from './components/SchedulingCalendar.js';
export type { SchedulingCalendarLabels,
  SchedulingCalendarProps, SchedulingCalendarView, SchedulingCalendarEntry,
  SchedulingCalendarOverlay, SchedulingDatePart, SchedulingEntryState, SchedulingOverlayKind,
  SchedulingBand, SchedulingStatus, SchedulingMarker, SchedulingMarkerEmphasis, SchedulingOverlayPattern,
  SchedulingCalendarDay, SchedulingLegendItem, SchedulingAgendaGroup,
} from './components/SchedulingCalendar.js';
// The day view by resource: one column per practitioner, truthful free / booked / off (HAR-983)
export type { SchedulingSlotSelection } from './components/SchedulingResourceDay.js';
export { resourceDaySlots, layoutResourceColumn, resourceDayGaps } from './scheduling-resource-model.js';
export type { SchedulingResource, SchedulingResourceSpan, SchedulingAvailabilityKind, ResourceDaySlot, ResourceDaySlotOptions, ResourceDayItem } from './scheduling-resource-model.js';
export type { TimeGridEntryContext } from './components/SchedulingTimeGrid.js';
export {
  TOP_LANE_CROSS_MIDNIGHT_MINUTES, itemDaySpan, layoutDaySpans, layoutMonthSpans, layoutTimeGridDay, placesInTopLane, proposeMove, schedulingGridDays,
} from './scheduling-calendar-model.js';
export type {
  DaySpanLayout, LayoutMonthSpansOptions, MonthSpanGroup, MonthSpanInput, MonthSpanLayout, MoveProposal, PlacedDaySpan, PlacedMonthSpan,
  TimeGridDayLayout, TimeGridEntryInput, TimeGridPart, TimeGridSegment,
} from './scheduling-calendar-model.js';

export { DEFAULT_SCHEDULING_TIMELINE_LABELS, SchedulingTimeline } from './components/SchedulingTimeline.js';
export type {
  SchedulingTimelineLabels, SchedulingTimelineProps, SchedulingTimelineLane, SchedulingTimelineItem,
  SchedulingTimelineOverlay, SchedulingTimelineOverlayKind, SchedulingTimelineMarker, SchedulingTimelineGroup,
} from './components/SchedulingTimeline.js';
export {
  DAY, HOUR, defaultTimelineStep, layoutLane, pixelsToMs, placeSpan, shiftSpan, snapToStep, timelineTicks,
  timelineRepeatedHourOffset, timelineStepDelta, timelineSubTicks,
} from './scheduling-timeline-model.js';
export type { LayoutLaneOptions, PlacedSpan, TimelineRange, TimelineScale, TimelineSpan, TimelineSubTick, TimelineTick } from './scheduling-timeline-model.js';

export { DateRangePicker, DEFAULT_DATE_RANGE_PICKER_LABELS } from './components/DateRangePicker.js';
export type { DateRangePickerLabels, DateRangePickerProps } from './components/DateRangePicker.js';
export { DatePicker, DateTimePicker, DEFAULT_DATE_PICKER_LABELS, DEFAULT_DATE_TIME_PICKER_LABELS } from './components/DatePicker.js';
export type {
  DateInputProblem, DatePickerLabels, DatePickerProps, DateTimePickerLabels, DateTimePickerProps,
} from './components/DatePicker.js';
export {
  dateOrder, datePattern, formatDateKey, isValidDateKey, joinDateTime, parseDateInput, splitDateTime, timeZoneName,
} from './date-field-model.js';
export type { DatePart } from './date-field-model.js';
export { TimePicker, DEFAULT_TIME_PICKER_LABELS } from './components/TimePicker.js';
export type { TimeInputProblem, TimePickerLabels, TimePickerProps } from './components/TimePicker.js';
export {
  formatTimeKey, isOvernightRange, isTimeOutOfRange, isValidTimeKey, minutesToTime, parseTimeInput, stepTime, timePartEnds, timeSlots, timeToMinutes, uses12Hour,
} from './time-field-model.js';
export {
  addCalendarDays, addCalendarMonths, addZonedDays, buildMonthGrid, cachedDateTimeFormat, enumerateDateKeys, enumerateDateSpan,
  isDateInRange, isDateUnavailable, packLanes, rankOverflow, selectRangeDate, startOfMonth,
  toDateKey, zonedDateKey, zonedDateSpan, zonedDayBounds, zonedDaySpan, zonedHourSlots, zonedTimeOfDay,
} from './calendar-model.js';
export type {
  CalendarDay, CalendarWeekday, DateRangeValue, LaneCluster, LaneInterval, LanePlacement, PackedLanes, PackLanesOptions,
  ZonedDateSpan, ZonedDayBounds, ZonedDayShift, ZonedDaySpan, ZonedHourSlot,
} from './calendar-model.js';

export { RelationshipGraph, DEFAULT_RELATIONSHIP_GRAPH_LABELS } from './components/RelationshipGraph.js';
export type { RelationshipGraphProps, RelationshipGraphLegendItem, RelationshipGraphLabels } from './components/RelationshipGraph.js';
export { boundRelationshipGraph, layoutRelationshipGraph, relationshipNeighbors, traverseRelationshipNode, classifyLayeredEdges, clusterIdFor, layeredNeighbor, layoutLayeredGraph, wrapEdgeLabel, separateEdgeLabels, edgeLabelSize } from './relationship-graph-model.js';
export type { RelationshipGraphNode, RelationshipGraphEdge, PositionedRelationshipNode, BoundedRelationshipGraph, RelationshipGraphArrow, RelationshipGraphCluster, LayeredEdgeKind, LayeredLayoutOptions, LayeredItem, RoutedEdge, LayeredColumn, LayeredLayout, LayeredEdgeClassification, LayeredNavigationKey, RelationshipGraphTone, EdgeLabelBox, PlacedEdgeLabel } from './relationship-graph-model.js';

// Who opened or changed what, and when (HAR-987; MEDx S50, POSx PRT-01)
export { AuditLog, DEFAULT_AUDIT_LOG_LABELS } from './components/AuditLog.js';
export type { AuditLogProps, AuditLogEvent, AuditLogAction, AuditLogFilters, AuditLogLabels } from './components/AuditLog.js';
export { DEFAULT_MATCH_REVIEW_LABELS, MatchReview } from './components/MatchReview.js';
export type { MatchReviewLabels, MatchReviewProps, MatchReviewField, MatchReviewCandidate, MatchReviewAction, MatchBulkResult } from './components/MatchReview.js';

export { MetricInput } from './components/MetricInput.js';
export type { MetricInputProps } from './components/MetricInput.js';
export { clampMetricValue, parseMetricValue, stepMetricValue } from './metric-model.js';

export { LicensePositionBar } from './components/LicensePositionBar.js';
export type { LicensePositionBarProps } from './components/LicensePositionBar.js';

export { BrandProfiles, BrandProfileEditor, DEFAULT_BRAND_PROFILE_EDITOR_LABELS, applyBrandProfile, restoreBrandProfile } from './components/BrandProfiles.js';
export type { BrandProfileEditorLabels, BrandProfile, BrandProfileTypography, BrandProfileLogo, BrandProfileEditorProps, AppliedBrandProfileSnapshot } from './components/BrandProfiles.js';

export { DEFAULT_DIFF_VIEWER_LABELS, DiffViewer } from './components/DiffViewer.js';
export type { DiffViewerLabels, DiffViewerProps, DiffSide } from './components/DiffViewer.js';
export { buildThreeWayDiff, summarizeDiff } from './diff-model.js';
export type { DiffEntry, DiffKind, DiffResolution, DiffSummary } from './diff-model.js';
export { DEFAULT_TEXT_DIFF_LABELS, TextDiff } from './components/TextDiff.js';
export type { TextDiffLabels, TextDiffProps } from './components/TextDiff.js';
export { diffText, diffTokens, textDiffRows, tokenizeText } from './text-diff-model.js';
export type { TextDiffGranularity, TextDiffLine, TextDiffOp, TextDiffOptions, TextDiffResult, TextDiffRow, TextDiffSegment } from './text-diff-model.js';

export { ColorPicker, DEFAULT_COLOR_PICKER_LABELS } from './components/ColorPicker.js';
export type { ColorPickerLabels, ColorPickerProps } from './components/ColorPicker.js';
export { contrastRatio, hexToRgb, hsvToHex, hsvToRgb, meetsContrast, normalizeHex, rgbToHex, rgbToHsv } from './color-model.js';
export type { RgbColor, HsvColor } from './color-model.js';
