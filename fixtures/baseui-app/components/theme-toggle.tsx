"use client";

export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={() => document.documentElement.classList.toggle("dark")}
      className="rounded-md border border-uix-line bg-uix-surface px-3 py-1.5 text-sm text-uix-text"
    >
      Toggle dark
    </button>
  );
}
