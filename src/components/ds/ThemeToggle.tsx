"use client";

import { useTheme } from "next-themes";
import { useMounted } from "@/lib/use-mounted";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) return null;

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      style={{
        border: "1px solid var(--ds-color-border)",
        borderRadius: "var(--ds-radius-sm)",
        padding: "6px 12px",
        background: "transparent",
        color: "var(--ds-color-text-inverse)",
        cursor: "pointer",
      }}
    >
      {isDark ? "☀️ Claro" : "🌙 Escuro"}
    </button>
  );
}
