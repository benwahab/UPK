/** Distance en mètres entre deux points GPS (formule de Haversine). */
export function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MOTS_GENERIQUES = new Set([
  "le",
  "la",
  "les",
  "un",
  "une",
  "des",
  "de",
  "du",
  "restaurant",
  "hotel",
  "pharmacie",
  "de",
  "et",
]);

export function normaliserNom(nom: string): string[] {
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((mot) => mot.length > 1 && !MOTS_GENERIQUES.has(mot));
}

/** Similarité de Jaccard entre les mots significatifs de deux noms (0 à 1). */
export function similariteNoms(nomA: string, nomB: string): number {
  const motsA = new Set(normaliserNom(nomA));
  const motsB = new Set(normaliserNom(nomB));
  if (motsA.size === 0 || motsB.size === 0) return 0;
  let intersection = 0;
  for (const mot of motsA) if (motsB.has(mot)) intersection++;
  const union = motsA.size + motsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Normalise un numéro de téléphone pour comparaison (retire espaces/tirets). */
export function normaliserTelephone(tel: string | null): string | null {
  if (!tel) return null;
  const chiffres = tel.replace(/[^\d]/g, "");
  return chiffres.length >= 8 ? chiffres : null;
}
