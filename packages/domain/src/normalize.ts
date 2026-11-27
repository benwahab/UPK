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

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j]! + 1,
        current[j - 1]! + 1,
        previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length]!;
}

export function isFuzzyMatch(query: string, candidate: string): boolean {
  const normalizedQuery = normalizeSearch(query);
  const normalizedCandidate = normalizeSearch(candidate);
  if (!normalizedQuery || !normalizedCandidate) return false;
  if (normalizedCandidate.includes(normalizedQuery)) return true;
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const candidateTokens = normalizedCandidate.split(" ").filter(Boolean);
  return queryTokens.every((token) =>
    candidateTokens.some((candidateToken) => {
      if (candidateToken.startsWith(token) || token.startsWith(candidateToken)) return true;
      const tolerance = token.length >= 7 ? 2 : token.length >= 4 ? 1 : 0;
      return editDistance(token, candidateToken) <= tolerance;
    }),
  );
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
