import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LocateFixed } from "lucide-react";
import { useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listerCategories } from "@/lib/places.functions";

export type ValeursFormulaireLieu = {
  nom: string;
  description: string;
  categorieId: string;
  adresse: string;
  quartier: string;
  latitude: number | null;
  longitude: number | null;
  telephone: string;
  whatsapp: string;
  horaires: string;
  siteWeb: string;
};

const VALEURS_VIDES: ValeursFormulaireLieu = {
  nom: "",
  description: "",
  categorieId: "",
  adresse: "",
  quartier: "",
  latitude: null,
  longitude: null,
  telephone: "",
  whatsapp: "",
  horaires: "",
  siteWeb: "",
};

export function FormulaireLieu({
  valeursInitiales = VALEURS_VIDES,
  onEnregistrer,
  libelleBouton = "Publier mon établissement",
  apresEnregistrement,
}: {
  valeursInitiales?: ValeursFormulaireLieu;
  onEnregistrer: (valeurs: ValeursFormulaireLieu) => Promise<void>;
  libelleBouton?: string;
  /** Appelé après un enregistrement réussi. Par défaut, retourne vers /pro. */
  apresEnregistrement?: () => void;
}) {
  const navigate = useNavigate();
  const chargerCategories = useServerFn(listerCategories);
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => chargerCategories(),
    staleTime: 1000 * 60 * 30,
  });

  const [valeurs, setValeurs] = useState<ValeursFormulaireLieu>(valeursInitiales);
  const [etatGeo, setEtatGeo] = useState<"inconnu" | "chargement" | "refuse" | "ok">(
    valeursInitiales.latitude ? "ok" : "inconnu",
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  function majChamp<K extends keyof ValeursFormulaireLieu>(
    cle: K,
    valeur: ValeursFormulaireLieu[K],
  ) {
    setValeurs((v) => ({ ...v, [cle]: valeur }));
  }

  function demanderPosition() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setEtatGeo("refuse");
      return;
    }
    setEtatGeo("chargement");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        majChamp("latitude", pos.coords.latitude);
        majChamp("longitude", pos.coords.longitude);
        setEtatGeo("ok");
      },
      () => setEtatGeo("refuse"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!valeurs.categorieId) {
      setErreur("Choisissez une catégorie.");
      return;
    }
    if (valeurs.latitude === null || valeurs.longitude === null) {
      setErreur("Indiquez la position de l'établissement.");
      return;
    }
    setEnCours(true);
    try {
      await onEnregistrer(valeurs);
      if (apresEnregistrement) apresEnregistrement();
      else navigate({ to: "/pro" });
    } catch {
      setErreur("Impossible d'enregistrer. Vérifiez les champs et réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      {/* Obligatoire d'abord, comme le formulaire "Ajouter un lieu manquant" de
          Google Maps (nom, catégorie, position) — le reste est facultatif et
          replié pour ne pas décourager une contribution rapide. */}
      <div className="space-y-1.5">
        <Label htmlFor="nom">Nom de l'établissement</Label>
        <Input
          id="nom"
          required
          value={valeurs.nom}
          onChange={(e) => majChamp("nom", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="categorie">Catégorie</Label>
        <Select value={valeurs.categorieId} onValueChange={(v) => majChamp("categorieId", v)}>
          <SelectTrigger id="categorie">
            <SelectValue placeholder="Choisir une catégorie" />
          </SelectTrigger>
          <SelectContent>
            {(categories.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card p-3">
        <p className="text-sm text-muted-foreground">
          {etatGeo === "ok"
            ? "Position enregistrée."
            : "Position obligatoire pour apparaître dans la recherche par proximité."}
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
          {etatGeo === "chargement"
            ? "Localisation…"
            : etatGeo === "ok"
              ? "Mettre à jour ma position"
              : "Utiliser ma position actuelle"}
        </Button>
        {etatGeo === "refuse" ? (
          <p className="mt-2 text-xs text-destructive">
            Position indisponible. Autorisez la géolocalisation puis réessayez.
          </p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          Fonctionne seulement si vous êtes sur place. Placer un repère sur une carte pour un
          lieu où vous n'êtes pas physiquement n'est pas encore possible.
        </p>
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem value="details" className="rounded-xl border border-border px-3">
          <AccordionTrigger className="text-sm font-medium hover:no-underline">
            Ajouter plus de détails (facultatif)
          </AccordionTrigger>
          <AccordionContent className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quartier">Quartier</Label>
                <Input
                  id="quartier"
                  value={valeurs.quartier}
                  onChange={(e) => majChamp("quartier", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  value={valeurs.adresse}
                  onChange={(e) => majChamp("adresse", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                type="tel"
                value={valeurs.telephone}
                onChange={(e) => majChamp("telephone", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                type="tel"
                value={valeurs.whatsapp}
                onChange={(e) => majChamp("whatsapp", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="horaires">Horaires</Label>
              <Input
                id="horaires"
                placeholder="Ex : Lun-Sam 8h-20h"
                value={valeurs.horaires}
                onChange={(e) => majChamp("horaires", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="site-web">Site web</Label>
              <Input
                id="site-web"
                type="url"
                placeholder="https://…"
                value={valeurs.siteWeb}
                onChange={(e) => majChamp("siteWeb", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={valeurs.description}
                onChange={(e) => majChamp("description", e.target.value)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {erreur ? <p className="text-sm text-destructive">{erreur}</p> : null}

      <Button type="submit" variant="terrain" className="w-full" disabled={enCours}>
        {enCours ? "Enregistrement…" : libelleBouton}
      </Button>
    </form>
  );
}
