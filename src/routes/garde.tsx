import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LocateFixed, Navigation, Phone } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { listerPharmaciesDeGarde } from "@/lib/places.functions";
import { formaterDistance, lienItineraire, telAffiche } from "@/lib/upk";

const optionsGarde = queryOptions({
  queryKey: ["pharmacies-de-garde"],
  queryFn: () => listerPharmaciesDeGarde(),
});

export const Route = createFileRoute("/garde")({
  head: () => ({ meta: [{ title: "Pharmacies de garde aujourd'hui — UPK" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(optionsGarde),
  component: PageGarde,
});

function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function PageGarde() {
  const { data: pharmacies } = useSuspenseQuery(optionsGarde);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [etatGeo, setEtatGeo] = useState<"inconnu" | "chargement" | "refuse" | "ok">("inconnu");

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

  const pharmaciesTriees = useMemo(() => {
    if (!position) return pharmacies.map((p) => ({ ...p, distance_m: null as number | null }));
    return pharmacies
      .map((p) => ({
        ...p,
        distance_m: distanceMetres(position.lat, position.lng, p.latitude, p.longitude),
      }))
      .sort((a, b) => a.distance_m - b.distance_m);
  }, [pharmacies, position]);

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

      {etatGeo !== "ok" ? (
        <div className="mt-3 rounded-xl border border-dashed border-border bg-card p-3">
          <p className="text-sm text-muted-foreground">
            Autorisez la localisation pour trier les pharmacies de la plus proche à la plus
            éloignée.
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
            <p className="mt-2 text-xs text-destructive">
              Position indisponible. La liste reste consultable, sans tri par proximité.
            </p>
          ) : null}
        </div>
      ) : null}

      <section className="mt-5 space-y-3">
        {pharmaciesTriees.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Aucune pharmacie de garde enregistrée pour aujourd'hui sur UPK.
          </p>
        ) : (
          pharmaciesTriees.map((p) => (
            <div key={p.place_id} className="rounded-xl border border-border bg-card p-4">
              <p className="font-medium text-card-foreground">{p.nom}</p>
              <p className="text-sm text-muted-foreground">
                {p.quartier ?? ""}
                {p.horaires ? ` · ${p.horaires}` : ""}
                {formaterDistance(p.distance_m) ? ` · ${formaterDistance(p.distance_m)}` : ""}
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
