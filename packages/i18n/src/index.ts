import ar from "../locales/ar.json";
import en from "../locales/en.json";
import fr from "../locales/fr.json";

export const locales = ["fr", "en", "ar"] as const;
export type Locale = (typeof locales)[number];
export type TranslationKey = keyof typeof fr;

const catalogs: Record<Locale, Record<string, string>> = { fr, en, ar };
const fallback: Locale[] = ["fr"];

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function dir(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function t(locale: Locale, key: TranslationKey): string {
  const direct = catalogs[locale][key];
  if (direct) return direct;
  for (const candidate of fallback) {
    const value = catalogs[candidate][key];
    if (value) return value;
  }
  return key;
}

export function formatNumber(locale: Locale, value: number): string {
  const tag = locale === "ar" ? "ar-u-nu-latn" : locale;
  return new Intl.NumberFormat(tag, { maximumFractionDigits: 1 }).format(value);
}

export function formatDate(locale: Locale, date: Date): string {
  const tag = locale === "ar" ? "ar-u-nu-latn" : locale;
  return new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(date);
}
