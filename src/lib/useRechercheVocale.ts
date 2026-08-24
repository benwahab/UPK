import { useCallback, useMemo, useRef, useState } from "react";

// L'API Web Speech n'est pas standardisée dans le DOM lib de TypeScript ;
// on ne type que ce dont on a besoin.
type EvenementResultatVocal = { results: { transcript: string }[][] };
type ReconnaissanceVocale = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: EvenementResultatVocal) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

/**
 * Recherche vocale native du navigateur (Web Speech API) : gratuite, aucun
 * service externe. Support variable selon navigateur/OS (bon sur Chrome
 * Android, absent sur beaucoup de configurations iOS) — le bouton se
 * désactive proprement si l'API n'existe pas.
 */
export function useRechercheVocale(surResultat: (texte: string) => void) {
  const [enEcoute, setEnEcoute] = useState(false);
  const instanceRef = useRef<ReconnaissanceVocale | null>(null);

  const disponible = useMemo(() => {
    if (typeof window === "undefined") return false;
    const w = window as unknown as Record<string, unknown>;
    return Boolean(w["SpeechRecognition"] || w["webkitSpeechRecognition"]);
  }, []);

  const demarrer = useCallback(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as Record<string, unknown>;
    const Constructeur = (w["SpeechRecognition"] || w["webkitSpeechRecognition"]) as
      | (new () => ReconnaissanceVocale)
      | undefined;
    if (!Constructeur) return;

    const instance = new Constructeur();
    instance.lang = "fr-FR";
    instance.interimResults = false;
    instance.maxAlternatives = 1;
    instance.onresult = (e) => {
      const texte = e.results[0]?.[0]?.transcript;
      if (texte) surResultat(texte);
    };
    instance.onerror = () => setEnEcoute(false);
    instance.onend = () => setEnEcoute(false);

    instanceRef.current = instance;
    setEnEcoute(true);
    instance.start();
  }, [surResultat]);

  const arreter = useCallback(() => {
    instanceRef.current?.stop();
    setEnEcoute(false);
  }, []);

  return { disponible, enEcoute, demarrer, arreter };
}
