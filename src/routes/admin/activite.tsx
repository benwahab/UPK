import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { AdminShell } from "@/components/upk/AdminShell";
import { listerJournalAdmin } from "@/lib/autorisations.functions";
import { peut } from "@/lib/autorisations";
import { useAutorisations } from "@/lib/useAutorisations";

export const Route = createFileRoute("/admin/activite")({
  head: () => ({ meta: [{ title: "Activité des administrateurs — UPK Admin" }] }),
  component: PageActivite,
});

const SECTIONS = [
  { valeur: "", label: "Toutes les sections" },
  { valeur: "authentification", label: "Connexions" },
  { valeur: "validation_lieux", label: "Validation des lieux" },
  { valeur: "etablissements", label: "Établissements" },
  { valeur: "comptes", label: "Comptes" },
  { valeur: "moderateurs", label: "Modérateurs" },
  { valeur: "parametres", label: "Paramètres" },
] as const;

const PERIODES = [
  { valeur: "", label: "Depuis toujours" },
  { valeur: "1", label: "Dernières 24 h" },
  { valeur: "7", label: "7 derniers jours" },
  { valeur: "30", label: "30 derniers jours" },
] as const;

function PageActivite() {
  const navigate = useNavigate();
  const { autorisations, utilisateur, chargement } = useAutorisations();
  const charger = useServerFn(listerJournalAdmin);
  const [section, setSection] = useState("");
  const [periode, setPeriode] = useState("");

  const autorise = peut(autorisations, "activite");

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
    if (!chargement && utilisateur && !autorise) navigate({ to: "/admin" });
  }, [chargement, utilisateur, autorise, navigate]);

  const journal = useQuery({
    queryKey: ["journal-admin", section, periode],
    queryFn: () => {
      const depuis = periode
        ? new Date(Date.now() - Number(periode) * 86_400_000).toISOString()
        : undefined;
      return charger({
        data: { ...(section ? { section } : {}), ...(depuis ? { depuis } : {}), limite: 200 },
      });
    },
    enabled: autorise,
  });

  if (chargement || !autorise) {
    return (
      <AdminShell>
        <p className="py-16 text-center text-sm text-muted-foreground">Chargement…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h1 className="font-display text-xl font-semibold text-foreground">
        Activité des administrateurs
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Journal en écriture seule : qui a fait quoi, quand et sur quelle donnée.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          aria-label="Filtrer par section"
          className="h-10 rounded-lg border border-border bg-card px-3 text-xs text-card-foreground"
        >
          {SECTIONS.map((s) => (
            <option key={s.valeur} value={s.valeur}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={periode}
          onChange={(e) => setPeriode(e.target.value)}
          aria-label="Filtrer par période"
          className="h-10 rounded-lg border border-border bg-card px-3 text-xs text-card-foreground"
        >
          {PERIODES.map((p) => (
            <option key={p.valeur} value={p.valeur}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {journal.isPending ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Chargement du journal…</p>
      ) : (journal.data ?? []).length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Aucune action enregistrée pour ces filtres.
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {(journal.data ?? []).map((ligne) => (
            <li key={ligne.id} className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-card-foreground">{ligne.action}</p>
                <span
                  className={
                    ligne.resultat === "succes"
                      ? "rounded-full bg-[oklch(0.93_0.05_165)] px-2 py-0.5 text-[10px] font-medium text-[oklch(0.4_0.11_165)]"
                      : "rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive"
                  }
                >
                  {ligne.resultat}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {ligne.acteur_nom ?? "Compte inconnu"} · {ligne.acteur_role} · {ligne.section}
              </p>
              {ligne.cible_libelle ? (
                <p className="text-xs text-muted-foreground">Élément : {ligne.cible_libelle}</p>
              ) : null}
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {new Date(ligne.created_at).toLocaleString("fr-FR")}
              </p>
              {ligne.avant || ligne.apres ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-admin-primary">
                    Voir avant / après
                  </summary>
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-muted p-2 text-[10px] text-muted-foreground">
                    {JSON.stringify({ avant: ligne.avant, apres: ligne.apres }, null, 2)}
                  </pre>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
