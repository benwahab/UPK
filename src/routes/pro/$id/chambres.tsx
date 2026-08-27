import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImporterCsv } from "@/components/upk/ImporterCsv";
import {
  ajouterChambre,
  importerChambres,
  listerMesChambres,
  supprimerChambre,
} from "@/lib/hotel.functions";
import { analyserCsvChambres } from "@/lib/parserCsv";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/pro/$id/chambres")({
  head: () => ({ meta: [{ title: "Mes chambres — UPK Business" }] }),
  component: PageChambres,
});

function PageChambres() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const queryClient = useQueryClient();

  const chercherChambres = useServerFn(listerMesChambres);
  const ajouter = useServerFn(ajouterChambre);
  const supprimer = useServerFn(supprimerChambre);
  const importer = useServerFn(importerChambres);

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
  }, [chargement, utilisateur, navigate]);

  const chambres = useQuery({
    queryKey: ["mes-chambres", id],
    queryFn: () => chercherChambres({ data: { placeId: id } }),
    enabled: !!utilisateur,
  });

  const [type, setType] = useState("");
  const [capacite, setCapacite] = useState("");
  const [nombre, setNombre] = useState("1");
  const [prix, setPrix] = useState("");
  const [equipements, setEquipements] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  async function onAjouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!type.trim()) {
      setErreur("Le type de chambre est obligatoire.");
      return;
    }
    try {
      await ajouter({
        data: {
          placeId: id,
          type: type.trim(),
          capacite: capacite ? Number(capacite) : null,
          nombre: nombre ? Number(nombre) : 1,
          equipements: equipements.trim() || null,
          prix: prix ? Number(prix) : null,
          description: null,
          disponible: true,
        },
      });
      setType("");
      setCapacite("");
      setNombre("1");
      setPrix("");
      setEquipements("");
      queryClient.invalidateQueries({ queryKey: ["mes-chambres", id] });
    } catch {
      setErreur("Impossible d'ajouter cette chambre. Réessayez.");
    }
  }

  async function onSupprimer(chambreId: string) {
    await supprimer({ data: { id: chambreId, placeId: id } });
    queryClient.invalidateQueries({ queryKey: ["mes-chambres", id] });
  }

  if (chargement || !utilisateur) return null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="flex items-center gap-3 pt-6">
        <Link to="/pro/$id" params={{ id }} className="text-sm font-medium text-primary">
          ← Retour à la fiche
        </Link>
        <Link to="/" className="text-sm font-medium text-muted-foreground">
          Accueil
        </Link>
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">Mes chambres</h1>

      <form
        onSubmit={onAjouter}
        className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="type-chambre">Type de chambre</Label>
            <Input
              id="type-chambre"
              placeholder="Ex : Simple, Double, Suite"
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capacite">Capacité (personnes)</Label>
            <Input
              id="capacite"
              type="number"
              min={1}
              value={capacite}
              onChange={(e) => setCapacite(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre de chambres</Label>
            <Input
              id="nombre"
              type="number"
              min={1}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prix-chambre">Prix / nuit (facultatif)</Label>
            <Input
              id="prix-chambre"
              type="number"
              min={0}
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="equipements">Équipements (facultatif)</Label>
          <Input
            id="equipements"
            placeholder="Ex : Climatisation, Wifi, TV"
            value={equipements}
            onChange={(e) => setEquipements(e.target.value)}
          />
        </div>
        {erreur ? <p className="text-sm text-destructive">{erreur}</p> : null}
        <Button type="submit" variant="terrain" size="sm">
          Ajouter ce type de chambre
        </Button>
      </form>

      <ImporterCsv
        aideColonnes="Colonnes reconnues : type, capacité, nombre, prix, équipements (dans n'importe quel ordre)."
        analyser={analyserCsvChambres}
        rendreApercu={(l) =>
          `${l.type}${l.capacite ? ` — ${l.capacite} pers.` : ""} · ${l.nombre} chambre${l.nombre > 1 ? "s" : ""}${l.prix ? ` · ${l.prix} FCFA` : ""}`
        }
        onConfirmer={async (lignes) => {
          await importer({ data: { placeId: id, lignes } });
          queryClient.invalidateQueries({ queryKey: ["mes-chambres", id] });
        }}
      />

      <ul className="mt-4 space-y-2">
        {(chambres.data ?? []).map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-card-foreground">
                {c.type}
                {c.capacite ? ` — ${c.capacite} pers.` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.nombre} chambre{c.nombre > 1 ? "s" : ""}
                {c.prix ? ` · ${c.prix} FCFA/nuit` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSupprimer(c.id)}
              aria-label={`Retirer ${c.type}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        {chambres.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune chambre enregistrée.</p>
        ) : null}
      </ul>
    </main>
  );
}
