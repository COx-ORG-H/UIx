import { ThemeToggle } from "@/components/theme-toggle";

export default function Page() {
  return (
    <main className="min-h-screen bg-hx-subtle p-8">
      <h1 className="text-2xl font-semibold text-hx-text">
        baseui-app fixture
      </h1>
      <p className="mt-2 text-sm text-hx-hushed">
        Token-backed utilities prove @hx/tokens tailwind.css bindings resolve
        through pnpm-symlinked node_modules.
      </p>
      <div className="mt-6">
        <ThemeToggle />
      </div>
    </main>
  );
}
