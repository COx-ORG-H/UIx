import { ThemeToggle } from "@/components/theme-toggle";

// Server component. The three uix-* utilities below only emit if
// @uix/tokens/tailwind.css resolved and its @theme bindings registered —
// this page is the smoke test for that.
export default function Home() {
  return (
    <main className="bg-uix-subtle min-h-screen p-8">
      <h1 className="text-uix-text text-2xl font-semibold">
        radix-app fixture
      </h1>
      <p className="text-uix-hushed mt-2">
        Token-backed utilities resolved from @uix/tokens through pnpm-symlinked
        node_modules.
      </p>
      <div className="mt-6">
        <ThemeToggle />
      </div>
    </main>
  );
}
