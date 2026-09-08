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

// Overlay positioning — framework-agnostic flip/shift placement for anchored overlays
export { computePosition } from './overlay-position.js';
export type {
  Placement, Side, Align, Rect, Size, PositionOptions, PositionResult,
} from './overlay-position.js';

// Form primitives
export { Button, ButtonGroup } from './components/Button.js';
export type { ButtonProps, ButtonGroupProps } from './components/Button.js';

export { Input, InputGroup } from './components/Input.js';
export type { InputProps, InputGroupProps } from './components/Input.js';

export { Combobox } from './components/Combobox.js';
export type { ComboboxProps, ComboboxOption } from './components/Combobox.js';
export { filterComboboxOptions } from './combobox-model.js';

export { Textarea } from './components/Textarea.js';
export type { TextareaProps } from './components/Textarea.js';

export { Select } from './components/Select.js';
export type { SelectProps } from './components/Select.js';

export { Checkbox } from './components/Checkbox.js';
export type { CheckboxProps } from './components/Checkbox.js';

export { Radio, RadioGroup } from './components/Radio.js';
export type { RadioProps, RadioGroupProps } from './components/Radio.js';

export { Switch } from './components/Switch.js';
export type { SwitchProps } from './components/Switch.js';

export { Field } from './components/Field.js';
export type { FieldProps } from './components/Field.js';

// Overlays
export { Modal } from './components/Modal.js';
export type { ModalProps } from './components/Modal.js';

export { ConfirmDialog, PromptDialog } from './components/Dialogs.js';
export type { ConfirmDialogProps, PromptDialogProps } from './components/Dialogs.js';

export { Drawer } from './components/Drawer.js';
export type { DrawerProps } from './components/Drawer.js';

export { Peek } from './components/Peek.js';
export type { PeekProps } from './components/Peek.js';

// Layout
export { Card, CardLink } from './components/Card.js';
export type { CardProps, CardLinkProps } from './components/Card.js';

export { Breadcrumbs } from './components/Breadcrumbs.js';
export type { BreadcrumbsProps, BreadcrumbItem } from './components/Breadcrumbs.js';

export { PageHeader } from './components/PageHeader.js';
export type { PageHeaderProps } from './components/PageHeader.js';

export { DetailLayout } from './components/DetailLayout.js';
export type { DetailLayoutProps } from './components/DetailLayout.js';

export { DetailPage } from './components/DetailPage.js';
export type { DetailPageProps, DetailPageTab, DetailPageMetric } from './components/DetailPage.js';

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

export { Tabs, Tab } from './components/Tabs.js';
export type { TabsProps, TabProps } from './components/Tabs.js';

export { AppShell } from './components/AppShell.js';
export type { AppShellProps, ShellNav } from './components/AppShell.js';

export { Sidebar, SidebarSection, NavItem, NavGroup, SubNavItem } from './components/Sidebar.js';
export type { SidebarProps, SidebarSectionProps, NavItemProps, NavGroupProps, SubNavItemProps } from './components/Sidebar.js';

export { StarButton } from './components/StarButton.js';
export type { StarButtonProps } from './components/StarButton.js';

export { NavFavourites } from './components/NavFavourites.js';
export type { NavFavouritesProps, NavFavouriteItem, NavFavouritesLabels } from './components/NavFavourites.js';

// Feedback
export { Alert } from './components/Alert.js';
export type { AlertProps, AlertTone } from './components/Alert.js';

export { Spinner } from './components/Spinner.js';
export type { SpinnerProps } from './components/Spinner.js';

export { Toast, Toaster } from './components/Toast.js';
export type { ToastProps, ToasterProps, ToastTone } from './components/Toast.js';

// Data display
export {
  TableWrap, Table, Th, Td, Tr,
  BulkBar, RowActions, RowAction, ExpandToggle, CellStrong, CellSub, Mark, Highlighted,
} from './components/Table.js';
export type {
  TableWrapProps, TableProps, ThProps, TdProps, TrProps, TableDensity, SortDirection,
  BulkBarProps, RowActionsProps, RowActionProps, ExpandToggleProps, MarkProps, HighlightedProps,
} from './components/Table.js';

// Table engine — framework-agnostic sort / filter / search / view-state / virtualization / selection
export * from './table-engine.js';

export { Pagination } from './components/Pagination.js';
export type { PaginationProps } from './components/Pagination.js';

export { StatusPill } from './components/StatusPill.js';
export type { StatusPillProps, PillTone, PillTreatment } from './components/StatusPill.js';

export { Progress } from './components/Progress.js';
export type { ProgressProps } from './components/Progress.js';

export { Meter } from './components/Meter.js';
export type { MeterProps, MeterTone } from './components/Meter.js';

export { Stat } from './components/Stat.js';
export type { StatProps, StatTrend } from './components/Stat.js';

export { Tooltip } from './components/Tooltip.js';
export type { TooltipProps } from './components/Tooltip.js';

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

export { Avatar, AvatarGroup, UserChip } from './components/Avatar.js';
export type { AvatarProps, AvatarGroupProps, UserChipProps } from './components/Avatar.js';

export { Comments, Comment } from './components/Comments.js';
export type { CommentsProps, CommentProps } from './components/Comments.js';

export { Composer, ComposerBar } from './components/Composer.js';
export type { ComposerProps, ComposerBarProps } from './components/Composer.js';

export { Segmented, SegmentedOption } from './components/Segmented.js';
export type { SegmentedProps, SegmentedOptionProps } from './components/Segmented.js';

export { ViewMenu, FilterPopover, SavedViewMenu } from './components/TableControls.js';
export type {
  ViewMenuProps, ViewMenuColumn, FilterPopoverProps, FilterOption, SavedViewMenuProps, SavedViewItem,
} from './components/TableControls.js';

export { Timeline, TimelineItem } from './components/Timeline.js';
export type { TimelineProps, TimelineItemProps } from './components/Timeline.js';

export { Prose, Note } from './components/Prose.js';
export type { ProseProps, NoteProps, NoteTone } from './components/Prose.js';

export { Popover } from './components/Popover.js';
export type { PopoverProps } from './components/Popover.js';

export { CommandPalette, CommandGroup, CommandItem } from './components/CommandPalette.js';
export type {
  CommandPaletteProps,
  CommandGroupProps,
  CommandItemProps,
} from './components/CommandPalette.js';

// ITSM capability
export { Inbox, InboxList, InboxItem, InboxDetail } from './components/Inbox.js';
export type { InboxProps, InboxListProps, InboxItemProps, InboxDetailProps } from './components/Inbox.js';

export { Kanban, KanbanColumn, KanbanCard } from './components/Kanban.js';
export type { KanbanProps, KanbanColumnProps, KanbanCardProps } from './components/Kanban.js';

export { Tree } from './components/Tree.js';
export type { TreeProps, TreeNodeData, TreeNodeProps } from './components/Tree.js';

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

export { RuleBuilder } from './components/RuleBuilder.js';
export type {
  RuleBuilderProps, RuleValueEditorProps, RuleFieldDefinition,
  RuleOperatorDefinition, RuleActionDefinition,
} from './components/RuleBuilder.js';
export {
  appendRuleNode, findRuleNodeDepth, isRuleGroup, mapRuleGroup, moveRuleNode,
  removeRuleNode, ruleDepth, summarizeRule, validateRuleDefinition,
} from './rule-builder-model.js';
export type { RuleCondition, RuleGroup, RuleAction, RuleDefinition, RuleValidationIssue } from './rule-builder-model.js';

export { BuilderCanvas } from './components/BuilderCanvas.js';
export type { BuilderCanvasProps, BuilderCanvasItem, BuilderPaletteItem } from './components/BuilderCanvas.js';

export { SchedulingCalendar } from './components/SchedulingCalendar.js';
export type {
  SchedulingCalendarProps, SchedulingCalendarView, SchedulingCalendarEntry,
  SchedulingCalendarOverlay, SchedulingEntryState, SchedulingOverlayKind,
} from './components/SchedulingCalendar.js';

export { DateRangePicker } from './components/DateRangePicker.js';
export type { DateRangePickerProps } from './components/DateRangePicker.js';
export {
  addCalendarDays, addCalendarMonths, buildMonthGrid, enumerateDateSpan,
  isDateInRange, isDateUnavailable, selectRangeDate, startOfMonth,
  toDateKey, zonedDateKey, zonedDateSpan,
} from './calendar-model.js';
export type { CalendarDay, DateRangeValue, ZonedDateSpan } from './calendar-model.js';

export { RelationshipGraph } from './components/RelationshipGraph.js';
export type { RelationshipGraphProps, RelationshipGraphLegendItem } from './components/RelationshipGraph.js';
export { boundRelationshipGraph, layoutRelationshipGraph, relationshipNeighbors, traverseRelationshipNode } from './relationship-graph-model.js';
export type { RelationshipGraphNode, RelationshipGraphEdge, PositionedRelationshipNode, BoundedRelationshipGraph } from './relationship-graph-model.js';

export { MatchReview } from './components/MatchReview.js';
export type { MatchReviewProps, MatchReviewField, MatchReviewCandidate, MatchReviewAction, MatchBulkResult } from './components/MatchReview.js';

export { MetricInput } from './components/MetricInput.js';
export type { MetricInputProps } from './components/MetricInput.js';
export { clampMetricValue, parseMetricValue, stepMetricValue } from './metric-model.js';

export { LicensePositionBar } from './components/LicensePositionBar.js';
export type { LicensePositionBarProps } from './components/LicensePositionBar.js';

export { BrandProfiles, BrandProfileEditor, applyBrandProfile, restoreBrandProfile } from './components/BrandProfiles.js';
export type { BrandProfile, BrandProfileTypography, BrandProfileLogo, BrandProfileEditorProps, AppliedBrandProfileSnapshot } from './components/BrandProfiles.js';

export { DiffViewer } from './components/DiffViewer.js';
export type { DiffViewerProps } from './components/DiffViewer.js';
export { buildThreeWayDiff, summarizeDiff } from './diff-model.js';
export type { DiffEntry, DiffKind, DiffResolution, DiffSummary } from './diff-model.js';

export { ColorPicker } from './components/ColorPicker.js';
export type { ColorPickerProps } from './components/ColorPicker.js';
export { contrastRatio, hexToRgb, hsvToHex, hsvToRgb, meetsContrast, normalizeHex, rgbToHex, rgbToHsv } from './color-model.js';
export type { RgbColor, HsvColor } from './color-model.js';
