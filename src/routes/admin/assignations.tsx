import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, MapPin, X } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminShell } from "@/components/upk/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  creerLotAssignation,
  lieuxAAssigner,
  listerLotsAssignation,
  listerModerateurs,
  RAYON_MAX_METRES,
  type LieuAAssigner,
} from "@/lib/assignations.functions";
import { peut } from "@/lib/autorisations";
import { useAutorisations } from "@/lib/useAutorisations";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/admin/assignations")({
  head: () => ({ meta: [{ title: "Attributions — UPK Admin" }] }),
  component: PageAssignations,
});

const RAYONS = [500, 1000, 2000, 3000, RAYON_MAX_METRES];

function PageAssignations() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const { autorisations } = useAutorisations();
  const queryClient = useQueryClient();
  const chercherLieux = useServerFn(lieuxAAssigner);
  const creerLot = useServerFn(creerLotAssignation);
  const chercherLots = useServerFn(listerLotsAssignation);
  const chercherModerateurs = useServerFn(listerModerateurs);

  const autorise = peut(autorisations, "moderateurs");

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
  }, [chargement, utilisateur, navigate]);

  useEffect(() => {
    if (!chargement && utilisateur && autorisations.roles.length > 0 && !autorise) {
      navigate({ to: "/admin" });
    }
  }, [chargement, utilisateur, autorise, autorisations.roles.length, navigate]);

  const moderateurs = useQuery({
    queryKey: ["moderateurs"],
    queryFn: () => chercherModerateurs(),
    enabled: autorise,
  });

  const lots = useQuery({
    queryKey: ["lots-assignation"],
    queryFn: () => chercherLots(),
    enabled: autorise,
  });

  const [moderateurId, setModerateurId] = useState("");
  const [centreLat, setCentreLat] = useState("13.5117");
  const [centreLng, setCentreLng] = useState("2.1098");
  const [rayon, setRayon] = useState(2000);
  const [recherche, setRecherche] = useState(false);
  const [lieux, setLieux] = useState<LieuAAssigner[] | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);

  async function onRechercher() {
    setRecherche(true);
    setErreur(null);
    setSucces(null);
    try {
      const res = await chercherLieux({
        data: {
          latitude: Number(centreLat),
          longitude: Number(centreLng),
          rayonM: rayon,
        },
      });
      setLieux(res);
      setSelection(new Set());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Recherche impossible.");
    } finally {
      setRecherche(false);
    }
  }

  function basculerSelection(id: string) {
    setSelection((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onCreerLot() {
    if (!moderateurId) {
      setErreur("Choisissez un modérateur.");
      return;
    }
    if (selection.size === 0) {
      setErreur("Sélectionnez au moins un lieu.");
      return;
    }
    setCreation(true);
    setErreur(null);
    setSucces(null);
    try {
      const { lieux: n } = await creerLot({
        data: {
          moderateurId,
          nom: `Lot du ${new Date().toLocaleDateString("fr-FR")}`,
          latitude: Number(centreLat),
          longitude: Number(centreLng),
          rayonM: rayon,
          placeIds: Array.from(selection),
        },
      });
      setSucces(`${n} lieu${n > 1 ? "x" : ""} attribué${n > 1 ? "s" : ""} au modérateur.`);
      setLieux(null);
      setSelection(new Set());
      queryClient.invalidateQueries({ queryKey: ["lots-assignation"] });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setCreation(false);
    }
  }

  if (chargement || !utilisateur || autorisations.roles.length === 0 || !autorise) {
    return (
      <AdminShell>
        <p className="py-16 text-center text-sm text-muted-foreground">Chargement…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h1 className="font-display text-xl font-semibold text-foreground">Attributions par zone</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Confiez à un modérateur un groupe de lieux proches les uns des autres, pour éviter des
        déplacements dispersés. Le modérateur ne verra aucun lieu tant que vous ne lui en attribuez
        pas.
      </p>

      <section className="mt-5 space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-card-foreground">Nouveau lot</h2>

        <div className="space-y-1.5">
          <Label htmlFor="moderateur">Modérateur</Label>
          <select
            id="moderateur"
            value={moderateurId}
            onChange={(e) => setModerateurId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">— Choisir —</option>
            {(moderateurs.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.prenom ?? ""} {m.nom_complet ?? "Compte sans nom"}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="lat">Latitude du centre</Label>
            <Input
              id="lat"
              type="number"
              step="0.0001"
              value={centreLat}
              onChange={(e) => setCentreLat(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lng">Longitude du centre</Label>
            <Input
              id="lng"
              type="number"
              step="0.0001"
              value={centreLng}
              onChange={(e) => setCentreLng(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rayon">Rayon de recherche</Label>
          <div className="flex flex-wrap gap-2">
            {RAYONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRayon(r)}
                className={
                  rayon === r
                    ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                    : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                }
              >
                {r >= 1000 ? `${r / 1000} km` : `${r} m`}
              </button>
            ))}
          </div>
        </div>

        <Button type="button" variant="terrain" size="sm" onClick={onRechercher} disabled={recherche}>
          {recherche ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <MapPin className="size-4" aria-hidden />
          )}
          Chercher les lieux à attribuer
        </Button>

        {lieux ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {lieux.length} lieu{lieux.length > 1 ? "x" : ""} trouvé{lieux.length > 1 ? "s" : ""}.
              Cochez ceux à confier au modérateur.
            </p>
            {lieux.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                Aucun lieu à vérifier dans ce rayon (ou tous déjà attribués).
              </p>
            ) : (
              <ul className="space-y-1.5">
                {lieux.map((l) => {
                  const coche = selection.has(l.id);
                  return (
                    <li
                      key={l.id}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => basculerSelection(l.id)}
                        className={
                          coche
                            ? "flex size-5 items-center justify-center rounded bg-primary text-primary-foreground"
                            : "size-5 rounded border border-border"
                        }
                        aria-label={`Sélectionner ${l.nom}`}
                      >
                        {coche ? <Check className="size-3" aria-hidden /> : null}
                      </button>
                      <div className="flex-1">
                        <p className="text-sm text-card-foreground">{l.nom}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.categorie_nom ?? "Sans catégorie"}
                          {l.quartier ? ` · ${l.quartier}` : ""}
                          {l.distance_m !== null ? ` · ${l.distance_m} m` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button
              type="button"
              variant="terrain"
              size="sm"
              onClick={onCreerLot}
              disabled={creation || selection.size === 0}
            >
              {creation ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )}
              Attribuer {selection.size} lieu{selection.size > 1 ? "x" : ""}
            </Button>
          </div>
        ) : null}

        {erreur ? <p className="text-xs text-destructive">{erreur}</p> : null}
        {succes ? <p className="text-xs text-primary">{succes}</p> : null}
      </section>

      <p className="mt-6 text-sm font-medium text-muted-foreground">
        Lots attribués ({(lots.data ?? []).length})
      </p>
      <div className="mt-2 space-y-2">
        {(lots.data ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
            Aucun lot pour l'instant.
          </p>
        ) : (
          (lots.data ?? []).map((lot) => (
            <div
              key={lot.id}
              className="rounded-lg border border-border bg-card px-3 py-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-card-foreground">{lot.nom}</p>
                <p className="text-xs text-muted-foreground">
                  {lot.valides}✓ · {lot.refuses}✕ · {lot.restants} restant
                  {lot.restants > 1 ? "s" : ""}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {lot.moderateur_nom ?? "Modérateur"} · rayon {lot.rayon_m >= 1000 ? `${lot.rayon_m / 1000} km` : `${lot.rayon_m} m`} · {lot.total} lieu
                {lot.total > 1 ? "x" : ""}
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${
                      lot.total === 0 ? 0 : Math.round(((lot.total - lot.restants) / lot.total) * 100)
                    }%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </AdminShell>
  );
}
