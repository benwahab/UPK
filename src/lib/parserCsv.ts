/**
 * Parseur CSV minimal, sans dépendance externe (pour éviter de désynchroniser
 * bun.lock sans pouvoir le régénérer). Gère les champs entre guillemets et
 * les virgules à l'intérieur, ce qui couvre l'essentiel d'un export Excel.
 */
export function parserCsv(texte: string): string[][] {
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = "";
  let dansGuillemets = false;

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    const suivant = texte[i + 1];

    if (dansGuillemets) {
      if (c === '"' && suivant === '"') {
        champ += '"';
        i++;
      } else if (c === '"') {
        dansGuillemets = false;
      } else {
        champ += c;
      }
      continue;
    }

    if (c === '"') {
      dansGuillemets = true;
    } else if (c === ",") {
      ligne.push(champ.trim());
      champ = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && suivant === "\n") i++;
      ligne.push(champ.trim());
      champ = "";
      if (ligne.some((v) => v !== "")) lignes.push(ligne);
      ligne = [];
    } else {
      champ += c;
    }
  }
  if (champ !== "" || ligne.length > 0) {
    ligne.push(champ.trim());
    if (ligne.some((v) => v !== "")) lignes.push(ligne);
  }

  return lignes;
}

/**
 * Détecte les colonnes par en-tête (insensible à la casse/accents) et
 * retourne des objets prêts à importer. Colonnes reconnues : nom (obligatoire),
 * molecule, dosage, prix.
 */
export function analyserCsvMedicaments(texte: string): {
  lignes: {
    nomCommercial: string;
    molecule: string | null;
    dosage: string | null;
    prixVente: number | null;
  }[];
  erreurs: string[];
} {
  const normaliser = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const table = parserCsv(texte);
  if (table.length === 0) return { lignes: [], erreurs: ["Fichier vide."] };

  const entetes = (table[0] ?? []).map(normaliser);
  const indexNom = entetes.findIndex((h) => h.includes("nom") || h.includes("medicament"));
  const indexMolecule = entetes.findIndex((h) => h.includes("molecule"));
  const indexDosage = entetes.findIndex((h) => h.includes("dosage"));
  const indexPrix = entetes.findIndex((h) => h.includes("prix"));

  if (indexNom === -1) {
    return { lignes: [], erreurs: ["Aucune colonne 'nom' détectée dans l'en-tête du fichier."] };
  }

  const lignes: {
    nomCommercial: string;
    molecule: string | null;
    dosage: string | null;
    prixVente: number | null;
  }[] = [];
  const erreurs: string[] = [];

  for (let i = 1; i < table.length; i++) {
    const rangee = table[i] ?? [];
    const nom = rangee[indexNom]?.trim();
    if (!nom) {
      erreurs.push(`Ligne ${i + 1} : nom manquant, ignorée.`);
      continue;
    }
    const prixTexte = indexPrix >= 0 ? (rangee[indexPrix] ?? "").trim() : "";
    const prix = prixTexte ? Number(prixTexte.replace(/[^\d.]/g, "")) : null;
    lignes.push({
      nomCommercial: nom,
      molecule: indexMolecule >= 0 ? (rangee[indexMolecule] ?? "").trim() || null : null,
      dosage: indexDosage >= 0 ? (rangee[indexDosage] ?? "").trim() || null : null,
      prixVente: prix && !Number.isNaN(prix) ? prix : null,
    });
  }

  return { lignes, erreurs };
}

/** Colonnes reconnues pour un menu : nom (obligatoire), categorie, prix. */
export function analyserCsvPlats(texte: string): {
  lignes: { nom: string; categorie: string | null; prix: number | null }[];
  erreurs: string[];
} {
  const normaliser = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const table = parserCsv(texte);
  if (table.length === 0) return { lignes: [], erreurs: ["Fichier vide."] };

  const entetes = (table[0] ?? []).map(normaliser);
  const indexNom = entetes.findIndex((h) => h.includes("nom") || h.includes("plat"));
  const indexCategorie = entetes.findIndex((h) => h.includes("categorie"));
  const indexPrix = entetes.findIndex((h) => h.includes("prix"));

  if (indexNom === -1) {
    return { lignes: [], erreurs: ["Aucune colonne 'nom' détectée dans l'en-tête du fichier."] };
  }

  const lignes: { nom: string; categorie: string | null; prix: number | null }[] = [];
  const erreurs: string[] = [];

  for (let i = 1; i < table.length; i++) {
    const rangee = table[i] ?? [];
    const nom = rangee[indexNom]?.trim();
    if (!nom) {
      erreurs.push(`Ligne ${i + 1} : nom manquant, ignorée.`);
      continue;
    }
    const prixTexte = indexPrix >= 0 ? (rangee[indexPrix] ?? "").trim() : "";
    const prix = prixTexte ? Number(prixTexte.replace(/[^\d.]/g, "")) : null;
    lignes.push({
      nom,
      categorie: indexCategorie >= 0 ? (rangee[indexCategorie] ?? "").trim() || null : null,
      prix: prix && !Number.isNaN(prix) ? prix : null,
    });
  }

  return { lignes, erreurs };
}

/** Colonnes reconnues pour des chambres : type (obligatoire), capacite, nombre, prix, equipements. */
export function analyserCsvChambres(texte: string): {
  lignes: {
    type: string;
    capacite: number | null;
    nombre: number;
    prix: number | null;
    equipements: string | null;
  }[];
  erreurs: string[];
} {
  const normaliser = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const table = parserCsv(texte);
  if (table.length === 0) return { lignes: [], erreurs: ["Fichier vide."] };

  const entetes = (table[0] ?? []).map(normaliser);
  const indexType = entetes.findIndex((h) => h.includes("type"));
  const indexCapacite = entetes.findIndex((h) => h.includes("capacite"));
  const indexNombre = entetes.findIndex((h) => h.includes("nombre"));
  const indexPrix = entetes.findIndex((h) => h.includes("prix"));
  const indexEquipements = entetes.findIndex((h) => h.includes("equipement"));

  if (indexType === -1) {
    return { lignes: [], erreurs: ["Aucune colonne 'type' détectée dans l'en-tête du fichier."] };
  }

  const lignes: {
    type: string;
    capacite: number | null;
    nombre: number;
    prix: number | null;
    equipements: string | null;
  }[] = [];
  const erreurs: string[] = [];

  for (let i = 1; i < table.length; i++) {
    const rangee = table[i] ?? [];
    const type = rangee[indexType]?.trim();
    if (!type) {
      erreurs.push(`Ligne ${i + 1} : type manquant, ignorée.`);
      continue;
    }
    const capaciteTexte = indexCapacite >= 0 ? (rangee[indexCapacite] ?? "").trim() : "";
    const nombreTexte = indexNombre >= 0 ? (rangee[indexNombre] ?? "").trim() : "";
    const prixTexte = indexPrix >= 0 ? (rangee[indexPrix] ?? "").trim() : "";
    const capacite = capaciteTexte ? Number(capaciteTexte.replace(/[^\d]/g, "")) : null;
    const nombre = nombreTexte ? Number(nombreTexte.replace(/[^\d]/g, "")) : 1;
    const prix = prixTexte ? Number(prixTexte.replace(/[^\d.]/g, "")) : null;
    lignes.push({
      type,
      capacite: capacite && !Number.isNaN(capacite) ? capacite : null,
      nombre: nombre && !Number.isNaN(nombre) && nombre > 0 ? nombre : 1,
      prix: prix && !Number.isNaN(prix) ? prix : null,
      equipements: indexEquipements >= 0 ? (rangee[indexEquipements] ?? "").trim() || null : null,
    });
  }

  return { lignes, erreurs };
}
