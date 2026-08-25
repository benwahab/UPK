import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TYPES_EVENEMENT = ["vue", "appel", "itineraire", "site_web", "whatsapp"] as const;

/** N'importe qui — avec ou sans compte — déclenche un événement en consultant une fiche. */
export const enregistrerEvenement = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ placeId: z.string().uuid(), typeEvenement: z.enum(TYPES_EVENEMENT) }).parse(data),
  )
  .handler(async ({ data }): Promise<void> => {
    const { clientPublic } = await import("./supabase-public.server");
    // Best-effort : un échec ici ne doit jamais bloquer la navigation de
    // l'utilisateur, donc on avale l'erreur plutôt que de la relancer.
    await clientPublic()
      .from("evenements_lieu")
      .insert({ place_id: data.placeId, type_evenement: data.typeEvenement })
      .then(
        () => {},
        () => {},
      );
  });

export type StatistiquesLieu = Record<(typeof TYPES_EVENEMENT)[number], number>;

/** Compte les événements des 30 derniers jours, par type, pour une fiche du propriétaire. */
export const obtenirStatistiques = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ placeId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<StatistiquesLieu> => {
    const { data: proprio, error: erreurProprio } = await context.supabase
      .from("places")
      .select("id")
      .eq("id", data.placeId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (erreurProprio) throw new Error(erreurProprio.message);
    if (!proprio) throw new Error("Cet établissement ne vous appartient pas.");

    const depuis = new Date();
    depuis.setDate(depuis.getDate() - 30);

    const { data: rows, error } = await context.supabase
      .from("evenements_lieu")
      .select("type_evenement")
      .eq("place_id", data.placeId)
      .gte("created_at", depuis.toISOString());
    if (error) throw new Error(error.message);

    const compte: StatistiquesLieu = { vue: 0, appel: 0, itineraire: 0, site_web: 0, whatsapp: 0 };
    for (const r of rows ?? []) {
      const type = r.type_evenement as (typeof TYPES_EVENEMENT)[number];
      compte[type] = (compte[type] ?? 0) + 1;
    }
    return compte;
  });
