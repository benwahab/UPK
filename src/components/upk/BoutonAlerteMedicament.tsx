import { useServerFn } from "@tanstack/react-start";
import { BellRing } from "lucide-react";
import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { creerAlerte } from "@/lib/alertes.functions";
import { useSession } from "@/lib/useSession";

export function BoutonAlerteMedicament({
  medicamentId,
  placeId,
}: {
  medicamentId: string;
  placeId: string;
}) {
  const { utilisateur, chargement } = useSession();
  const creer = useServerFn(creerAlerte);
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);

  if (chargement) return null;

  if (!utilisateur) {
    return (
      <Link to="/connexion" className="text-xs text-primary underline-offset-2 hover:underline">
        Se connecter pour être prévenu
      </Link>
    );
  }

  if (envoye) {
    return (
      <Link to="/mes-alertes" className="text-xs text-primary underline-offset-2 hover:underline">
        ✓ Vous serez prévenu — voir mes alertes
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={enCours}
      onClick={async () => {
        setEnCours(true);
        try {
          await creer({ data: { medicamentId, placeId } });
          setEnvoye(true);
        } finally {
          setEnCours(false);
        }
      }}
      className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
    >
      <BellRing className="size-3.5" aria-hidden />
      Me prévenir quand disponible
    </button>
  );
}
