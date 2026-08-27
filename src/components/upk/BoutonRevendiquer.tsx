import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { useState } from "react";

import { demanderRevendication } from "@/lib/revendications.functions";
import { useSession } from "@/lib/useSession";

export function BoutonRevendiquer({ placeId }: { placeId: string }) {
  const { utilisateur, chargement } = useSession();
  const demander = useServerFn(demanderRevendication);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (chargement) return null;

  if (envoye) {
    return <p className="text-xs text-primary">Demande envoyée — un modérateur va la vérifier.</p>;
  }

  if (!utilisateur) {
    return (
      <Link
        to="/connexion"
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        <Store className="mr-1 inline size-3.5" aria-hidden />
        Cet établissement est à vous ? Connectez-vous pour le revendiquer
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={enCours}
        onClick={async () => {
          setErreur(null);
          setEnCours(true);
          try {
            await demander({ data: { placeId } });
            setEnvoye(true);
          } catch {
            setErreur("Impossible d'envoyer la demande. Réessayez.");
          } finally {
            setEnCours(false);
          }
        }}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        <Store className="size-3.5" aria-hidden />
        Cet établissement est à vous ? Le revendiquer
      </button>
      {erreur ? <p className="mt-1 text-xs text-destructive">{erreur}</p> : null}
    </div>
  );
}
