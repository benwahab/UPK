/**
 * Recherche par besoin (cahier des charges section 29), version gratuite :
 * un dictionnaire de mots-clés plutôt qu'un appel à un modèle d'IA à
 * chaque recherche (qui aurait un coût récurrent, hors budget pour
 * l'instant). Couvre les catégories actuellement seedées ; à étendre au
 * fur et à mesure que de nouvelles catégories sont ajoutées via
 * /admin/categories.
 */
const BESOINS: { motsClefs: string[]; categorieSlug: string }[] = [
  {
    motsClefs: ["manger", "faim", "resto", "restaurant", "diner", "dejeuner", "glace", "cafe", "boire"],
    categorieSlug: "restaurant",
  },
  {
    motsClefs: ["medicament", "ordonnance", "pharmacie", "garde", "malade", "soigner"],
    categorieSlug: "pharmacie",
  },
  {
    motsClefs: ["panne", "mecanicien", "pneu", "vidange", "reparer voiture", "garage"],
    categorieSlug: "garage",
  },
  {
    motsClefs: ["dormir", "chambre", "nuit", "logement", "hebergement", "hotel"],
    categorieSlug: "hotel",
  },
  {
    motsClefs: ["ecole", "inscription scolaire", "cours", "etudier"],
    categorieSlug: "ecole",
  },
  {
    motsClefs: ["medecin", "clinique", "hopital", "consultation", "docteur"],
    categorieSlug: "sante",
  },
  {
    motsClefs: ["argent", "retrait", "distributeur", "guichet automatique", "virement", "banque"],
    categorieSlug: "banque",
  },
  {
    motsClefs: ["rond point", "rond-point", "carrefour", "monument", "marche", "pont"],
    categorieSlug: "point-geographique",
  },
];

function normaliser(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Retourne le slug de catégorie suggéré pour une requête en langage naturel, ou null. */
export function trouverCategorieParBesoin(requete: string): string | null {
  const texte = normaliser(requete);
  if (texte.length < 3) return null;
  for (const { motsClefs, categorieSlug } of BESOINS) {
    if (motsClefs.some((mot) => texte.includes(mot))) return categorieSlug;
  }
  return null;
}
