import { useServerFn } from "@tanstack/react-start";
import { Flag } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LIBELLES_TYPE_PROBLEME, signalerProbleme } from "@/lib/signalements.functions";

const TYPES = Object.entries(LIBELLES_TYPE_PROBLEME) as [
  keyof typeof LIBELLES_TYPE_PROBLEME,
  string,
][];

export function SignalerProbleme({ placeId }: { placeId: string }) {
  const signaler = useServerFn(signalerProbleme);
  const [ouvert, setOuvert] = useState(false);
  const [type, setType] = useState<keyof typeof LIBELLES_TYPE_PROBLEME | null>(null);
  const [description, setDescription] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);

  if (envoye) {
    return <p className="text-sm text-muted-foreground">Merci, votre signalement a été transmis.</p>;
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        <Flag className="size-3.5" aria-hidden />
        Signaler un problème
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-card-foreground">Quel est le problème ?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {TYPES.map(([valeur, libelle]) => (
          <button
            key={valeur}
            type="button"
            onClick={() => setType(valeur)}
            className={
              type === valeur
                ? "rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
                : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
            }
          >
            {libelle}
          </button>
        ))}
      </div>
      <Textarea
        className="mt-3"
        rows={2}
        placeholder="Précisez si besoin (facultatif)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="terrain"
          size="sm"
          disabled={!type || enCours}
          onClick={async () => {
            if (!type) return;
            setEnCours(true);
            try {
              await signaler({ data: { placeId, typeProbleme: type, description: description || null } });
              setEnvoye(true);
            } finally {
              setEnCours(false);
            }
          }}
        >
          {enCours ? "Envoi…" : "Envoyer"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOuvert(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
