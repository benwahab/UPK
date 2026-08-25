import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ajouterPlat, listerMonMenu, supprimerPlat } from "@/lib/restaurant.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/pro/$id/menu")({
  head: () => ({ meta: [{ title: "Mon menu — UPK Business" }] }),
  component: PageMenu,
});

function PageMenu() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const queryClient = useQueryClient();

  const chercherMenu = useServerFn(listerMonMenu);
  const ajouter = useServerFn(ajouterPlat);
  const supprimer = useServerFn(supprimerPlat);

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
  }, [chargement, utilisateur, navigate]);

  const menu = useQuery({
    queryKey: ["mon-menu", id],
    queryFn: () => chercherMenu({ data: { placeId: id } }),
    enabled: !!utilisateur,
  });

  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState("");
  const [prix, setPrix] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  async function onAjouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!nom.trim()) {
      setErreur("Le nom du plat est obligatoire.");
      return;
    }
    try {
      await ajouter({
        data: {
          placeId: id,
          nom: nom.trim(),
          categorie: categorie.trim() || null,
          description: null,
          prix: prix ? Number(prix) : null,
          disponible: true,
        },
      });
      setNom("");
      setCategorie("");
      setPrix("");
      queryClient.invalidateQueries({ queryKey: ["mon-menu", id] });
    } catch {
      setErreur("Impossible d'ajouter ce plat. Réessayez.");
    }
  }

  async function onSupprimer(platId: string) {
    await supprimer({ data: { id: platId, placeId: id } });
    queryClient.invalidateQueries({ queryKey: ["mon-menu", id] });
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
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">Mon menu</h1>

      <form onSubmit={onAjouter} className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="nom-plat">Nom du plat</Label>
            <Input id="nom-plat" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="categorie-plat">Catégorie (facultatif)</Label>
            <Input
              id="categorie-plat"
              placeholder="Ex : Entrée, Plat, Dessert"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prix-plat">Prix (facultatif)</Label>
          <Input id="prix-plat" type="number" min={0} value={prix} onChange={(e) => setPrix(e.target.value)} />
        </div>
        {erreur ? <p className="text-sm text-destructive">{erreur}</p> : null}
        <Button type="submit" variant="terrain" size="sm">
          Ajouter au menu
        </Button>
      </form>

      <ul className="mt-4 space-y-2">
        {(menu.data ?? []).map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-card-foreground">{p.nom}</p>
              <p className="text-xs text-muted-foreground">
                {p.categorie ?? "—"}
                {p.prix ? ` · ${p.prix} FCFA` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSupprimer(p.id)}
              aria-label={`Retirer ${p.nom}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        {menu.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun plat enregistré.</p>
        ) : null}
      </ul>
    </main>
  );
}
