"use client";
/* GENERATED smoke page: imports every @uix registry module so the SSR
 * prerender pass evaluates them, and Tailwind scans their classes. */
import * as Utils from "@/components/uix/utils";
import * as UsePlatform from "@/components/uix/use-platform";
import * as ListSurfaces from "@/components/uix/list-surfaces";
import * as DataTable from "@/components/uix/data-table";
import * as DataTableToolbar from "@/components/uix/data-table-toolbar";
import * as ColumnVisibilityMenu from "@/components/uix/column-visibility-menu";
import * as CommandPalette from "@/components/uix/command-palette";
import * as CheatSheet from "@/components/uix/cheat-sheet";
import * as DetailLayout from "@/components/uix/detail-layout";
import * as FilterPopover from "@/components/uix/filter-popover";
import * as ConfirmAction from "@/components/uix/confirm-action";
import * as AsyncOperationStatus from "@/components/uix/async-operation-status";
import * as Markdown from "@/components/uix/markdown";
import * as RelativeTime from "@/components/uix/relative-time";
import * as States from "@/components/uix/states";
import * as UserChip from "@/components/uix/user-chip";
import * as Form from "@/components/uix/form";

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
    <main className="bg-uix-app text-uix-text min-h-screen p-8">
      <h1 className="text-2xl">@uix registry modules</h1>
      <ul className="mt-4 space-y-1">
        {Object.entries(modules).map(([name, mod]) => (
          <li key={name} className="text-uix-hushed text-sm">
            {name}: {Object.keys(mod).join(", ") || "(no exports)"}
          </li>
        ))}
      </ul>
    </main>
  );
}
