import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LocateFixed, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CarteLieu } from "@/components/upk/CarteLieu";
import { BasculeTheme } from "@/components/upk/BasculeTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listerCategories, rechercherLieux } from "@/lib/places.functions";

const TITRE = "UPK — Recherche locale au Niger";
const DESCRIPTION =
  "Dis-moi ce que tu cherches. UPK trouve où le trouver : pharmacies, restaurants, garages, hôtels et écoles près de vous au Niger.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITRE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITRE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: PageRecherche,
});

type Position = { lat: number; lng: number };

function PageRecherche() {
  const [saisie, setSaisie] = useState("");
  const [requete, setRequete] = useState("");
  const [categorieSlug, setCategorieSlug] = useState<string | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [etatGeo, setEtatGeo] = useState<"inconnu" | "chargement" | "refuse" | "ok">("inconnu");

  const chargerCategories = useServerFn(listerCategories);
  const chercher = useServerFn(rechercherLieux);

  useEffect(() => {
    const t = setTimeout(() => setRequete(saisie), 350);
    return () => clearTimeout(t);
  }, [saisie]);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => chargerCategories(),
    staleTime: 1000 * 60 * 30,
  });

  // Une recherche n'est "active" que si l'utilisateur a tapé quelque chose
  // ou choisi une catégorie — l'écran d'accueil reste volontairement vide
  // tant qu'aucune intention n'a été exprimée.
  const rechercheActive = saisie.trim().length > 0 || categorieSlug !== null;

  const resultats = useQuery({
    queryKey: ["lieux", requete, categorieSlug, position?.lat ?? null, position?.lng ?? null],
    queryFn: () =>
      chercher({
        data: {
          requete: requete || null,
          categorieSlug,
          lat: position?.lat ?? null,
          lng: position?.lng ?? null,
        },
      }),
    enabled: rechercheActive,
  });

  const lieux = useMemo(() => resultats.data ?? [], [resultats.data]);

  function demanderPosition() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setEtatGeo("refuse");
      return;
    }
    setEtatGeo("chargement");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setEtatGeo("ok");
      },
      () => setEtatGeo("refuse"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="flex items-center justify-between pt-4">
        <Link to="/pro" className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline">
          Espace pro
        </Link>
        <BasculeTheme />
      </div>

      <header
        className={
          rechercheActive
            ? "pt-4 pb-5 text-center transition-all"
            : "flex min-h-[38vh] flex-col items-center justify-center pt-4 pb-5 text-center transition-all"
        }
      >
        <img
          src="/logo/upk-logo.png"
          alt="UPK"
          className={rechercheActive ? "h-16 w-16" : "h-28 w-28"}
        />
        <h1 className="mt-3 font-display text-lg leading-snug font-semibold text-foreground">
          Votre guide local
        </h1>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setRequete(saisie);
        }}
        role="search"
        className={
          rechercheActive
            ? "sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-3 backdrop-blur"
            : "px-0 py-3"
        }
      >
        <label htmlFor="recherche" className="sr-only">
          Que recherchez-vous ?
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="recherche"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="Que recherchez-vous ?"
            inputMode="search"
            autoComplete="off"
            className="h-13 rounded-xl pl-10 text-base"
          />
        </div>
      </form>

      {rechercheActive ? (
        <>
          <section className="mt-1" aria-label="Position">
            {etatGeo !== "ok" ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-3">
                <p className="text-sm text-muted-foreground">
                  Autorisez la localisation pour trier les résultats du plus proche au plus loin.
                  Sans position, aucune distance n'est affichée.
                </p>
                <Button
                  type="button"
                  variant="terrain"
                  size="sm"
                  className="mt-2"
                  onClick={demanderPosition}
                  disabled={etatGeo === "chargement"}
                >
                  <LocateFixed className="size-4" aria-hidden />
                  {etatGeo === "chargement" ? "Localisation…" : "Utiliser ma position"}
                </Button>
                {etatGeo === "refuse" ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Position indisponible. Les résultats restent consultables, sans distance.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Position activée — résultats triés par proximité.
              </p>
            )}
          </section>

          <nav aria-label="Filtrer par catégorie" className="mt-4 -mx-4 overflow-x-auto px-4">
            <ul className="flex w-max gap-2 pb-1">
              <li>
                <FiltreBouton
                  actif={categorieSlug === null}
                  onClick={() => setCategorieSlug(null)}
                  libelle="Tout"
                />
              </li>
              {(categories.data ?? []).map((c) => (
                <li key={c.id}>
                  <FiltreBouton
                    actif={categorieSlug === c.slug}
                    onClick={() => setCategorieSlug(c.slug)}
                    libelle={c.nom}
                  />
                </li>
              ))}
            </ul>
          </nav>

          <section className="mt-4 space-y-3" aria-live="polite">
            {resultats.isPending ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Recherche en cours…</p>
            ) : resultats.isError ? (
              <p className="py-8 text-center text-sm text-destructive">
                La recherche a échoué. Vérifiez votre connexion et réessayez.
              </p>
            ) : lieux.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucun lieu trouvé pour cette recherche.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {lieux.length} résultat{lieux.length > 1 ? "s" : ""}
                </p>
                {lieux.map((lieu) => (
                  <CarteLieu key={lieu.id} lieu={lieu} />
                ))}
              </>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}

function FiltreBouton({
  actif,
  onClick,
  libelle,
}: {
  actif: boolean;
  onClick: () => void;
  libelle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={
        actif
          ? "rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground"
          : "rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-card-foreground"
      }
    >
      {libelle}
    </button>
  );
}
