import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminShell } from "@/components/upk/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  accorderRole,
  definirPermissions,
  rechercherComptes,
  retirerRole,
  suspendreAccesAdmin,
  type CompteAdmin,
} from "@/lib/autorisations.functions";
import { LIBELLES_ROLE, PERMISSIONS, peut, type RoleUpk } from "@/lib/autorisations";
import { useAutorisations } from "@/lib/useAutorisations";

export const Route = createFileRoute("/admin/comptes")({
  head: () => ({ meta: [{ title: "Comptes — UPK Admin" }] }),
  component: PageComptes,
});

const ROLES_ATTRIBUABLES: RoleUpk[] = ["moderateur", "administrateur"];

function PageComptes() {
  const navigate = useNavigate();
  const { autorisations, utilisateur, chargement } = useAutorisations();
  const queryClient = useQueryClient();
  const chercher = useServerFn(rechercherComptes);
  const [saisie, setSaisie] = useState("");
  const [recherche, setRecherche] = useState("");

  const autorise = peut(autorisations, "comptes");

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
    if (!chargement && utilisateur && !autorise) navigate({ to: "/admin" });
  }, [chargement, utilisateur, autorise, navigate]);

  const comptes = useQuery({
    queryKey: ["comptes-admin", recherche],
    queryFn: () => chercher({ data: { recherche } }),
    enabled: autorise,
  });

  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ["comptes-admin"] });

  if (chargement || !autorise) {
    return (
      <AdminShell>
        <p className="py-16 text-center text-sm text-muted-foreground">Chargement…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h1 className="font-display text-xl font-semibold text-foreground">Comptes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Rôles, permissions et suspension des accès administratifs.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setRecherche(saisie.trim());
        }}
        role="search"
        className="mt-4"
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="E-mail, nom ou téléphone"
            className="h-11 rounded-xl pl-9"
            aria-label="Rechercher un compte"
          />
        </div>
      </form>

      {comptes.isPending ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Chargement des comptes…</p>
      ) : (comptes.data ?? []).length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Aucun compte trouvé.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {(comptes.data ?? []).map((compte) => (
            <CarteCompte key={compte.id} compte={compte} surChangement={rafraichir} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}

function CarteCompte({
  compte,
  surChangement,
}: {
  compte: CompteAdmin;
  surChangement: () => void;
}) {
  const accorder = useServerFn(accorderRole);
  const retirer = useServerFn(retirerRole);
  const definir = useServerFn(definirPermissions);
  const suspendre = useServerFn(suspendreAccesAdmin);
  const [erreur, setErreur] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (action: () => Promise<unknown>) => action(),
    onSuccess: () => {
      setErreur(null);
      surChangement();
    },
    onError: (e: Error) => setErreur(e.message),
  });

  const nom =
    [compte.prenom, compte.nom_complet].filter(Boolean).join(" ").trim() ||
    compte.email ||
    "Compte sans nom";

  function basculerPermission(cle: string) {
    const suivantes = compte.permissions.includes(cle)
      ? compte.permissions.filter((p) => p !== cle)
      : [...compte.permissions, cle];
    mutation.mutate(() => definir({ data: { userId: compte.id, permissions: suivantes } }));
  }

  const staff = compte.roles.some((r) => r !== "professionnel");

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-card-foreground">{nom}</p>
      <p className="text-xs text-muted-foreground">{compte.email ?? "e-mail inconnu"}</p>
      {compte.telephone ? (
        <p className="text-xs text-muted-foreground">{compte.telephone}</p>
      ) : null}
      <p className="mt-1 text-[11px] text-muted-foreground">
        Créé le {new Date(compte.cree_le).toLocaleDateString("fr-FR")}
        {compte.admin_suspendu ? " · accès administratif suspendu" : ""}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {compte.roles.length === 0 ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            Aucun rôle
          </span>
        ) : (
          compte.roles.map((r) => (
            <span
              key={r}
              className="rounded-full bg-admin-primary-soft px-2 py-0.5 text-[11px] font-medium text-admin-primary"
            >
              {LIBELLES_ROLE[r]}
            </span>
          ))
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {ROLES_ATTRIBUABLES.map((role) =>
          compte.roles.includes(role) ? (
            <Button
              key={role}
              size="sm"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(() => retirer({ data: { userId: compte.id, role } }))}
            >
              Retirer {LIBELLES_ROLE[role].toLowerCase()}
            </Button>
          ) : (
            <Button
              key={role}
              size="sm"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(() => accorder({ data: { userId: compte.id, role } }))}
            >
              Nommer {LIBELLES_ROLE[role].toLowerCase()}
            </Button>
          ),
        )}
        {staff ? (
          <Button
            size="sm"
            variant={compte.admin_suspendu ? "default" : "destructive"}
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate(() =>
                suspendre({ data: { userId: compte.id, suspendu: !compte.admin_suspendu } }),
              )
            }
          >
            {compte.admin_suspendu ? "Réactiver l'accès" : "Suspendre l'accès"}
          </Button>
        ) : null}
      </div>

      {staff ? (
        <fieldset className="mt-4">
          <legend className="text-xs font-medium text-muted-foreground">Permissions</legend>
          <div className="mt-2 grid gap-1.5">
            {PERMISSIONS.map((p) => (
              <label key={p.cle} className="flex items-center gap-2 text-xs text-card-foreground">
                <input
                  type="checkbox"
                  checked={compte.permissions.includes(p.cle)}
                  disabled={mutation.isPending}
                  onChange={() => basculerPermission(p.cle)}
                  className="size-4 rounded border-border"
                />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {erreur ? <p className="mt-3 text-xs text-destructive">{erreur}</p> : null}
    </article>
  );
}
