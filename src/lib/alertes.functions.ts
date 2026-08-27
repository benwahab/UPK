import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const creerAlerte = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ medicamentId: z.string().uuid(), placeId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    const { error } = await context.supabase.from("alertes_medicament").upsert(
      {
        user_id: context.userId,
        medicament_id: data.medicamentId,
        place_id: data.placeId,
        notifie: false,
      },
      { onConflict: "user_id,medicament_id" },
    );
    if (error) throw new Error(error.message);
  });

export type Alerte = {
  id: string;
  notifie: boolean;
  created_at: string;
  medicaments: { id: string; nom_commercial: string; disponible: boolean } | null;
  places: { id: string; nom: string; quartier: string | null } | null;
};

export const listerMesAlertes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Alerte[]> => {
    const { data, error } = await context.supabase
      .from("alertes_medicament")
      .select(
        "id, notifie, created_at, medicaments(id, nom_commercial, disponible), places(id, nom, quartier)",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Alerte[];
  });

export const supprimerAlerte = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    const { error } = await context.supabase
      .from("alertes_medicament")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
  });
