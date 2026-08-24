import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ajouterGarde,
  ajouterMedicament,
  listerMesGardes,
  listerMonStock,
  retirerGarde,
  supprimerMedicament,
} from "@/lib/pharmacie.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/pro/$id/pharmacie")({
  head: () => ({ meta: [{ title: "Stock et gardes — UPK Business" }] }),
  component: PagePharmacie,
});

function PagePharmacie() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const queryClient = useQueryClient();

  const chercherStock = useServerFn(listerMonStock);
  const ajouter = useServerFn(ajouterMedicament);
  const supprimer = useServerFn(supprimerMedicament);
  const chercherGardes = useServerFn(listerMesGardes);
  const ajouterUneGarde = useServerFn(ajouterGarde);
  const retirerUneGarde = useServerFn(retirerGarde);

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
  }, [chargement, utilisateur, navigate]);

  const stock = useQuery({
    queryKey: ["mon-stock", id],
    queryFn: () => chercherStock({ data: { placeId: id } }),
    enabled: !!utilisateur,
  });
  const gardes = useQuery({
    queryKey: ["mes-gardes", id],
    queryFn: () => chercherGardes({ data: { placeId: id } }),
    enabled: !!utilisateur,
  });

  const [nomCommercial, setNomCommercial] = useState("");
  const [molecule, setMolecule] = useState("");
  const [dosage, setDosage] = useState("");
  const [prixVente, setPrixVente] = useState("");
  const [erreurStock, setErreurStock] = useState<string | null>(null);

  const [dateGarde, setDateGarde] = useState("");
  const [horairesGarde, setHorairesGarde] = useState("");
  const [erreurGarde, setErreurGarde] = useState<string | null>(null);

  async function onAjouterMedicament(e: React.FormEvent) {
    e.preventDefault();
    setErreurStock(null);
    if (!nomCommercial.trim()) {
      setErreurStock("Le nom du médicament est obligatoire.");
      return;
    }
    try {
      await ajouter({
        data: {
          placeId: id,
          nomCommercial: nomCommercial.trim(),
          molecule: molecule.trim() || null,
          dosage: dosage.trim() || null,
          forme: null,
          conditionnement: null,
          prixVente: prixVente ? Number(prixVente) : null,
          disponible: true,
        },
      });
      setNomCommercial("");
      setMolecule("");
      setDosage("");
      setPrixVente("");
      queryClient.invalidateQueries({ queryKey: ["mon-stock", id] });
    } catch {
      setErreurStock("Impossible d'ajouter ce médicament. Réessayez.");
    }
  }

  async function onSupprimerMedicament(medicamentId: string) {
    await supprimer({ data: { id: medicamentId, placeId: id } });
    queryClient.invalidateQueries({ queryKey: ["mon-stock", id] });
  }

  async function onAjouterGarde(e: React.FormEvent) {
    e.preventDefault();
    setErreurGarde(null);
    if (!dateGarde) {
      setErreurGarde("Choisissez une date.");
      return;
    }
    try {
      await ajouterUneGarde({
        data: { placeId: id, dateGarde: dateGarde, horaires: horairesGarde.trim() || null },
      });
      setDateGarde("");
      setHorairesGarde("");
      queryClient.invalidateQueries({ queryKey: ["mes-gardes", id] });
    } catch {
      setErreurGarde("Impossible d'ajouter cette date (peut-être déjà enregistrée).");
    }
  }

  async function onRetirerGarde(gardeId: string) {
    await retirerUneGarde({ data: { id: gardeId, placeId: id } });
    queryClient.invalidateQueries({ queryKey: ["mes-gardes", id] });
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
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">
        Stock et gardes
      </h1>

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-foreground">Médicaments</h2>
        <form onSubmit={onAjouterMedicament} className="mt-3 space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nom-commercial">Nom commercial</Label>
              <Input
                id="nom-commercial"
                value={nomCommercial}
                onChange={(e) => setNomCommercial(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="molecule">Molécule (facultatif)</Label>
              <Input id="molecule" value={molecule} onChange={(e) => setMolecule(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dosage">Dosage (facultatif)</Label>
              <Input id="dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prix">Prix de vente (facultatif)</Label>
              <Input
                id="prix"
                type="number"
                min={0}
                value={prixVente}
                onChange={(e) => setPrixVente(e.target.value)}
              />
            </div>
          </div>
          {erreurStock ? <p className="text-sm text-destructive">{erreurStock}</p> : null}
          <Button type="submit" variant="terrain" size="sm">
            Ajouter au stock
          </Button>
        </form>

        <ul className="mt-3 space-y-2">
          {(stock.data ?? []).map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-card-foreground">
                  {m.nom_commercial}
                  {m.dosage ? ` — ${m.dosage}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.molecule ?? "—"}
                  {m.prix_vente ? ` · ${m.prix_vente} FCFA` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSupprimerMedicament(m.id)}
                aria-label={`Retirer ${m.nom_commercial}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
          {stock.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun médicament enregistré.</p>
          ) : null}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Jours de garde à venir
        </h2>
        <form onSubmit={onAjouterGarde} className="mt-3 space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date-garde">Date</Label>
              <Input
                id="date-garde"
                type="date"
                value={dateGarde}
                onChange={(e) => setDateGarde(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="horaires-garde">Horaires (facultatif)</Label>
              <Input
                id="horaires-garde"
                placeholder="Ex : 20h-8h"
                value={horairesGarde}
                onChange={(e) => setHorairesGarde(e.target.value)}
              />
            </div>
          </div>
          {erreurGarde ? <p className="text-sm text-destructive">{erreurGarde}</p> : null}
          <Button type="submit" variant="terrain" size="sm">
            Ajouter cette date
          </Button>
        </form>

        <ul className="mt-3 space-y-2">
          {(gardes.data ?? []).map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
            >
              <p className="text-sm text-card-foreground">
                {new Date(g.date_garde).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                {g.horaires ? ` · ${g.horaires}` : ""}
              </p>
              <button
                type="button"
                onClick={() => onRetirerGarde(g.id)}
                aria-label="Retirer cette date de garde"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
          {gardes.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune garde programmée.</p>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
