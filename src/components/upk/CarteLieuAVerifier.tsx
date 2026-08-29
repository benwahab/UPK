import { Link } from "@tanstack/react-router";
import { Check, Copy, LocateFixed, Navigation, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { CandidatDoublon } from "@/lib/signalements.functions";
import type { Lieu } from "@/lib/upk";
import { lienItineraire } from "@/lib/upk";

// Doit correspondre au seuil serveur (moderation.functions.ts) — la valeur
// affichée ici n'est qu'une prévisualisation ; c'est le serveur qui
// tranche réellement, pour ne pas pouvoir être contourné.
const DISTANCE_MAX_METRES = 20;

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

export function CarteLieuAVerifier({
  lieu,
  onValider,
  onRejeter,
  chercherDoublons,
}: {
  lieu: Lieu;
  onValider: (coords: { latitude: number; longitude: number }) => Promise<void> | void;
  onRejeter: (coords: { latitude: number; longitude: number }) => Promise<void> | void;
  chercherDoublons?: (placeId: string) => Promise<CandidatDoublon[]>;
}) {
  const [etatGeo, setEtatGeo] = useState<"inconnu" | "chargement" | "refuse" | "trop_loin" | "ok">(
    "inconnu",
  );
  const [distance, setDistance] = useState<number | null>(null);
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [enCours, setEnCours] = useState(false);

  const [doublons, setDoublons] = useState<CandidatDoublon[] | null>(null);
  const [rechercheDoublons, setRechercheDoublons] = useState(false);

  function verifierPosition() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setEtatGeo("refuse");
      return;
    }
    setEtatGeo("chargement");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const d = distanceMetres(
          pos.coords.latitude,
          pos.coords.longitude,
          lieu.latitude,
          lieu.longitude,
        );
        setDistance(d);
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setEtatGeo(d <= DISTANCE_MAX_METRES ? "ok" : "trop_loin");
      },
      () => setEtatGeo("refuse"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function onVerifierDoublons() {
    if (!chercherDoublons) return;
    setRechercheDoublons(true);
    try {
      setDoublons(await chercherDoublons(lieu.id));
    } finally {
      setRechercheDoublons(false);
    }
  }

  async function agir(
    action: (coords: { latitude: number; longitude: number }) => Promise<void> | void,
  ) {
    if (!position) return;
    setEnCours(true);
    try {
      await action(position);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-medium text-card-foreground">{lieu.nom}</p>
      <p className="text-sm text-muted-foreground">
        {lieu.categorie_nom}
        {lieu.quartier ? ` · ${lieu.quartier}` : ""}
      </p>
      {lieu.adresse ? <p className="mt-1 text-xs text-muted-foreground">{lieu.adresse}</p> : null}
      {lieu.telephone ? (
        <p className="mt-1 text-xs text-muted-foreground">{lieu.telephone}</p>
      ) : null}

      <Link
        to="/lieu/$id"
        params={{ id: lieu.id }}
        className="mt-2 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        Voir la fiche et les photos
      </Link>

      <div className="mt-3 rounded-lg border border-dashed border-border p-3">
        <p className="text-xs text-muted-foreground">
          Déplacement obligatoire sur place avant de valider ou rejeter.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href={lienItineraire(lieu.latitude, lieu.longitude)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-foreground"
          >
            <Navigation className="size-3.5" aria-hidden />
            Itinéraire
          </a>
          <Button
            type="button"
            variant="terrain"
            size="sm"
            className="h-8"
            onClick={verifierPosition}
            disabled={etatGeo === "chargement"}
          >
            <LocateFixed className="size-3.5" aria-hidden />
            {etatGeo === "chargement" ? "Localisation…" : "Vérifier ma position"}
          </Button>
        </div>
        {etatGeo === "ok" && distance !== null ? (
          <p className="mt-2 text-xs text-primary">
            ✓ Position confirmée ({Math.round(distance)} m)
          </p>
        ) : null}
        {etatGeo === "trop_loin" && distance !== null ? (
          <p className="mt-2 text-xs text-destructive">
            Vous êtes à {Math.round(distance)} m du lieu ({DISTANCE_MAX_METRES} m maximum).
            Rapprochez-vous.
          </p>
        ) : null}
        {etatGeo === "refuse" ? (
          <p className="mt-2 text-xs text-destructive">
            Position indisponible. Autorisez la géolocalisation puis réessayez.
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="terrain"
          size="sm"
          className="flex-1"
          disabled={etatGeo !== "ok" || enCours}
          onClick={() => agir(onValider)}
        >
          <Check className="size-4" aria-hidden />
          Valider
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={etatGeo !== "ok" || enCours}
          onClick={() => agir(onRejeter)}
        >
          <X className="size-4" aria-hidden />
          Rejeter
        </Button>
      </div>

      {chercherDoublons ? (
        doublons === null ? (
          <button
            type="button"
            onClick={onVerifierDoublons}
            disabled={rechercheDoublons}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            <Copy className="size-3.5" aria-hidden />
            {rechercheDoublons ? "Recherche…" : "Vérifier les doublons"}
          </button>
        ) : doublons.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Aucun doublon potentiel détecté.</p>
        ) : (
          <div className="mt-2 rounded-lg bg-secondary p-2.5">
            <p className="text-xs font-medium text-secondary-foreground">
              {doublons.length} doublon{doublons.length > 1 ? "s" : ""} potentiel
              {doublons.length > 1 ? "s" : ""} :
            </p>
            <ul className="mt-1 space-y-1">
              {doublons.map((d) => (
                <li key={d.place_id} className="text-xs text-muted-foreground">
                  <Link
                    to="/lieu/$id"
                    params={{ id: d.place_id }}
                    className="underline-offset-2 hover:underline"
                  >
                    {d.nom}
                  </Link>
                  {d.quartier ? ` · ${d.quartier}` : ""}
                  {d.meme_telephone ? " · même téléphone" : ""}
                  {d.distance_m !== null ? ` · ${d.distance_m}m` : ""}
                </li>
              ))}
            </ul>
          </div>
        )
      ) : null}
    </div>
  );
}
