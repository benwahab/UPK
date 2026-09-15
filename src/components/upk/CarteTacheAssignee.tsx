import { Link } from "@tanstack/react-router";
import { Check, LocateFixed, Navigation, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { LieuAssigne } from "@/lib/assignations.functions";
import { lienItineraire } from "@/lib/upk";

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

/**
 * Une tâche attribuée à un modérateur. Validation : présence sur place.
 * Rejet : motif + confirmation de la bonne localité relevée sur le terrain.
 */
export function CarteTacheAssignee({
  lieu,
  onValider,
  onRejeter,
}: {
  lieu: LieuAssigne;
  onValider: (coords: { latitude: number; longitude: number }) => Promise<void>;
  onRejeter: (donnees: {
    motif: string;
    latitudeCorrigee: number;
    longitudeCorrigee: number;
  }) => Promise<void>;
}) {
  const [etatGeo, setEtatGeo] = useState<"inconnu" | "chargement" | "refuse" | "ok">("inconnu");
  const [distance, setDistance] = useState<number | null>(null);
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const [modeRejet, setModeRejet] = useState(false);
  const [motif, setMotif] = useState("");

  function releverPosition() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setEtatGeo("refuse");
      return;
    }
    setEtatGeo("chargement");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setDistance(
          distanceMetres(
            pos.coords.latitude,
            pos.coords.longitude,
            lieu.latitude,
            lieu.longitude,
          ),
        );
        setEtatGeo("ok");
      },
      () => setEtatGeo("refuse"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const surPlace = etatGeo === "ok" && distance !== null && distance <= DISTANCE_MAX_METRES;

  async function agir(action: () => Promise<void>) {
    setEnCours(true);
    setErreur(null);
    try {
      await action();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible pour l'instant.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {lieu.lot_nom}
      </p>
      <p className="mt-0.5 font-medium text-card-foreground">{lieu.nom}</p>
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
          Rendez-vous sur place, puis relevez votre position : elle sert à confirmer la présence ou,
          en cas de rejet, à enregistrer la bonne localité.
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
            onClick={releverPosition}
            disabled={etatGeo === "chargement"}
          >
            <LocateFixed className="size-3.5" aria-hidden />
            {etatGeo === "chargement" ? "Localisation…" : "Relever ma position"}
          </Button>
        </div>
        {etatGeo === "ok" && distance !== null ? (
          <p className={`mt-2 text-xs ${surPlace ? "text-primary" : "text-destructive"}`}>
            Position relevée à {Math.round(distance)} m du point enregistré.
            {surPlace
              ? " ✓ Présence confirmée."
              : ` Au-delà de ${DISTANCE_MAX_METRES} m : validation impossible, mais vous pouvez rejeter en confirmant la bonne localité.`}
          </p>
        ) : null}
        {etatGeo === "refuse" ? (
          <p className="mt-2 text-xs text-destructive">
            Position indisponible. Autorisez la géolocalisation puis réessayez.
          </p>
        ) : null}
      </div>

      {modeRejet ? (
        <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
          <label htmlFor={`motif-${lieu.assignation_id}`} className="text-xs font-medium">
            Motif du rejet
          </label>
          <Textarea
            id={`motif-${lieu.assignation_id}`}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex. établissement fermé, adresse inexacte, lieu introuvable…"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {position
              ? `Bonne localité confirmée : ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}.`
              : "Relevez d'abord votre position sur place pour confirmer la bonne localité."}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="terrain"
              size="sm"
              className="flex-1"
              disabled={!position || motif.trim().length < 5 || enCours}
              onClick={() =>
                agir(() =>
                  onRejeter({
                    motif: motif.trim(),
                    latitudeCorrigee: position!.latitude,
                    longitudeCorrigee: position!.longitude,
                  }),
                )
              }
            >
              Confirmer le rejet
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModeRejet(false)}
              disabled={enCours}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="terrain"
            size="sm"
            className="flex-1"
            disabled={!surPlace || enCours}
            onClick={() => agir(() => onValider(position!))}
          >
            <Check className="size-4" aria-hidden />
            Valider
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={enCours}
            onClick={() => setModeRejet(true)}
          >
            <X className="size-4" aria-hidden />
            Rejeter
          </Button>
        </div>
      )}

      {erreur ? <p className="mt-2 text-xs text-destructive">{erreur}</p> : null}
    </div>
  );
}
