export type StatutVerification = "a_verifier" | "source_fiable" | "verifie";

export type Categorie = {
  id: string;
  nom: string;
  slug: string;
  icone: string | null;
  parent_id: string | null;
};

export type Lieu = {
  id: string;
  nom: string;
  description: string | null;
  adresse: string | null;
  quartier: string | null;
  latitude: number;
  longitude: number;
  telephone: string | null;
  whatsapp: string | null;
  horaires: string | null;
  site_web: string | null;
  statut_verification: StatutVerification;
  categorie_nom: string | null;
  categorie_slug: string | null;
  categorie_icone: string | null;
  distance_m: number | null;
};

export type LieuDetail = Lieu & { photos: { id: string; url: string }[] };

export const STATUTS: Record<StatutVerification, { label: string; puce: string; aide: string }> = {
  verifie: {
    label: "Vérifié",
    puce: "🟢",
    aide: "Informations contrôlées sur place ou par l'établissement.",
  },
  source_fiable: {
    label: "Source fiable",
    puce: "🔵",
    aide: "Informations issues d'une source publique jugée fiable.",
  },
  a_verifier: {
    label: "À vérifier",
    puce: "🟡",
    aide: "Informations non encore confirmées. Appelez avant de vous déplacer.",
  },
};

/** "450 m" / "2,4 km". Renvoie null si la position de l'utilisateur est inconnue. */
export function formaterDistance(metres: number | null | undefined): string | null {
  if (metres === null || metres === undefined || Number.isNaN(metres)) return null;
  if (metres < 1000) {
    const arrondi = metres < 100 ? Math.round(metres) : Math.round(metres / 10) * 10;
    return `${arrondi} m`;
  }
  const km = metres / 1000;
  const valeur = km < 100 ? km.toFixed(1) : Math.round(km).toString();
  return `${valeur.replace(".", ",")} km`;
}

export function lienItineraire(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function lienWhatsapp(numero: string): string {
  return `https://wa.me/${numero.replace(/[^0-9]/g, "")}`;
}

export function telAffiche(numero: string): string {
  const brut = numero.replace(/\s+/g, "");
  const m = brut.match(/^\+227(\d{2})(\d{2})(\d{2})(\d{2})$/);
  return m ? `+227 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : numero;
}
