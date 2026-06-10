import { ThemeToggle } from "@/components/theme-toggle";

export default function Page() {
  return (
    <main className="min-h-screen bg-uix-subtle p-8">
      <h1 className="text-2xl font-semibold text-uix-text">
        baseui-app fixture
      </h1>
      <p className="mt-2 text-sm text-uix-hushed">
        Token-backed utilities prove @uix/tokens tailwind.css bindings resolve
        through pnpm-symlinked node_modules.
      </p>
      <div className="mt-6">
        <ThemeToggle />
      </div>
    </main>
  );
}
