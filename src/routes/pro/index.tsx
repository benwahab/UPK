import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Shield } from "lucide-react";
import { useEffect, useState } from "react";

import { BadgeVerification } from "@/components/upk/BadgeVerification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { listerMesLieux } from "@/lib/business.functions";
import {
  completerProfilModeration,
  demanderModeration,
  monProfil,
  monStatutModeration,
} from "@/lib/moderateurs.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/pro/")({
  head: () => ({ meta: [{ title: "Mes établissements — UPK Business" }] }),
  component: PageDashboardPro,
});

function PageDashboardPro() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const queryClient = useQueryClient();
  const chercherMesLieux = useServerFn(listerMesLieux);
  const chercherStatutModeration = useServerFn(monStatutModeration);
  const chercherMonProfil = useServerFn(monProfil);
  const completerProfil = useServerFn(completerProfilModeration);
  const demander = useServerFn(demanderModeration);

  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
  }, [chargement, utilisateur, navigate]);

  const mesLieux = useQuery({
    queryKey: ["mes-lieux", utilisateur?.id],
    queryFn: () => chercherMesLieux(),
    enabled: !!utilisateur,
  });

  const statutModeration = useQuery({
    queryKey: ["mon-statut-moderation", utilisateur?.id],
    queryFn: () => chercherStatutModeration(),
    enabled: !!utilisateur,
  });

  function ouvrirFormulaire() {
    setErreur(null);
    chercherMonProfil().then((profil) => {
      setPrenom(profil.prenom ?? "");
      setNom(profil.nomComplet ?? "");
      setTelephone(profil.telephone ?? "");
    });
    setFormulaireOuvert(true);
  }

  async function onEnvoyerDemande(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!prenom.trim() || !nom.trim() || !telephone.trim()) {
      setErreur("Prénom, nom et téléphone sont tous les trois obligatoires.");
      return;
    }
    setEnvoiEnCours(true);
    try {
      await completerProfil({
        data: { prenom: prenom.trim(), nom: nom.trim(), telephone: telephone.trim() },
      });
      await demander();
      setFormulaireOuvert(false);
      queryClient.invalidateQueries({ queryKey: ["mon-statut-moderation"] });
    } catch {
      setErreur("Impossible d'envoyer la demande. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (chargement || !utilisateur) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        Chargement…
      </main>
    );
  }

  const lieux = mesLieux.data ?? [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="pt-6">
        <Link to="/" className="text-sm font-medium text-primary">
          ← Accueil
        </Link>
      </div>
      <div className="flex items-center justify-between pt-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            UPK Business
          </p>
          <h1 className="font-display text-xl font-semibold text-foreground">Mes établissements</h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/" });
          }}
        >
          Déconnexion
        </Button>
      </div>

      <Button asChild variant="terrain" className="mt-5 w-full">
        <Link to="/pro/nouveau">
          <Plus className="size-4" aria-hidden />
          Ajouter un établissement
        </Link>
      </Button>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-card-foreground">Vérification des lieux</p>
        </div>
        {statutModeration.data?.role === "moderator" || statutModeration.data?.role === "admin" ? (
          <Link to="/pro/moderation" className="mt-2 inline-block text-sm font-medium text-primary">
            Voir les lieux à vérifier →
          </Link>
        ) : statutModeration.data?.demandeEnAttente ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Votre demande est en attente de validation par un administrateur.
          </p>
        ) : formulaireOuvert ? (
          <form onSubmit={onEnvoyerDemande} className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Prénom, nom et téléphone sont nécessaires pour qu'un administrateur puisse vous
              identifier et vous contacter.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="prenom-mod">Prénom</Label>
                <Input id="prenom-mod" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nom-mod">Nom</Label>
                <Input id="nom-mod" value={nom} onChange={(e) => setNom(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="telephone-mod">Téléphone</Label>
              <Input
                id="telephone-mod"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
              />
            </div>
            {erreur ? <p className="text-sm text-destructive">{erreur}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" variant="terrain" size="sm" disabled={envoiEnCours}>
                {envoiEnCours ? "Envoi…" : "Envoyer la demande"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFormulaireOuvert(false)}
              >
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="mt-1 space-y-1.5 text-sm text-muted-foreground">
              <p>Ce que fait un modérateur sur UPK :</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Voir la liste des lieux proposés en attente de vérification</li>
                <li>
                  Se déplacer physiquement sur place — la validation n'est possible qu'une fois
                  votre position confirmée à moins de 20 m du lieu (vérifié par GPS)
                </li>
                <li>Valider le lieu s'il existe bien, ou le rejeter sinon</li>
              </ul>
              <p>
                Votre demande sera examinée par un administrateur, qui peut aussi retirer ce rôle à
                tout moment.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={ouvrirFormulaire}
            >
              Devenir modérateur
            </Button>
          </>
        )}
      </div>

      <section className="mt-6 space-y-3" aria-live="polite">
        {mesLieux.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : lieux.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Vous n'avez pas encore d'établissement. Ajoutez-en un pour apparaître dans la recherche
            UPK.
          </p>
        ) : (
          lieux.map((lieu) => (
            <Link
              key={lieu.id}
              to="/pro/$id"
              params={{ id: lieu.id }}
              className="block rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-card-foreground">{lieu.nom}</p>
                  <p className="text-sm text-muted-foreground">
                    {lieu.categorie_nom}
                    {lieu.quartier ? ` · ${lieu.quartier}` : ""}
                  </p>
                </div>
                <BadgeVerification statut={lieu.statut_verification} />
              </div>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
