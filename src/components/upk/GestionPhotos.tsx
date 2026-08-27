import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { ajouterPhoto, listerMesPhotos, supprimerPhoto } from "@/lib/photos.functions";

const TAILLE_MAX_OCTETS = 5 * 1024 * 1024; // 5 Mo, connexions lentes obligent

export function GestionPhotos({ placeId }: { placeId: string }) {
  const queryClient = useQueryClient();
  const chercherPhotos = useServerFn(listerMesPhotos);
  const ajouter = useServerFn(ajouterPhoto);
  const supprimer = useServerFn(supprimerPhoto);
  const inputRef = useRef<HTMLInputElement>(null);

  const photos = useQuery({
    queryKey: ["mes-photos", placeId],
    queryFn: () => chercherPhotos({ data: { placeId } }),
  });

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

      await ajouter({ data: { placeId, url: publicUrl, ordre: photos.data?.length ?? 0 } });
      queryClient.invalidateQueries({ queryKey: ["mes-photos", placeId] });
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setErreur("Échec de l'envoi. Vérifiez votre connexion et réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  async function onSupprimer(photoId: string) {
    await supprimer({ data: { id: photoId, placeId } });
    queryClient.invalidateQueries({ queryKey: ["mes-photos", placeId] });
  }

  return (
    <div className="mt-3">
      <p className="text-sm font-medium text-foreground">Photos</p>

      {(photos.data?.length ?? 0) > 0 ? (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {photos.data!.map((p) => (
            <div key={p.id} className="group relative">
              <img
                src={p.url}
                alt=""
                loading="lazy"
                className="aspect-square w-full rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => onSupprimer(p.id)}
                aria-label="Supprimer cette photo"
                className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground">
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
    </div>
  );
}
