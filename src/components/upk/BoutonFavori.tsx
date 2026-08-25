import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Heart } from "lucide-react";

import { basculerFavori, estFavori } from "@/lib/favoris.functions";
import { useSession } from "@/lib/useSession";

export function BoutonFavori({ placeId }: { placeId: string }) {
  const { utilisateur, chargement } = useSession();
  const queryClient = useQueryClient();
  const chercherStatut = useServerFn(estFavori);
  const basculer = useServerFn(basculerFavori);

  const statut = useQuery({
    queryKey: ["est-favori", placeId, utilisateur?.id],
    queryFn: () => chercherStatut({ data: { placeId } }),
    enabled: !!utilisateur,
  });

  if (chargement) return null;

  if (!utilisateur) {
    return (
      <Link
        to="/connexion"
        aria-label="Se connecter pour ajouter aux favoris"
        className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground"
      >
        <Heart className="size-4" aria-hidden />
      </Link>
    );
  }

  const actif = statut.data === true;

  return (
    <button
      type="button"
      aria-label={actif ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={actif}
      onClick={async () => {
        const resultat = await basculer({ data: { placeId } });
        queryClient.setQueryData(["est-favori", placeId, utilisateur.id], resultat.favori);
        queryClient.invalidateQueries({ queryKey: ["mes-favoris"] });
      }}
      className={
        actif
          ? "inline-flex size-9 items-center justify-center rounded-full border border-destructive/40 text-destructive"
          : "inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground"
      }
    >
      <Heart className={actif ? "size-4 fill-current" : "size-4"} aria-hidden />
    </button>
  );
}
