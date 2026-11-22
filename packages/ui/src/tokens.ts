export const colors = {
  background: "oklch(0.99 0.005 95)",
  foreground: "oklch(0.22 0.02 250)",
  muted: "oklch(0.96 0.005 95)",
  mutedForeground: "oklch(0.5 0.02 250)",
  primary: "oklch(0.55 0.14 155)",
  primaryForeground: "oklch(0.99 0 0)",
  border: "oklch(0.9 0.01 250)",
  danger: "oklch(0.55 0.2 25)",
  warning: "oklch(0.72 0.16 75)",
  success: "oklch(0.6 0.14 150)",
} as const;

export const radius = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  full: "9999px",
} as const;

export const space = {
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  6: "1.5rem",
  8: "2rem",
  12: "3rem",
  16: "4rem",
} as const;

export const fontFamily = {
  latin: "Inter, system-ui, -apple-system, sans-serif",
  arabic: "'Noto Naskh Arabic', 'IBM Plex Sans Arabic', serif",
} as const;

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
} as const;
