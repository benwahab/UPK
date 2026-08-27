import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  creerCategorie,
  listerCategoriesAdmin,
  modifierCategorie,
  supprimerCategorie,
} from "@/lib/categories.functions";
import { estModerateur } from "@/lib/moderation.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "Catégories — UPK Admin" }] }),
  component: PageCategories,
});

function PageCategories() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const queryClient = useQueryClient();
  const verifierRole = useServerFn(estModerateur);
  const chercherCategories = useServerFn(listerCategoriesAdmin);
  const creer = useServerFn(creerCategorie);
  const modifier = useServerFn(modifierCategorie);
  const supprimer = useServerFn(supprimerCategorie);

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
  }, [chargement, utilisateur, navigate]);

  const role = useQuery({
    queryKey: ["est-moderateur", utilisateur?.id],
    queryFn: () => verifierRole(),
    enabled: !!utilisateur,
  });

  useEffect(() => {
    if (role.data === false) navigate({ to: "/" });
  }, [role.data, navigate]);

  const categories = useQuery({
    queryKey: ["categories-admin"],
    queryFn: () => chercherCategories(),
    enabled: role.data === true,
  });

  const [nom, setNom] = useState("");
  const [icone, setIcone] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  async function onCreer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!nom.trim()) {
      setErreur("Le nom est obligatoire.");
      return;
    }
    try {
      await creer({ data: { nom: nom.trim(), icone: icone.trim() || null, parentId: null } });
      setNom("");
      setIcone("");
      queryClient.invalidateQueries({ queryKey: ["categories-admin"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch {
      setErreur("Impossible de créer cette catégorie (nom déjà utilisé ?).");
    }
  }

  async function onRenommer(id: string, nomActuel: string, icone: string | null) {
    const nouveauNom = window.prompt("Nouveau nom de la catégorie :", nomActuel);
    if (!nouveauNom || nouveauNom.trim() === nomActuel) return;
    await modifier({ data: { id, nom: nouveauNom.trim(), icone } });
    queryClient.invalidateQueries({ queryKey: ["categories-admin"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  }

  async function onSupprimer(id: string, nom: string) {
    if (
      !window.confirm(
        `Supprimer "${nom}" ? Les lieux existants ne seront pas supprimés, juste sans catégorie.`,
      )
    )
      return;
    await supprimer({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["categories-admin"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
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
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">Catégories</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ajoute, renomme ou supprime une catégorie — aucun code à modifier, ça apparaît immédiatement
        dans la recherche et les formulaires.
      </p>

      <form
        onSubmit={onCreer}
        className="mt-4 flex gap-2 rounded-xl border border-border bg-card p-4"
      >
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="nom-categorie">Nouvelle catégorie</Label>
          <Input
            id="nom-categorie"
            placeholder="Ex : Salon de coiffure"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>
        <div className="w-20 space-y-1.5">
          <Label htmlFor="icone-categorie">Icône</Label>
          <Input
            id="icone-categorie"
            placeholder="✂️"
            value={icone}
            onChange={(e) => setIcone(e.target.value)}
          />
        </div>
        <Button type="submit" variant="terrain" className="self-end">
          Ajouter
        </Button>
      </form>
      {erreur ? <p className="mt-2 text-sm text-destructive">{erreur}</p> : null}

      <ul className="mt-4 space-y-2">
        {(categories.data ?? []).map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
          >
            <button
              type="button"
              onClick={() => onRenommer(c.id, c.nom, c.icone)}
              className="flex-1 text-left text-sm font-medium text-card-foreground"
            >
              {c.icone ? `${c.icone} ` : ""}
              {c.nom}
            </button>
            <button
              type="button"
              onClick={() => onSupprimer(c.id, c.nom)}
              aria-label={`Supprimer ${c.nom}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
