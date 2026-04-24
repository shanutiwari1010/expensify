/**
 * Labels for global shortcuts (client-only; call from "use client" components).
 */

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.platform.toLowerCase().includes("mac");
}

/** Add expense: single key A (handled via `e.code === "KeyA"`, not inside inputs). */
export function formatAddExpenseShortcut(): string {
  return "E";
}

/** Command palette */
export function formatCommandPaletteShortcut(): string {
  return isMacPlatform() ? "⌘K" : "Ctrl+K";
}

export function formatCommandPaletteFallbackShortcut(): string {
  return isMacPlatform() ? "⌘⇧P" : "Ctrl+Shift+P";
}
