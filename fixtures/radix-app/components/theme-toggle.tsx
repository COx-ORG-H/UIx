"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Toggles this fixture's dark convention (mirrors ITSMx):
 * sets data-theme="dark" on <html> for dark, removes the attribute for light.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      return next;
    });
  }, []);

  return (
    <button type="button" onClick={toggle} data-testid="theme-toggle">
      {dark ? "Switch to light" : "Switch to dark"}
    </button>
  );
}
