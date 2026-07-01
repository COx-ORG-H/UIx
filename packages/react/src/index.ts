// Utilities
export { cx } from './cx.js';

// Hooks
export { useDialog } from './hooks/useDialog.js';
export { useTable } from './hooks/useTable.js';
export type { UseTableOptions, UseTableResult } from './hooks/useTable.js';

// Form primitives
export { Button, ButtonGroup } from './components/Button.js';
export type { ButtonProps, ButtonGroupProps } from './components/Button.js';

export { Input, InputGroup } from './components/Input.js';
export type { InputProps, InputGroupProps } from './components/Input.js';

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

export { Drawer } from './components/Drawer.js';
export type { DrawerProps } from './components/Drawer.js';

export { Peek } from './components/Peek.js';
export type { PeekProps } from './components/Peek.js';

// Layout
export { Card } from './components/Card.js';
export type { CardProps } from './components/Card.js';

export { PageHeader } from './components/PageHeader.js';
export type { PageHeaderProps } from './components/PageHeader.js';

export { DetailLayout } from './components/DetailLayout.js';
export type { DetailLayoutProps } from './components/DetailLayout.js';

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
export { EmptyState, ErrorState, Skeleton, LoadingState } from './components/States.js';
export type {
  EmptyStateProps,
  ErrorStateProps,
  SkeletonProps,
  LoadingStateProps,
} from './components/States.js';

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
