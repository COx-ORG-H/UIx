"use client";
/* Hand-maintained smoke page; the module map lives in
 * fixtures/shared/all-modules.ts (synced by copy-to-fixtures). */
import { modules } from "@/components/shared/all-modules";

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
