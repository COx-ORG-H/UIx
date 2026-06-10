"use client";
/* GENERATED smoke page: imports every @hx registry module so the SSR
 * prerender pass evaluates them, and Tailwind scans their classes. */
import * as Utils from "@/components/hx/utils";
import * as UsePlatform from "@/components/hx/use-platform";
import * as ListSurfaces from "@/components/hx/list-surfaces";
import * as DataTable from "@/components/hx/data-table";
import * as DataTableToolbar from "@/components/hx/data-table-toolbar";
import * as ColumnVisibilityMenu from "@/components/hx/column-visibility-menu";
import * as CommandPalette from "@/components/hx/command-palette";
import * as CheatSheet from "@/components/hx/cheat-sheet";
import * as DetailLayout from "@/components/hx/detail-layout";
import * as FilterPopover from "@/components/hx/filter-popover";
import * as ConfirmAction from "@/components/hx/confirm-action";
import * as AsyncOperationStatus from "@/components/hx/async-operation-status";
import * as Markdown from "@/components/hx/markdown";
import * as RelativeTime from "@/components/hx/relative-time";
import * as States from "@/components/hx/states";
import * as UserChip from "@/components/hx/user-chip";
import * as Form from "@/components/hx/form";

const modules: Record<string, object> = {
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
};

export default function AllModulesPage() {
  return (
    <main className="bg-hx-app text-hx-text min-h-screen p-8">
      <h1 className="text-2xl">@hx registry modules</h1>
      <ul className="mt-4 space-y-1">
        {Object.entries(modules).map(([name, mod]) => (
          <li key={name} className="text-hx-hushed text-sm">
            {name}: {Object.keys(mod).join(", ") || "(no exports)"}
          </li>
        ))}
      </ul>
    </main>
  );
}
