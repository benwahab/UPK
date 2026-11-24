import type { Locale } from "@upk/domain";
import { t } from "@upk/i18n";
import { useEffect, useRef, useState } from "react";

type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const LANGUAGES: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-US",
  ar: "ar-SA",
};

export function VoiceSearch({
  locale,
  onResult,
  onError,
}: {
  locale: Locale;
  onResult: (text: string) => void;
  onError?: () => void;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition));
    return () => recognition.current?.abort();
  }, []);

  if (!supported) return null;

  function start() {
    if (listening) {
      recognition.current?.stop();
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      onError?.();
      return;
    }

    const instance = new Recognition();
    instance.lang = LANGUAGES[locale];
    instance.continuous = false;
    instance.interimResults = false;
    instance.maxAlternatives = 1;
    instance.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) onResult(transcript);
      else onError?.();
    };
    instance.onerror = () => onError?.();
    instance.onend = () => {
      recognition.current = null;
      setListening(false);
    };
    recognition.current = instance;

    try {
      instance.start();
      setListening(true);
    } catch {
      recognition.current = null;
      setListening(false);
      onError?.();
    }
  }

  const label = listening ? t(locale, "search.voiceListening") : t(locale, "search.voice");

  return (
    <button
      type="button"
      onClick={start}
      aria-label={label}
      aria-pressed={listening}
      title={label}
      className="rounded-lg border border-[var(--upk-border)] px-3 py-3 text-[var(--upk-fg)] focus:ring-2 focus:ring-[var(--upk-primary)] focus:outline-none"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" />
        <path d="M19 11a7 7 0 0 1-14 0" />
        <path d="M12 18v3" />
        <path d="M8 21h8" />
      </svg>
    </button>
  );
}
