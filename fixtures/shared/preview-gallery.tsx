"use client";
/* Shared preview gallery — copied into BOTH fixtures (components/shared/) by
 * scripts/copy-to-fixtures.mjs and mounted at /preview. Unlike /all (which
 * only imports the registry modules), this page MOUNTS every composite so the
 * static prerender executes each component's main render path in CI, in both
 * fixtures' dark conventions.
 *
 * Styling rule for the page chrome: uix theme utilities only (bg-uix-app,
 * text-uix-text, text-uix-hushed, border-uix-line, …) — no cold grays, no raw
 * var() reads. The broadened lint:fixtures scan covers this file. */

import type { ColumnDef } from "@tanstack/react-table";
import { Activity, LayoutDashboard, Settings } from "lucide-react";
import { type ReactNode, useState } from "react";
import { z } from "zod";

import { ThemeToggle } from "@/components/theme-toggle";
import { AppShell, type AppShellNavSection } from "@/components/uix/app-shell";
import { AsyncOperationStatus } from "@/components/uix/async-operation-status";
import {
  CheatSheet,
  type ShortcutDescriptor as SheetShortcut,
} from "@/components/uix/cheat-sheet";
import {
  ColumnVisibilityMenu,
  type ColumnVisibilityEntry,
} from "@/components/uix/column-visibility-menu";
import {
  CommandPalette,
  type KeyChord,
  type NavigationEntry,
  type ShortcutDescriptor as PaletteShortcut,
} from "@/components/uix/command-palette";
import { ConfirmAction, useUndoableAction } from "@/components/uix/confirm-action";
import { DataTable } from "@/components/uix/data-table";
import {
  DataTableToolbar,
  type ToolbarFilterEntry,
} from "@/components/uix/data-table-toolbar";
import { DetailLayout } from "@/components/uix/detail-layout";
import { FilterPopover } from "@/components/uix/filter-popover";
import { Form } from "@/components/uix/form";
import { registerListSurface } from "@/components/uix/list-surfaces";
import { Markdown } from "@/components/uix/markdown";
import { RelativeTime } from "@/components/uix/relative-time";
import { StatTile } from "@/components/uix/stat-tile";
import { StatusPill, type StatusPillTone } from "@/components/uix/status-pill";
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
} from "@/components/uix/states";
import { Toaster, toast } from "@/components/uix/toast";
import type { DataTableDensity } from "@/components/uix/types";
import {
  UserAvatar,
  UserChip,
  UserPeekCard,
  type UserChipPerson,
  type UserPresence,
} from "@/components/uix/user-chip";

// -- sample data (static; time-dependent values are computed in the
// -- component so the relative buckets stay truthful at render time) ----

// Module-eval registration — exercises registerListSurface() validation at
// import time, and satisfies the DataTable/toolbar surface_key contract.
registerListSurface({
  key: "preview.list",
  label: "Preview records",
  icon: "table",
  text_search_fields: ["name"],
  columns: [
    { id: "id", label: "ID", sortable: true },
    { id: "name", label: "Name", filter_kind: "text", sortable: true },
    {
      id: "status",
      label: "Status",
      filter_kind: "enum",
      enum_values: ["Nominal", "Degraded", "Offline"],
    },
    { id: "updated", label: "Updated", filter_kind: "date", sortable: true },
  ],
  default_density: "standard",
});

interface PreviewRow {
  id: string;
  name: string;
  status: string;
  updated: string;
}

const STATUS_OPTIONS = [
  { value: "Nominal", label: "Nominal" },
  { value: "Degraded", label: "Degraded" },
  { value: "Offline", label: "Offline" },
] as const;

const VISIBILITY_COLUMNS: ColumnVisibilityEntry[] = [
  { id: "id", label: "ID", visible: true, required: true },
  { id: "name", label: "Name", visible: true },
  { id: "status", label: "Status", visible: true },
  { id: "updated", label: "Updated", visible: false },
];

const PALETTE_SHORTCUTS: PaletteShortcut[] = [
  {
    id: "record.assign",
    trigger: { kind: "chord", chord: { key: "a", meta: true, shift: true } },
    labelKey: "Assign record",
    requiresPermission: null,
    requiresFeatureFlag: null,
  },
  {
    id: "record.archive",
    trigger: { kind: "chord", chord: { key: "e", meta: true } },
    labelKey: "Archive record",
    requiresPermission: null,
    requiresFeatureFlag: null,
  },
];

const PALETTE_NAVIGATION: NavigationEntry[] = [
  { id: "nav.gallery", labelKey: "Preview gallery", href: "#" },
  { id: "nav.all", labelKey: "All modules", href: "/all" },
];

const SHEET_SHORTCUTS: SheetShortcut[] = [
  {
    id: "palette.open",
    scope: "global",
    trigger: { kind: "chord", chord: { key: "k", meta: true } },
    labelKey: "Open command palette",
    category: "General",
    requiresPermission: null,
    requiresFeatureFlag: null,
  },
  {
    id: "search.focus",
    scope: "global",
    trigger: { kind: "sequence", chords: [{ key: "g" }, { key: "s" }] },
    labelKey: "Focus search",
    category: "Navigation",
    requiresPermission: null,
    requiresFeatureFlag: null,
  },
];

const ALLOW_ALL_PERMISSIONS = { has: () => true };
const ALLOW_ALL_FLAGS = { enabled: () => true };
const identityLabel = (labelKey: string): string => labelKey;

const formatChord = (chord: KeyChord, isMac: boolean): string => {
  const parts: string[] = [];
  if (chord.meta) parts.push(isMac ? "⌘" : "Ctrl");
  if (chord.alt) parts.push(isMac ? "⌥" : "Alt");
  if (chord.shift) parts.push(isMac ? "⇧" : "Shift");
  parts.push(chord.key.length === 1 ? chord.key.toUpperCase() : chord.key);
  return parts.join(isMac ? "" : "+");
};

const MARKDOWN_SAMPLE = [
  "## Maintenance window",
  "",
  "The **north dock** sensors go offline for about 20 minutes. Follow the",
  "[runbook](#) or https://status.example.com for live updates.",
  "",
  "> Schedule changes require an approved change record.",
  "",
  "- Drain the message queue",
  "- Rotate the `API_TOKEN` secret",
  "- Re-enable ingest",
  "",
  "```",
  "uix maintenance --window 20m --notify ops",
  "```",
].join("\n");

// Plain-text subtitle: detail-layout renders a string `description` as
// plain text by default. Markdown body rendering is opt-in via
// `descriptionAsMarkdown` and is already exercised by the Markdown section.
const DETAIL_DESCRIPTION =
  "Edge sensor reporting dock-side berth occupancy. Readings stream every 30s.";

const FORM_SCHEMA = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  notes: z.string().optional(),
});

const FORM_FIELDS = [
  {
    name: "name",
    label: "Full name",
    placeholder: "Ada Lovelace",
    required: true,
  },
  {
    name: "email",
    label: "Email",
    inputType: "email",
    placeholder: "ada@example.com",
    required: true,
  },
  {
    name: "notes",
    label: "Notes",
    inputType: "textarea",
    description: "Optional context for the on-call engineer.",
  },
] as const;

// 4c field kinds: select (placeholder + options), checkbox, radio-group,
// native date — exercises every new branch in form.tsx's DefaultField.
const FIELD_KINDS_SCHEMA = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Pick a role"),
  notify: z.boolean(),
  plan: z.enum(["free", "pro"]),
  startDate: z.string().min(1, "Pick a start date"),
});

const FIELD_KINDS_FIELDS = [
  {
    name: "name",
    label: "Full name",
    placeholder: "Grace Hopper",
    required: true,
  },
  {
    name: "role",
    label: "Role",
    inputType: "select",
    placeholder: "Select a role…",
    required: true,
    options: [
      { value: "engineer", label: "Site engineer" },
      { value: "operator", label: "Operator" },
      { value: "auditor", label: "Auditor (read-only)", disabled: true },
    ],
  },
  {
    name: "notify",
    label: "Notify me on critical readings",
    inputType: "checkbox",
    description: "One digest per incident, never per reading.",
  },
  {
    name: "plan",
    label: "Plan",
    inputType: "radio-group",
    required: true,
    options: [
      { value: "free", label: "Free — 1 gateway" },
      { value: "pro", label: "Pro — unlimited gateways" },
    ],
  },
  {
    name: "startDate",
    label: "Start date",
    inputType: "date",
    required: true,
    description: "Native date input — deliberately not a datepicker.",
  },
] as const;

const SAMPLE_USER: UserChipPerson = {
  id: "usr-001",
  display_name: "Ada Lovelace",
  role_label: "Site engineer",
  group_label: "Facilities",
  presence: "online",
};

const PRESENCE_VALUES: UserPresence[] = ["online", "busy", "away", "offline"];

const PILL_TONES: StatusPillTone[] = [
  "neutral",
  "info",
  "success",
  "warning",
  "danger",
  "critical",
  "muted",
];

const PILL_LABELS: Record<StatusPillTone, string> = {
  neutral: "Standard",
  info: "In review",
  success: "Nominal",
  warning: "Degraded",
  danger: "Breached",
  critical: "SEV-1",
  muted: "Archived",
};

const noop = (): void => {};

// App-shell demo nav: one item active WITH a badge (exercises the solid
// --sidebar-primary/--sidebar-primary-foreground chip the shell applies to
// active badges), one inactive item carrying a consumer-styled danger badge.
// The gallery mounts the shell CONTAINED (fixed-height, overflow-hidden box) —
// className="h-full min-h-0!" overrides the shell's min-h-svh so the demo
// doesn't hijack the preview page. The important marker is required: Tailwind
// resolves same-property conflicts by stylesheet order (min-h-svh is emitted
// AFTER min-h-0), not by className order, so a plain min-h-0 would lose.
// The mobile drawer stays closed at the desktop CI viewport (its trigger is
// md:hidden), which is fine for the prerender pass.
const APP_SHELL_NAV: AppShellNavSection[] = [
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "#",
        active: true,
        icon: <LayoutDashboard size={16} strokeWidth={1.75} />,
        badge: 7,
      },
      {
        id: "sensors",
        label: "Sensors",
        href: "#",
        icon: <Activity size={16} strokeWidth={1.75} />,
        badge: <StatusPill tone="danger">3</StatusPill>,
      },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    items: [
      {
        id: "settings",
        label: "Settings",
        href: "#",
        icon: <Settings size={16} strokeWidth={1.75} />,
      },
    ],
  },
];

// Pinned "now" anchor for every RelativeTime sample below. A render-scope
// Date.now() differs between SSR and client hydration (RelativeTime renders
// the full ISO timestamp in its title attribute), so each instance receives
// now={PREVIEW_NOW} — determinism replaces truthfulness, and the prerendered
// output is byte-stable across server, client, and CI prerender.
const PREVIEW_NOW = Date.UTC(2026, 5, 10, 12, 0, 0);

// 12 deterministic rows for the 4c data-table demo (pagination pageSize 5
// → "Page 1 of 3"). Same PREVIEW_NOW anchoring as the rows above — no
// Date.now() anywhere, so the prerender stays byte-stable.
const SELECTION_STATUSES = ["Nominal", "Degraded", "Offline"] as const;
const SELECTION_ROWS: PreviewRow[] = Array.from({ length: 12 }, (_, i) => ({
  id: `SEN-1${String(i + 1).padStart(2, "0")}`,
  name: `Berth sensor ${i + 1}`,
  status: SELECTION_STATUSES[i % 3] ?? "Nominal",
  updated: new Date(PREVIEW_NOW - (i + 1) * 45 * 60_000).toISOString(),
}));

// -- layout helpers ------------------------------------------------------

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="border-b border-uix-line pb-10">
      <h2 className="mb-4 text-xs uppercase tracking-widest text-uix-hushed">
        {title}
      </h2>
      {children}
    </section>
  );
}

const triggerBtnCls =
  "rounded-md border border-uix-line bg-uix-surface px-3 py-1.5 text-sm text-uix-text";

// -- gallery -------------------------------------------------------------

export function PreviewGallery() {
  const [search, setSearch] = useState("");
  const [density, setDensity] = useState<DataTableDensity>("standard");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);
  // 4c selection demo: count fed by DataTable's onRowSelectionChange.
  const [selectedCount, setSelectedCount] = useState(0);

  const submitFieldKinds = (): void => {
    toast({ title: "Submitted", variant: "success" });
  };

  // Undo demo: useUndoableAction (confirm-action) composed with toast() —
  // the two ship uncoupled; this is the documented wiring recipe.
  const undoable = useUndoableAction({
    onCommit: () => toast({ title: "Committed", variant: "success" }),
  });
  const fireUndoableDemo = (): void => {
    undoable.fire();
    toast({
      id: "preview-undo",
      title: "Filter removed",
      description: "Commits in 5s unless undone.",
      action: { label: "Undo", onClick: () => undoable.undo() },
    });
  };

  // Derived from the module-scope PREVIEW_NOW anchor (not Date.now()) so the
  // samples are deterministic and hydration-safe; see comment on PREVIEW_NOW.
  const threeHoursAgo = new Date(PREVIEW_NOW - 3 * 3_600_000).toISOString();
  const rows: PreviewRow[] = [
    {
      id: "SEN-0041",
      name: "North dock sensor",
      status: "Nominal",
      updated: new Date(PREVIEW_NOW - 5 * 60_000).toISOString(),
    },
    {
      id: "SEN-0042",
      name: "Relay panel B",
      status: "Degraded",
      updated: threeHoursAgo,
    },
    {
      id: "SEN-0043",
      name: "Coolant loop monitor",
      status: "Offline",
      // 20h stays in RelativeTime's relative "hours_ago" bucket ("20h ago"),
      // demonstrating the largest relative bucket in the sample table.
      updated: new Date(PREVIEW_NOW - 20 * 3_600_000).toISOString(),
    },
  ];

  const columns: ColumnDef<PreviewRow>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "status", header: "Status" },
    {
      accessorKey: "updated",
      header: "Updated",
      cell: ({ row }) => <RelativeTime ts={row.original.updated} now={PREVIEW_NOW} />,
    },
  ];

  const activeFilters: ToolbarFilterEntry[] = [
    {
      column_id: "status",
      label: "Status",
      displayValue: "Nominal",
      value: { kind: "enum", values: ["Nominal"] },
    },
  ];

  return (
    // div, not <main>: the contained AppShell demo below renders its own
    // <main id="uix-main">, and nested mains are invalid HTML.
    <div className="min-h-screen bg-uix-app text-uix-text">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <header className="mb-10 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-uix-hushed">
              @uix preview
            </p>
            <h1 className="mt-1 text-2xl tracking-tight">Composite gallery</h1>
          </div>
          <ThemeToggle />
        </header>

        <div className="space-y-10">
          <Section title="data-table">
            <DataTable<PreviewRow>
              columns={columns}
              data={rows}
              surface_key="preview.list"
              density={density}
              caption="Facility sensors — preview data"
              onRowClick={noop}
            />
          </Section>

          <Section title="data-table — pagination + selection + sticky header">
            {/* 4c demo. The plain data-table section above stays untouched
              * as the back-compat proof (no new props, pre-4c rendering).
              * No surface_key here — exercises the documented local-only
              * fallback path. */}
            <div className="flex flex-col gap-2">
              <p className="text-sm text-uix-hushed">{selectedCount} selected</p>
              <DataTable<PreviewRow>
                columns={columns}
                data={SELECTION_ROWS}
                caption="Berth sensors — 4c demo: pagination, row selection, sticky header"
                pagination={{ pageSize: 5, pageSizeOptions: [5, 10, 25] }}
                enableRowSelection
                onRowSelectionChange={(_state, selectedRows) =>
                  setSelectedCount(selectedRows.length)
                }
                stickyHeader
                maxHeight="260px"
              />
            </div>
          </Section>

          <Section title="data-table-toolbar">
            {/* The search box is intentionally cosmetic — it drives the
              * controlled input but does not filter the sample rows. The
              * density toggle, however, is wired to the DataTable above. */}
            <DataTableToolbar
              surface_key="preview.list"
              search={search}
              onSearchChange={setSearch}
              filters={activeFilters}
              onRemoveFilter={noop}
              onEditFilter={noop}
              onAddFilter={noop}
              density={density}
              onDensityChange={setDensity}
              hasUnsavedChanges
              onSaveChanges={noop}
            />
          </Section>

          <Section title="column-visibility-menu">
            <ColumnVisibilityMenu
              columns={VISIBILITY_COLUMNS}
              onToggle={noop}
              onReorder={noop}
              onResetSort={noop}
            />
          </Section>

          <Section title="filter-popover">
            <FilterPopover
              kind="enum"
              options={STATUS_OPTIONS}
              initial={["Nominal"]}
              onApply={noop}
              onCancel={noop}
            />
          </Section>

          <Section title="command-palette">
            <button
              type="button"
              className={triggerBtnCls}
              onClick={() => setPaletteOpen(true)}
            >
              Open command palette
            </button>
            <CommandPalette
              open={paletteOpen}
              onOpenChange={setPaletteOpen}
              resolveLabel={identityLabel}
              permissions={ALLOW_ALL_PERMISSIONS}
              featureFlags={ALLOW_ALL_FLAGS}
              shortcuts={PALETTE_SHORTCUTS}
              formatChordForDisplay={formatChord}
              navigation={PALETTE_NAVIGATION}
              onAction={noop}
              onNavigate={noop}
            />
          </Section>

          <Section title="cheat-sheet">
            <button
              type="button"
              className={triggerBtnCls}
              onClick={() => setCheatSheetOpen(true)}
            >
              Open cheat sheet
            </button>
            <CheatSheet
              open={cheatSheetOpen}
              onOpenChange={setCheatSheetOpen}
              resolveLabel={identityLabel}
              permissions={ALLOW_ALL_PERMISSIONS}
              featureFlags={ALLOW_ALL_FLAGS}
              activeScope="global"
              shortcuts={SHEET_SHORTCUTS}
              isScopeActive={() => true}
              formatChord={formatChord}
              categoryOrder={["General", "Navigation"]}
            />
          </Section>

          <Section title="detail-layout">
            <div className="rounded-md border border-uix-line">
              <DetailLayout
                backHref="#"
                backLabel="Back to records"
                eyebrow="Record"
                title="North dock sensor"
                description={DETAIL_DESCRIPTION}
                actions={
                  <button type="button" className={triggerBtnCls}>
                    Edit
                  </button>
                }
                tabs={[
                  { id: "overview", label: "Overview", href: "#", active: true },
                  { id: "history", label: "History", href: "#", badge: 4 },
                  { id: "settings", label: "Settings", href: "#", disabled: true },
                ]}
                metrics={[
                  {
                    id: "uptime",
                    label: "Uptime",
                    value: "99.4%",
                    hint: "Last 30 days",
                  },
                  { id: "readings", label: "Readings", value: "12,408" },
                ]}
                rightRail={
                  <div className="rounded-md border border-uix-line p-3 text-sm text-uix-hushed">
                    Right-rail slot — owner, linked records, audit trail.
                  </div>
                }
              >
                <p className="text-sm text-uix-hushed">
                  Body content renders inside the active tab. The description
                  above is a plain-text subtitle (markdown rendering is opt-in
                  via descriptionAsMarkdown).
                </p>
              </DetailLayout>
            </div>
          </Section>

          <Section title="confirm-action">
            <div className="flex flex-wrap items-start gap-6">
              <ConfirmAction
                tier="type_to_confirm"
                title="Delete preview record"
                description="This permanently removes the record and its readings. Type DELETE to confirm."
                challenge="DELETE"
                confirmLabel="Delete record"
                onConfirm={noop}
                onCancel={noop}
              />
              <ConfirmAction
                tier="single_click"
                warning="Unassigns the on-call engineer from this rotation."
                confirmLabel="Unassign"
                onConfirm={noop}
              />
              <ConfirmAction
                tier="inline"
                confirmLabel="Remove filter"
                onConfirm={noop}
              />
            </div>
          </Section>

          <Section title="async-operation-status">
            <div className="grid gap-4 md:grid-cols-2">
              <AsyncOperationStatus
                state="queued"
                operationId="op-001"
                label="Nightly export"
                queueHint="Position 2 in queue"
              />
              <AsyncOperationStatus
                state="running"
                operationId="op-002"
                label="Embedding articles"
                progress={0.4}
                progressHint="12 / 30 records processed"
              />
              <AsyncOperationStatus
                state="complete"
                operationId="op-003"
                label="Nightly export"
                summary="Export finished in 42s."
                action={
                  <button type="button" className={triggerBtnCls}>
                    Download CSV
                  </button>
                }
              />
              <AsyncOperationStatus
                state="failed"
                operationId="op-004"
                label="Nightly export"
                problem={{
                  title: "Export failed",
                  detail: "The upstream storage bucket rejected the write.",
                }}
                onRetry={noop}
              />
            </div>
          </Section>

          <Section title="markdown">
            <Markdown>{MARKDOWN_SAMPLE}</Markdown>
          </Section>

          <Section title="relative-time">
            <p className="text-sm">
              Last reading: <RelativeTime ts={threeHoursAgo} now={PREVIEW_NOW} />
            </p>
          </Section>

          <Section title="states">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-uix-line">
                <EmptyState
                  title="No sensors yet"
                  description="Connect a gateway to start streaming readings."
                  action={
                    <button type="button" className={triggerBtnCls}>
                      Add a sensor
                    </button>
                  }
                  onClearFilters={noop}
                  clearFiltersLabel="Clear filters"
                />
              </div>
              <div className="space-y-3 rounded-md border border-uix-line p-3">
                <LoadingState rowCount={3} density="compact" />
                <LoadingState rowCount={3} density="standard" />
                <LoadingState rowCount={3} density="comfortable" />
              </div>
              <div className="rounded-md border border-uix-line">
                <ErrorState
                  problem={{
                    title: "Readings unavailable",
                    detail: "The ingest service returned HTTP 503.",
                  }}
                  onRetry={noop}
                  retryLabel="Retry"
                />
              </div>
              <div className="rounded-md border border-uix-line">
                <ForbiddenState permission="sensors.read" variant="inline" />
              </div>
            </div>
          </Section>

          <Section title="user-chip">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-6">
                <UserChip user={SAMPLE_USER} variant="compact" />
                <UserChip user={SAMPLE_USER} variant="default" />
                <UserChip user={SAMPLE_USER} variant="with-role" />
                <UserChip user={SAMPLE_USER} variant="with-presence" onClick={noop} />
                <UserChip
                  user={{ id: "sys-001", display_name: "PagerDuty alert" }}
                  variant="system-reporter"
                />
              </div>
              <div className="flex items-center gap-4">
                {PRESENCE_VALUES.map((presence) => (
                  <UserAvatar
                    key={presence}
                    user={{ display_name: "Ada Lovelace", presence }}
                    sizePx={28}
                    showPresence
                  />
                ))}
              </div>
              <UserPeekCard
                user={SAMPLE_USER}
                recentTickets={
                  <ul className="space-y-1 text-sm text-uix-hushed">
                    <li>SEN-0041 — calibration drift</li>
                    <li>SEN-0038 — battery swap</li>
                  </ul>
                }
                ownedCis={
                  <ul className="space-y-1 text-sm text-uix-hushed">
                    <li>North dock gateway</li>
                  </ul>
                }
                profileHref="#"
              />
            </div>
          </Section>

          <Section title="form">
            <div className="max-w-md">
              <Form
                schema={FORM_SCHEMA}
                fields={FORM_FIELDS}
                onSubmit={noop}
                defaultValues={{ name: "", email: "", notes: "" }}
                submitLabel="Save"
                error="Example server-side problem — the error-display path."
              />
            </div>
          </Section>

          <Section title="form — field kinds">
            {/* 4c demo: select / checkbox / radio-group / date. The plain
              * form section above stays untouched as the back-compat proof
              * (text/email/textarea only, no new descriptor props). */}
            <div className="max-w-md">
              <Form
                schema={FIELD_KINDS_SCHEMA}
                fields={FIELD_KINDS_FIELDS}
                onSubmit={submitFieldKinds}
                defaultValues={{
                  name: "",
                  role: "",
                  notify: false,
                  plan: "free",
                  startDate: "",
                }}
                submitLabel="Submit"
              />
            </div>
          </Section>

          <Section title="toast">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={triggerBtnCls}
                onClick={() => toast({ title: "Saved", variant: "success" })}
              >
                Success toast
              </button>
              <button
                type="button"
                className={triggerBtnCls}
                onClick={() =>
                  toast({
                    title: "Build failed",
                    description: "The fixture build exited with code 1.",
                    variant: "danger",
                    durationMs: null,
                  })
                }
              >
                Sticky alert
              </button>
              <button
                type="button"
                className={triggerBtnCls}
                disabled={undoable.pending}
                onClick={fireUndoableDemo}
              >
                {undoable.pending ? "Removing…" : "Remove with undo"}
              </button>
            </div>
            <Toaster position="bottom-right" />
          </Section>

          <Section title="status-pill">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {PILL_TONES.map((tone) => (
                  <StatusPill key={tone} tone={tone}>
                    {PILL_LABELS[tone]}
                  </StatusPill>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {PILL_TONES.map((tone) => (
                  <StatusPill key={tone} tone={tone} treatment="outline">
                    {PILL_LABELS[tone]}
                  </StatusPill>
                ))}
              </div>
            </div>
          </Section>

          <Section title="stat-tile">
            <div className="grid gap-4 md:grid-cols-3">
              <StatTile label="Open orders" value="42" hint="Updated 5m ago" />
              <StatTile
                label="Error rate"
                value="3.2%"
                hint="Last 24h"
                trend={{ tone: "danger", label: "+12%" }}
              />
              <StatTile
                label="Active sensors"
                value="128"
                hint="Across 4 sites"
                href="#"
                icon={<Activity size={16} strokeWidth={1.75} aria-hidden="true" />}
                trend={{ tone: "success", label: "+3" }}
              />
            </div>
          </Section>

          <Section title="app-shell">
            {/* Contained mount — see the APP_SHELL_NAV comment above. */}
            <div className="h-[420px] overflow-hidden rounded-lg border border-uix-line">
              <AppShell
                className="h-full min-h-0!"
                nav={APP_SHELL_NAV}
                logo={<span className="text-sm font-medium">UIx Ops</span>}
                breadcrumbs={[
                  { id: "home", label: "Home", href: "#" },
                  { id: "preview", label: "Preview" },
                ]}
                topbar={
                  <button type="button" className={triggerBtnCls}>
                    Invite
                  </button>
                }
                sidebarFooter={<UserChip user={SAMPLE_USER} variant="compact" />}
              >
                <div className="p-6">
                  <p className="max-w-prose text-sm text-uix-hushed">
                    Shell body content. The sidebar reads the eight
                    --sidebar* bridge slots and --uix-sidebar-w; the topbar
                    holds the skip link target, breadcrumbs, and the desktop
                    collapse toggle.
                  </p>
                </div>
              </AppShell>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
