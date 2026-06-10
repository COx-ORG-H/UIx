"use client";

export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={() => document.documentElement.classList.toggle("dark")}
      className="rounded-md border border-hx-line bg-hx-surface px-3 py-1.5 text-sm text-hx-text"
    >
      Toggle dark
    </button>
  );
}
