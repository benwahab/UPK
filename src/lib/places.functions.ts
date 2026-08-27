import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Categorie, Lieu, LieuDetail } from "./upk";

const rechercheSchema = z.object({
  requete: z.string().max(120).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  categorieSlug: z.string().max(80).optional().nullable(),
  limite: z.number().int().min(1).max(60).optional(),
});

export const listerCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<Categorie[]> => {
    const { clientPublic } = await import("./supabase-public.server");
    const { data, error } = await clientPublic()
      .from("categories")
      .select("id, nom, slug, icone, parent_id")
      .order("ordre", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Categorie[];
  },
);

export const rechercherLieux = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => rechercheSchema.parse(data))
  .handler(async ({ data }): Promise<Lieu[]> => {
    const { clientPublic } = await import("./supabase-public.server");
    const { data: rows, error } = await clientPublic().rpc("rechercher_lieux", {
      requete: data.requete?.trim() || null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      categorie_slug: data.categorieSlug || null,
      rayon_km: null,
      limite: data.limite ?? 40,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Lieu[];
  });

export const obtenirLieu = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<LieuDetail | null> => {
    const { clientPublic } = await import("./supabase-public.server");
    const supabase = clientPublic();

    const { data: lieu, error } = await supabase
      .from("places")
      .select(
        "id, nom, description, adresse, quartier, latitude, longitude, telephone, whatsapp, horaires, site_web, statut_verification, owner_id, categories(nom, slug, icone)",
      )
      .eq("id", data.id)
      .eq("actif", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lieu) return null;

    const { data: photos } = await supabase
      .from("place_photos")
      .select("id, url")
      .eq("place_id", data.id)
      .order("ordre", { ascending: true });

    const categorie = (lieu as unknown as { categories: Categorie | null }).categories;
    const { owner_id, ...lieuSansProprietaire } = lieu as unknown as Record<string, unknown> & {
      owner_id: string | null;
    };

    return {
      ...(lieuSansProprietaire as unknown as Omit<
        LieuDetail,
        | "categorie_nom"
        | "categorie_slug"
        | "categorie_icone"
        | "distance_m"
        | "photos"
        | "revendicable"
      >),
      categorie_nom: categorie?.nom ?? null,
      categorie_slug: categorie?.slug ?? null,
      categorie_icone: categorie?.icone ?? null,
      distance_m: null,
      photos: (photos ?? []) as { id: string; url: string }[],
      revendicable: owner_id === null,
    };
  });

export type MedicamentPublic = {
  id: string;
  nom_commercial: string;
  molecule: string | null;
  dosage: string | null;
  conditionnement: string | null;
  prix_vente: number | null;
  disponible: boolean;
};

/** Stock affiché sur la fiche publique d'une pharmacie. */
export const listerMedicamentsDuLieu = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ placeId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<MedicamentPublic[]> => {
    const { clientPublic } = await import("./supabase-public.server");
    const { data: rows, error } = await clientPublic()
      .from("medicaments")
      .select("id, nom_commercial, molecule, dosage, conditionnement, prix_vente, disponible")
      .eq("place_id", data.placeId)
      .order("nom_commercial", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as MedicamentPublic[];
  });

export type PlatPublic = {
  id: string;
  nom: string;
  description: string | null;
  categorie: string | null;
  prix: number | null;
  disponible: boolean;
};

/** Menu affiché sur la fiche publique d'un restaurant. */
export const listerMenuDuLieu = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ placeId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<PlatPublic[]> => {
    const { clientPublic } = await import("./supabase-public.server");
    const { data: rows, error } = await clientPublic()
      .from("plats")
      .select("id, nom, description, categorie, prix, disponible")
      .eq("place_id", data.placeId)
      .order("ordre", { ascending: true })
      .order("nom", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as PlatPublic[];
  });

export type ChambrePublic = {
  id: string;
  type: string;
  capacite: number | null;
  nombre: number;
  equipements: string | null;
  prix: number | null;
  description: string | null;
  disponible: boolean;
};

/** Chambres affichées sur la fiche publique d'un hôtel. */
export const listerChambresDuLieu = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ placeId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<ChambrePublic[]> => {
    const { clientPublic } = await import("./supabase-public.server");
    const { data: rows, error } = await clientPublic()
      .from("chambres")
      .select("id, type, capacite, nombre, equipements, prix, description, disponible")
      .eq("place_id", data.placeId)
      .order("type", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as ChambrePublic[];
  });

export type ResultatMedicament = {
  place_id: string;
  place_nom: string;
  quartier: string | null;
  telephone: string | null;
  nom_commercial: string;
  molecule: string | null;
  dosage: string | null;
  prix_vente: number | null;
};

/** "Où trouver X ?" — cherche par nom commercial OU molécule, pharmacies actives uniquement. */
export const chercherMedicament = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ requete: z.string().trim().min(2).max(120) }).parse(data),
  )
  .handler(async ({ data }): Promise<ResultatMedicament[]> => {
    const { clientPublic } = await import("./supabase-public.server");
    const { data: rows, error } = await clientPublic()
      .from("medicaments")
      .select(
        "nom_commercial, molecule, dosage, prix_vente, places(id, nom, quartier, telephone, actif)",
      )
      .eq("disponible", true)
      .or(`nom_commercial.ilike.%${data.requete}%,molecule.ilike.%${data.requete}%`)
      .limit(30);
    if (error) throw new Error(error.message);

    return (rows ?? [])
      .map((r) => {
        const lieu = (
          r as unknown as {
            places: {
              id: string;
              nom: string;
              quartier: string | null;
              telephone: string | null;
              actif: boolean;
            } | null;
          }
        ).places;
        if (!lieu || !lieu.actif) return null;
        return {
          place_id: lieu.id,
          place_nom: lieu.nom,
          quartier: lieu.quartier,
          telephone: lieu.telephone,
          nom_commercial: (r as { nom_commercial: string }).nom_commercial,
          molecule: (r as { molecule: string | null }).molecule,
          dosage: (r as { dosage: string | null }).dosage,
          prix_vente: (r as { prix_vente: number | null }).prix_vente,
        };
      })
      .filter((r): r is ResultatMedicament => r !== null);
  });

export type PharmacieDeGarde = {
  place_id: string;
  nom: string;
  quartier: string | null;
  telephone: string | null;
  latitude: number;
  longitude: number;
  horaires: string | null;
};

/** Pharmacies de garde aujourd'hui, pharmacies actives uniquement. */
export const listerPharmaciesDeGarde = createServerFn({ method: "GET" }).handler(
  async (): Promise<PharmacieDeGarde[]> => {
    const { clientPublic } = await import("./supabase-public.server");
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const { data: rows, error } = await clientPublic()
      .from("pharmacie_gardes")
      .select("horaires, places(id, nom, quartier, telephone, latitude, longitude, actif)")
      .eq("date_garde", aujourdhui);
    if (error) throw new Error(error.message);

    return (rows ?? [])
      .map((r) => {
        const lieu = (
          r as unknown as {
            places: {
              id: string;
              nom: string;
              quartier: string | null;
              telephone: string | null;
              latitude: number;
              longitude: number;
              actif: boolean;
            } | null;
          }
        ).places;
        if (!lieu || !lieu.actif) return null;
        return {
          place_id: lieu.id,
          nom: lieu.nom,
          quartier: lieu.quartier,
          telephone: lieu.telephone,
          latitude: lieu.latitude,
          longitude: lieu.longitude,
          horaires: (r as { horaires: string | null }).horaires,
        };
      })
      .filter((r): r is PharmacieDeGarde => r !== null);
  },
);
