const SITE_URL = import.meta.env.VITE_SITE_URL ?? "";

export function absoluteUrl(path: string): string {
  return SITE_URL ? `${SITE_URL}${path}` : path;
}
