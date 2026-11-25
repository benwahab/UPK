import { Link } from "@tanstack/react-router";
import { Navigation, Phone } from "lucide-react";

import { BadgeVerification } from "./BadgeVerification";
import { Button } from "@/components/ui/button";
import { formaterDistance, lienItineraire, telAffiche, type Lieu } from "@/lib/upk";

export function CarteLieu({ lieu }: { lieu: Lieu }) {
  const distance = formaterDistance(lieu.distance_m);

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-card-foreground">
            <Link to="/lieu/$id" params={{ id: lieu.id }} className="hover:underline">
              {lieu.nom}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {lieu.categorie_nom ?? "Lieu"}
            {lieu.quartier ? ` · ${lieu.quartier}` : ""}
          </p>
        </div>
        {distance ? (
          <span className="shrink-0 rounded-lg bg-accent px-2 py-1 text-sm font-semibold text-accent-foreground dark:bg-primary/15 dark:text-primary">
            {distance}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <BadgeVerification statut={lieu.statut_verification} />
        {lieu.telephone ? (
          <a
            href={`tel:${lieu.telephone}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
          >
            <Phone className="size-4" aria-hidden />
            {telAffiche(lieu.telephone)}
          </a>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <Button asChild size="sm" variant="terrain" className="flex-1">
          <a href={lienItineraire(lieu.latitude, lieu.longitude)} target="_blank" rel="noreferrer">
            <Navigation className="size-4" aria-hidden />
            Itinéraire
          </a>
        </Button>
        {lieu.estLocalite ? (
          <span className="flex flex-1 items-center justify-center rounded-md border border-border px-3 text-center text-xs text-muted-foreground">
            Résultat géographique
          </span>
        ) : (
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link to="/lieu/$id" params={{ id: lieu.id }}>
              Détails
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}
