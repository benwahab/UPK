import { Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export function ImporterCsv<T>({
  aideColonnes,
  analyser,
  rendreApercu,
  onConfirmer,
}: {
  /** Texte d'aide affiché sous le sélecteur de fichier (colonnes reconnues). */
  aideColonnes: string;
  analyser: (texte: string) => { lignes: T[]; erreurs: string[] };
  rendreApercu: (ligne: T) => string;
  onConfirmer: (lignes: T[]) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [apercu, setApercu] = useState<T[]>([]);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [fait, setFait] = useState<number | null>(null);

  function onFichierChoisi(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setFait(null);
    const lecteur = new FileReader();
    lecteur.onload = () => {
      const { lignes, erreurs: err } = analyser(String(lecteur.result));
      setApercu(lignes);
      setErreurs(err);
    };
    lecteur.readAsText(fichier);
  }

  async function onConfirmerImport() {
    if (apercu.length === 0) return;
    setEnCours(true);
    try {
      await onConfirmer(apercu);
      setFait(apercu.length);
      setApercu([]);
      setErreurs([]);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-dashed border-border bg-card p-4">
      <p className="text-sm font-medium text-card-foreground">Importer un fichier CSV</p>
      <p className="mt-1 text-xs text-muted-foreground">{aideColonnes}</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={onFichierChoisi}
        className="mt-2 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground"
      />

      {erreurs.length > 0 ? (
        <ul className="mt-2 space-y-0.5">
          {erreurs.map((e, i) => (
            <li key={i} className="text-xs text-destructive">
              {e}
            </li>
          ))}
        </ul>
      ) : null}

      {apercu.length > 0 ? (
        <div className="mt-3">
          <p className="text-sm text-card-foreground">
            {apercu.length} ligne{apercu.length > 1 ? "s" : ""} prête{apercu.length > 1 ? "s" : ""}{" "}
            à importer :
          </p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {apercu.slice(0, 20).map((l, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                {rendreApercu(l)}
              </li>
            ))}
            {apercu.length > 20 ? (
              <li className="text-xs text-muted-foreground">… et {apercu.length - 20} de plus</li>
            ) : null}
          </ul>
          <Button
            type="button"
            variant="terrain"
            size="sm"
            className="mt-3"
            disabled={enCours}
            onClick={onConfirmerImport}
          >
            <Upload className="size-4" aria-hidden />
            {enCours ? "Import en cours…" : `Confirmer l'import (${apercu.length})`}
          </Button>
        </div>
      ) : null}

      {fait !== null ? (
        <p className="mt-3 text-sm text-primary">{fait} ligne(s) importée(s).</p>
      ) : null}
    </div>
  );
}
