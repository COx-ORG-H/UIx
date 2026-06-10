"use client";
/* Shared module map for the /all smoke pages — the single source of truth for
 * "every @uix registry module". Lives in fixtures/shared/ and is copied into
 * each fixture's components/shared/ by scripts/copy-to-fixtures.mjs, so both
 * fixtures import the SAME list against their own @/ alias. Importing every
 * module here makes the SSR prerender pass evaluate each one, and puts every
 * file in the fixtures' Tailwind scan path.
 *
 * Add every new registry item here (the /all pages render whatever this map
 * contains). */
import * as AppShell from "@/components/uix/app-shell";
import * as AsyncOperationStatus from "@/components/uix/async-operation-status";
import * as CheatSheet from "@/components/uix/cheat-sheet";
import * as ColumnVisibilityMenu from "@/components/uix/column-visibility-menu";
import * as CommandPalette from "@/components/uix/command-palette";
import * as ConfirmAction from "@/components/uix/confirm-action";
import * as DataTable from "@/components/uix/data-table";
import * as DataTableToolbar from "@/components/uix/data-table-toolbar";
import * as DetailLayout from "@/components/uix/detail-layout";
import * as FilterPopover from "@/components/uix/filter-popover";
import * as Form from "@/components/uix/form";
import * as ListSurfaces from "@/components/uix/list-surfaces";
import * as Markdown from "@/components/uix/markdown";
import * as RelativeTime from "@/components/uix/relative-time";
import * as States from "@/components/uix/states";
import * as StatTile from "@/components/uix/stat-tile";
import * as StatusPill from "@/components/uix/status-pill";
import * as Toast from "@/components/uix/toast";
import * as UsePlatform from "@/components/uix/use-platform";
import * as UserChip from "@/components/uix/user-chip";
import * as Utils from "@/components/uix/utils";

export const modules: Record<string, object> = {
  utils: Utils,
  "use-platform": UsePlatform,
  "list-surfaces": ListSurfaces,
  "data-table": DataTable,
  "data-table-toolbar": DataTableToolbar,
  "column-visibility-menu": ColumnVisibilityMenu,
  "command-palette": CommandPalette,
  "cheat-sheet": CheatSheet,
  "detail-layout": DetailLayout,
  "filter-popover": FilterPopover,
  "confirm-action": ConfirmAction,
  "async-operation-status": AsyncOperationStatus,
  markdown: Markdown,
  "relative-time": RelativeTime,
  states: States,
  "user-chip": UserChip,
  form: Form,
  toast: Toast,
  "status-pill": StatusPill,
  "stat-tile": StatTile,
  "app-shell": AppShell,
};
