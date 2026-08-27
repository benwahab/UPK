import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";

export function BasculeTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  function basculer() {
    const suivant: Theme = theme === "dark" ? "light" : "dark";
    setTheme(suivant);
    applyTheme(suivant);
  }

  return (
    <button
      type="button"
      onClick={basculer}
      aria-label={theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}
      className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-card-foreground transition-colors hover:bg-accent"
    >
      {theme === "dark" ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </button>
  );
}
