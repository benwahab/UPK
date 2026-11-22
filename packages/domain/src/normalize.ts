const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function normalizeLatin(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u2019']/g, " ")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeArabic(input: string): string {
  return input
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064a")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u0640/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSearch(input: string): string {
  return /[\u0600-\u06ff]/.test(input) ? normalizeArabic(input) : normalizeLatin(input);
}

export function normalizePhone(input: string, countryCode = "227"): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 8) return `+${countryCode}${digits}`;
  if (digits.startsWith("0") && digits.length === 9) return `+${countryCode}${digits.slice(1)}`;
  if (digits.startsWith(countryCode) && digits.length === countryCode.length + 8) {
    return `+${digits}`;
  }
  return null;
}
