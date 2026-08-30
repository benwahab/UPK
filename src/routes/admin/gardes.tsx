import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ajouterMembreGroupe,
  assignerPeriodeGardeGroupe,
  creerGroupeGarde,
  listerGroupesGarde,
  listerMembresGroupe,
  listerToutesLesPharmacies,
  retirerMembreGroupe,
  supprimerGroupeGarde,
} from "@/lib/gardes-admin.functions";
import { estAdmin } from "@/lib/moderateurs.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/admin/gardes")({
  head: () => ({ meta: [{ title: "Groupes de garde — UPK Admin" }] }),
  component: PageGroupesGarde,
});

function PageGroupesGarde() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const queryClient = useQueryClient();
  const verifierRole = useServerFn(estAdmin);
  const chercherGroupes = useServerFn(listerGroupesGarde);
  const creerGroupe = useServerFn(creerGroupeGarde);
  const supprimerGroupe = useServerFn(supprimerGroupeGarde);
  const chercherPharmacies = useServerFn(listerToutesLesPharmacies);

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
  }, [chargement, utilisateur, navigate]);

  const role = useQuery({
    queryKey: ["est-admin", utilisateur?.id],
    queryFn: () => verifierRole(),
    enabled: !!utilisateur,
  });

  useEffect(() => {
    if (role.data === false) navigate({ to: "/" });
  }, [role.data, navigate]);

  const groupes = useQuery({
    queryKey: ["groupes-garde"],
    queryFn: () => chercherGroupes(),
    enabled: role.data === true,
  });

  const pharmacies = useQuery({
    queryKey: ["toutes-pharmacies"],
    queryFn: () => chercherPharmacies(),
    enabled: role.data === true,
  });

  const [nomGroupe, setNomGroupe] = useState("");
  const [groupeOuvert, setGroupeOuvert] = useState<string | null>(null);

  async function onCreerGroupe(e: React.FormEvent) {
    e.preventDefault();
    if (!nomGroupe.trim()) return;
    await creerGroupe({ data: { nom: nomGroupe.trim() } });
    setNomGroupe("");
    queryClient.invalidateQueries({ queryKey: ["groupes-garde"] });
  }

  async function onSupprimerGroupe(id: string) {
    if (
      !window.confirm(
        "Supprimer ce groupe ? Les dates de garde déjà assignées ne sont pas retirées.",
      )
    )
      return;
    await supprimerGroupe({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["groupes-garde"] });
  }

  if (chargement || !utilisateur || role.isPending || role.data !== true) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        Chargement…
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="flex items-center gap-3 pt-6">
        <Link to="/admin" className="text-sm font-medium text-primary">
          ← Modération
        </Link>
        <Link to="/" className="text-sm font-medium text-muted-foreground">
          Accueil
        </Link>
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">
        Groupes de garde (pharmacies)
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        En attendant que chaque pharmacie gère son propre calendrier depuis son espace pro, vous
        pouvez assigner ici une période de garde à tout un groupe en une fois.
      </p>

      <form onSubmit={onCreerGroupe} className="mt-4 flex gap-2">
        <Input
          placeholder="Nom du groupe (ex : Groupe A)"
          value={nomGroupe}
          onChange={(e) => setNomGroupe(e.target.value)}
        />
        <Button type="submit" variant="terrain">
          <Plus className="size-4" aria-hidden />
          Créer
        </Button>
      </form>

      <div className="mt-4 space-y-3">
        {(groupes.data ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Aucun groupe pour l'instant.
          </p>
        ) : (
          (groupes.data ?? []).map((g) => (
            <div key={g.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setGroupeOuvert(groupeOuvert === g.id ? null : g.id)}
                  className="flex items-center gap-1.5 text-sm font-medium text-card-foreground"
                >
                  <Users className="size-4 text-muted-foreground" aria-hidden />
                  {g.nom} ({g.nombre_membres} pharmacie{g.nombre_membres > 1 ? "s" : ""})
                </button>
                <button
                  type="button"
                  onClick={() => onSupprimerGroupe(g.id)}
                  aria-label={`Supprimer ${g.nom}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>

              {groupeOuvert === g.id ? (
                <DetailGroupe
                  groupeId={g.id}
                  pharmacies={pharmacies.data ?? []}
                  onChange={() => queryClient.invalidateQueries({ queryKey: ["groupes-garde"] })}
                />
              ) : null}
            </div>
          ))
        )}
      </div>
    </main>
  );
}

function DetailGroupe({
  groupeId,
  pharmacies,
  onChange,
}: {
  groupeId: string;
  pharmacies: { id: string; nom: string; quartier: string | null }[];
  onChange: () => void;
}) {
  const queryClient = useQueryClient();
  const chercherMembres = useServerFn(listerMembresGroupe);
  const ajouter = useServerFn(ajouterMembreGroupe);
  const retirer = useServerFn(retirerMembreGroupe);
  const assigner = useServerFn(assignerPeriodeGardeGroupe);

  const membres = useQuery({
    queryKey: ["membres-groupe", groupeId],
    queryFn: () => chercherMembres({ data: { groupeId } }),
  });

  const [pharmacieChoisie, setPharmacieChoisie] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [horaires, setHoraires] = useState("");
  const [resultat, setResultat] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function onAjouterMembre() {
    if (!pharmacieChoisie) return;
    await ajouter({ data: { groupeId, placeId: pharmacieChoisie } });
    setPharmacieChoisie("");
    queryClient.invalidateQueries({ queryKey: ["membres-groupe", groupeId] });
    onChange();
  }

  async function onRetirerMembre(id: string) {
    await retirer({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["membres-groupe", groupeId] });
    onChange();
  }

  async function onAssigner() {
    if (!dateDebut || !dateFin) return;
    setEnCours(true);
    setResultat(null);
    try {
      const { creees } = await assigner({
        data: { groupeId, dateDebut, dateFin, horaires: horaires.trim() || null },
      });
      setResultat(`${creees} garde(s) enregistrée(s) pour le groupe.`);
    } finally {
      setEnCours(false);
    }
  }

  const idsMembres = new Set((membres.data ?? []).map((m) => m.place_id));
  const pharmaciesDisponibles = pharmacies.filter((p) => !idsMembres.has(p.id));

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Membres</p>
      <ul className="mt-2 space-y-1">
        {(membres.data ?? []).map((m) => (
          <li key={m.id} className="flex items-center justify-between text-sm text-card-foreground">
            <span>
              {m.nom}
              {m.quartier ? ` · ${m.quartier}` : ""}
            </span>
            <button
              type="button"
              onClick={() => onRetirerMembre(m.id)}
              aria-label={`Retirer ${m.nom}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
        {(membres.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune pharmacie dans ce groupe.</p>
        ) : null}
      </ul>

      <div className="mt-2 flex gap-2">
        <Select value={pharmacieChoisie} onValueChange={setPharmacieChoisie}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Ajouter une pharmacie…" />
          </SelectTrigger>
          <SelectContent>
            {pharmaciesDisponibles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nom}
                {p.quartier ? ` · ${p.quartier}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAjouterMembre}
          disabled={!pharmacieChoisie}
        >
          Ajouter
        </Button>
      </div>

      <p className="mt-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Assigner une période de garde
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`debut-${groupeId}`}>Du</Label>
          <Input
            id={`debut-${groupeId}`}
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`fin-${groupeId}`}>Au</Label>
          <Input
            id={`fin-${groupeId}`}
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <Label htmlFor={`horaires-${groupeId}`}>Horaires (facultatif)</Label>
        <Input
          id={`horaires-${groupeId}`}
          placeholder="Ex : 20h-8h"
          value={horaires}
          onChange={(e) => setHoraires(e.target.value)}
        />
      </div>
      <Button
        type="button"
        variant="terrain"
        size="sm"
        className="mt-2"
        onClick={onAssigner}
        disabled={enCours || !dateDebut || !dateFin || (membres.data ?? []).length === 0}
      >
        {enCours ? "Enregistrement…" : "Assigner cette période au groupe"}
      </Button>
      {resultat ? <p className="mt-2 text-sm text-primary">{resultat}</p> : null}
    </div>
  );
}
