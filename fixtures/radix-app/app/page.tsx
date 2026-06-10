import { ThemeToggle } from "@/components/theme-toggle";

// Server component. The three hx-* utilities below only emit if
// @hx/tokens/tailwind.css resolved and its @theme bindings registered —
// this page is the smoke test for that.
export default function Home() {
  return (
    <main className="bg-hx-subtle min-h-screen p-8">
      <h1 className="text-hx-text text-2xl font-semibold">
        radix-app fixture
      </h1>
      <p className="text-hx-hushed mt-2">
        Token-backed utilities resolved from @hx/tokens through pnpm-symlinked
        node_modules.
      </p>
      <div className="mt-6">
        <ThemeToggle />
      </div>
    </main>
  );
}
