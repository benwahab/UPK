import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { mesAutorisations } from "./autorisations.functions";
import { AUTORISATIONS_VIDES, type Autorisations } from "./autorisations";
import { useSession } from "./useSession";

/**
 * Rôles et permissions du compte connecté. Les visiteurs sans compte
 * n'appellent jamais le serveur : ils n'ont simplement aucune autorisation.
 */
export function useAutorisations() {
  const { utilisateur, chargement } = useSession();
  const charger = useServerFn(mesAutorisations);

  const requete = useQuery<Autorisations>({
    queryKey: ["mes-autorisations", utilisateur?.id],
    queryFn: () => charger(),
    enabled: Boolean(utilisateur),
    staleTime: 60_000,
  });

  return {
    autorisations: utilisateur ? requete.data : AUTORISATIONS_VIDES,
    utilisateur,
    chargement: chargement || (Boolean(utilisateur) && requete.isPending),
  };
}
