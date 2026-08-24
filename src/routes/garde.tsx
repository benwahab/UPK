import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Navigation, Phone } from "lucide-react";

import { listerPharmaciesDeGarde } from "@/lib/places.functions";
import { lienItineraire, telAffiche } from "@/lib/upk";

const optionsGarde = queryOptions({
  queryKey: ["pharmacies-de-garde"],
  queryFn: () => listerPharmaciesDeGarde(),
});

export const Route = createFileRoute("/garde")({
  head: () => ({ meta: [{ title: "Pharmacies de garde aujourd'hui — UPK" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(optionsGarde),
  component: PageGarde,
});

function PageGarde() {
  const { data: pharmacies } = useSuspenseQuery(optionsGarde);

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="pt-6">
        <Link to="/" className="text-sm font-medium text-primary">
          ← Retour à la recherche
        </Link>
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">
        Pharmacies de garde aujourd'hui
      </h1>

      <section className="mt-5 space-y-3">
        {pharmacies.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Aucune pharmacie de garde enregistrée pour aujourd'hui sur UPK.
          </p>
        ) : (
          pharmacies.map((p) => (
            <div key={p.place_id} className="rounded-xl border border-border bg-card p-4">
              <p className="font-medium text-card-foreground">{p.nom}</p>
              <p className="text-sm text-muted-foreground">
                {p.quartier ?? ""}
                {p.horaires ? ` · ${p.horaires}` : ""}
              </p>
              <div className="mt-3 flex gap-2">
                <a
                  href={lienItineraire(p.latitude, p.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent text-sm font-medium text-accent-foreground"
                >
                  <Navigation className="size-4" aria-hidden />
                  Itinéraire
                </a>
                {p.telephone ? (
                  <a
                    href={`tel:${p.telephone}`}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border text-sm font-medium text-foreground"
                  >
                    <Phone className="size-4" aria-hidden />
                    {telAffiche(p.telephone)}
                  </a>
                ) : null}
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
