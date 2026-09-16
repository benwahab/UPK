import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LocateFixed, Mic, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CarteLieu } from "@/components/upk/CarteLieu";
import { BasculeTheme } from "@/components/upk/BasculeTheme";
import { BoutonEspaceAdmin } from "@/components/upk/BoutonEspaceAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trouverCategorieParBesoin } from "@/lib/besoins";
import {
  listerCategories,
  listerRegionsRecherche,
  listerVillesRecherche,
  rechercherLieuxNational,
} from "@/lib/places.functions";
import { useRechercheVocale } from "@/lib/useRechercheVocale";

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
  const rechercheVocale = useRechercheVocale((texte) => {
    setSaisie(texte);
    setRequete(texte);
  });
  const [requete, setRequete] = useState("");
  const [categorieSlug, setCategorieSlugBrut] = useState<string | null>(null);
  const [regionSlug, setRegionSlug] = useState<string | null>(null);
  const [villeSlug, setVilleSlug] = useState<string | null>(null);
  const [quartier, setQuartier] = useState("");
  const [suggestionBesoin, setSuggestionBesoin] = useState<string | null>(null);
  const categorieChoisieManuellement = useRef(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [etatGeo, setEtatGeo] = useState<"inconnu" | "chargement" | "refuse" | "ok">("inconnu");

  const chargerCategories = useServerFn(listerCategories);
  const chercher = useServerFn(rechercherLieuxNational);
  const chargerRegions = useServerFn(listerRegionsRecherche);
  const chargerVilles = useServerFn(listerVillesRecherche);

  // Choix manuel d'une catégorie (chip ou "Tout") : l'utilisateur reprend la
  // main, on arrête de lui proposer des suggestions automatiques tant qu'il
  // ne retape pas une nouvelle requête.
  function setCategorieSlug(slug: string | null) {
    categorieChoisieManuellement.current = true;
    setSuggestionBesoin(null);
    setCategorieSlugBrut(slug);
  }

  useEffect(() => {
    const t = setTimeout(() => setRequete(saisie), 350);
    if (saisie.trim() === "") categorieChoisieManuellement.current = false;
    return () => clearTimeout(t);
  }, [saisie]);

  // Recherche par besoin (section 29) : si la requête ressemble à un besoin
  // connu ("je veux manger", "voiture en panne"...), on suggère la
  // catégorie correspondante — sauf si l'utilisateur a déjà choisi la
  // sienne pour cette recherche.
  useEffect(() => {
    if (categorieChoisieManuellement.current) return;
    const suggestion = trouverCategorieParBesoin(requete);
    setSuggestionBesoin(suggestion);
    setCategorieSlugBrut(suggestion);
  }, [requete]);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => chargerCategories(),
    staleTime: 1000 * 60 * 30,
  });

  // Une recherche n'est "active" que si l'utilisateur a tapé quelque chose
  // ou choisi une catégorie — l'écran d'accueil reste volontairement vide
  // tant qu'aucune intention n'a été exprimée.
  const rechercheActive =
    saisie.trim().length > 0 ||
    categorieSlug !== null ||
    regionSlug !== null ||
    villeSlug !== null ||
    quartier.trim().length > 0;

  const resultats = useQuery({
    queryKey: [
      "lieux",
      requete,
      categorieSlug,
      regionSlug,
      villeSlug,
      quartier,
      suggestionBesoin,
      position?.lat ?? null,
      position?.lng ?? null,
    ],
    queryFn: () =>
      chercher({
        data: {
          requete: suggestionBesoin ? null : requete || null,
          categorieSlug,
          regionSlug,
          villeSlug,
          quartier: quartier || null,
          lat: position?.lat ?? null,
          lng: position?.lng ?? null,
        },
      }),
    enabled: rechercheActive,
  });

  const regions = useQuery({
    queryKey: ["regions-recherche"],
    queryFn: () => chargerRegions(),
    staleTime: 1000 * 60 * 60,
  });

  const villes = useQuery({
    queryKey: ["villes-recherche"],
    queryFn: () => chargerVilles(),
    staleTime: 1000 * 60 * 60,
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
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-16">
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-3">
          <Link
            to="/pro"
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            Espace pro
          </Link>
          <Link
            to="/proposer"
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            Proposer un lieu
          </Link>
          <Link
            to="/garde"
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            Pharmacies de garde
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <BoutonEspaceAdmin />
          <BasculeTheme />
        </div>
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
            className={
              rechercheVocale.disponible
                ? "h-13 rounded-xl pr-12 pl-10 text-base"
                : "h-13 rounded-xl pl-10 text-base"
            }
          />
          {rechercheVocale.disponible ? (
            <button
              type="button"
              onClick={
                rechercheVocale.enEcoute ? rechercheVocale.arreter : rechercheVocale.demarrer
              }
              aria-label={rechercheVocale.enEcoute ? "Arrêter l'écoute" : "Rechercher à la voix"}
              aria-pressed={rechercheVocale.enEcoute}
              className={
                rechercheVocale.enEcoute
                  ? "absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  : "absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }
            >
              <Mic className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        {rechercheVocale.enEcoute ? (
          <p className="mt-1.5 text-xs text-muted-foreground">Je vous écoute…</p>
        ) : null}
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

          {suggestionBesoin ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Compris : recherche dans «{" "}
              {categories.data?.find((c) => c.slug === suggestionBesoin)?.nom ?? suggestionBesoin}{" "}
              ».{" "}
              <button
                type="button"
                onClick={() => setCategorieSlug(null)}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Chercher partout à la place
              </button>
            </p>
          ) : null}

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

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="sr-only" htmlFor="filtre-region">
              Région
            </label>
            <select
              id="filtre-region"
              value={regionSlug ?? ""}
              onChange={(e) => setRegionSlug(e.target.value || null)}
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-card-foreground"
            >
              <option value="">Toutes les régions</option>
              {(regions.data ?? []).map((region) => (
                <option key={region.id} value={region.slug}>
                  {region.nom}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="filtre-ville">
              Ville
            </label>
            <select
              id="filtre-ville"
              value={villeSlug ?? ""}
              onChange={(e) => setVilleSlug(e.target.value || null)}
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-card-foreground"
            >
              <option value="">Toutes les villes</option>
              {(villes.data ?? []).map((ville) => (
                <option key={ville.id} value={ville.slug}>
                  {ville.nom}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="filtre-quartier">
              Quartier
            </label>
            <Input
              id="filtre-quartier"
              value={quartier}
              onChange={(e) => setQuartier(e.target.value)}
              placeholder="Quartier"
              className="h-10"
            />
          </div>

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

      <footer className="mt-auto border-t border-border pt-6 pb-2">
        <nav aria-label="Liens du site" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <Link
            to="/a-propos"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            À propos
          </Link>
          <Link
            to="/contact"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Nous contacter
          </Link>
          <Link
            to="/politique-confidentialite"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Politique de confidentialité
          </Link>
          <Link
            to="/conditions-utilisation"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Conditions d'utilisation
          </Link>
        </nav>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} UPK — Votre guide local
        </p>
      </footer>
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
