import { Camera, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const TAILLE_MAX_OCTETS = 5 * 1024 * 1024; // 5 Mo, connexions lentes obligent
const MINIMUM_PHOTOS = 1;

type PhotoAjoutee = { id: string; url: string };

export function EtapePhotosObligatoires({
  placeId,
  ajouterPhoto,
  onTerminer,
  enCoursFinal = false,
  libelleBouton = "Terminer",
}: {
  placeId: string;
  /** Persiste la ligne place_photos une fois le fichier déjà téléversé. */
  ajouterPhoto: (params: {
    placeId: string;
    url: string;
    ordre: number;
  }) => Promise<{ id: string }>;
  onTerminer: () => void;
  enCoursFinal?: boolean;
  libelleBouton?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PhotoAjoutee[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onFichierChoisi(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setErreur(null);

    if (!fichier.type.startsWith("image/")) {
      setErreur("Choisissez une image (JPEG, PNG…).");
      return;
    }
    if (fichier.size > TAILLE_MAX_OCTETS) {
      setErreur("Image trop lourde (5 Mo maximum).");
      return;
    }

    setEnCours(true);
    try {
      const extension = fichier.name.split(".").pop() || "jpg";
      const chemin = `${placeId}/${crypto.randomUUID()}.${extension}`;

      const { error: erreurUpload } = await supabase.storage
        .from("lieu-photos")
        .upload(chemin, fichier, { cacheControl: "3600", upsert: false });
      if (erreurUpload) throw erreurUpload;

      const {
        data: { publicUrl },
      } = supabase.storage.from("lieu-photos").getPublicUrl(chemin);

      const { id } = await ajouterPhoto({ placeId, url: publicUrl, ordre: photos.length });
      setPhotos((p) => [...p, { id, url: publicUrl }]);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setErreur("Échec de l'envoi. Vérifiez votre connexion et réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  function retirerLocalement(id: string) {
    // On retire seulement de l'aperçu local (pas de suppression côté
    // serveur ici : pour une proposition anonyme, il n'y a pas de session
    // propriétaire pour autoriser une suppression a posteriori).
    setPhotos((p) => p.filter((photo) => photo.id !== id));
  }

  const suffisant = photos.length >= MINIMUM_PHOTOS;

  return (
    <div>
      <div className="flex items-center gap-2">
        <Camera className="size-5 text-primary" aria-hidden />
        <h2 className="font-display text-lg font-semibold text-foreground">
          Ajoutez {MINIMUM_PHOTOS === 1 ? "une photo" : `${MINIMUM_PHOTOS} photos`} du lieu
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Indispensable pour que la validation se fasse sans qu'un modérateur ait à se déplacer sur
        place.
      </p>

      {photos.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="group relative">
              <img
                src={p.url}
                alt=""
                className="aspect-square w-full rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => retirerLocalement(p.id)}
                aria-label="Retirer cette photo"
                className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground">
        <Upload className="size-4" aria-hidden />
        {enCours ? "Envoi…" : "Ajouter une photo"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={enCours}
          onChange={onFichierChoisi}
        />
      </label>
      {erreur ? <p className="mt-1 text-xs text-destructive">{erreur}</p> : null}

      {!suffisant ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {MINIMUM_PHOTOS - photos.length} photo{MINIMUM_PHOTOS - photos.length > 1 ? "s" : ""}{" "}
          restante{MINIMUM_PHOTOS - photos.length > 1 ? "s" : ""} avant de pouvoir continuer.
        </p>
      ) : null}

      <Button
        type="button"
        variant="terrain"
        className="mt-4 w-full"
        disabled={!suffisant || enCoursFinal}
        onClick={onTerminer}
      >
        {enCoursFinal ? "Envoi…" : libelleBouton}
      </Button>
    </div>
  );
}
