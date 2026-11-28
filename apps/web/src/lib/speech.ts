import { assistantSpeechLanguages, type AssistantLanguage } from "@upk/domain";

export type SpeechErrorCode =
  "unsupported" | "not-allowed" | "no-speech" | "language-not-supported" | "network" | "unknown";

export type SpeechRecognitionHandle = {
  stop: () => void;
  abort: () => void;
};

type RecognitionResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type RecognitionErrorEvent = {
  error?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function recognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export function speechRecognitionSupported(): boolean {
  return Boolean(recognitionConstructor());
}

export function speechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speechLanguage(language: AssistantLanguage): string {
  return assistantSpeechLanguages[language];
}

function mapRecognitionError(error: string | undefined): SpeechErrorCode {
  if (error === "not-allowed" || error === "service-not-allowed") return "not-allowed";
  if (error === "no-speech") return "no-speech";
  if (error === "language-not-supported") return "language-not-supported";
  if (error === "network") return "network";
  return "unknown";
}

export function startListening(
  language: AssistantLanguage,
  handlers: {
    onResult: (text: string) => void;
    onError: (code: SpeechErrorCode) => void;
    onEnd?: () => void;
  },
): SpeechRecognitionHandle | null {
  const Recognition = recognitionConstructor();
  if (!Recognition) {
    handlers.onError("unsupported");
    return null;
  }

  const instance = new Recognition();
  instance.lang = speechLanguage(language);
  instance.continuous = false;
  instance.interimResults = false;
  instance.maxAlternatives = 1;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    handlers.onEnd?.();
  };

  instance.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim();
    if (transcript) handlers.onResult(transcript);
    else handlers.onError("no-speech");
  };
  instance.onerror = (event) => {
    handlers.onError(mapRecognitionError(event.error));
  };
  instance.onend = finish;

  try {
    instance.start();
  } catch {
    handlers.onError("unknown");
    finish();
    return null;
  }

  return {
    stop: () => instance.stop(),
    abort: () => instance.abort(),
  };
}

function pickVoice(language: AssistantLanguage): SpeechSynthesisVoice | null {
  if (!speechSynthesisSupported()) return null;
  const wanted = speechLanguage(language).toLowerCase();
  const base = wanted.split("-")[0];
  const voices = window.speechSynthesis.getVoices();
  const matching = voices.filter(
    (voice) =>
      voice.lang.toLowerCase() === wanted ||
      voice.lang.toLowerCase().startsWith(`${base}-`),
  );

  // The Web Speech API has no standard gender field. Prefer an explicit
  // platform gender hint, then well-known masculine voice labels.
  const maleLabels = /male|masculin|homme|man|男|ذكر|رجل|ذكوري|رجالي/i;
  const femaleLabels = /female|feminin|féminin|femme|woman|女|أنثى|امرأة|نسائي|نسائية/i;
  const withGender = matching as Array<SpeechSynthesisVoice & { gender?: string }>;
  return (
    withGender.find((voice) => voice.gender?.toLowerCase() === "male") ??
    matching.find((voice) => maleLabels.test(voice.name)) ??
    matching.find((voice) => !femaleLabels.test(voice.name)) ??
    null
  );
}

export function hasVoiceFor(language: AssistantLanguage): boolean {
  if (!speechSynthesisSupported()) return false;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return language !== "ha" && language !== "za";
  return Boolean(pickVoice(language));
}

export type SpeakHandle = {
  cancel: () => void;
};

export function speak(
  text: string,
  language: AssistantLanguage,
  handlers: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (code: SpeechErrorCode) => void;
    onBlocked?: () => void;
  } = {},
): SpeakHandle | null {
  if (!speechSynthesisSupported() || !text.trim()) {
    handlers.onError?.("unsupported");
    return null;
  }

  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = speechLanguage(language);
  utterance.rate = 0.95;
  utterance.pitch = 0.65;
  const voice = pickVoice(language);
  if (voice) utterance.voice = voice;

  let started = false;
  let ended = false;
  const blockTimer = window.setTimeout(() => {
    if (!started && !ended && !synth.speaking) handlers.onBlocked?.();
  }, 900);

  utterance.onstart = () => {
    started = true;
    handlers.onStart?.();
  };
  utterance.onend = () => {
    ended = true;
    window.clearTimeout(blockTimer);
    handlers.onEnd?.();
  };
  utterance.onerror = (event) => {
    ended = true;
    window.clearTimeout(blockTimer);
    const error = (event as SpeechSynthesisErrorEvent).error;
    handlers.onError?.(
      error === "not-allowed" ? "not-allowed" : error === "network" ? "network" : "unknown",
    );
  };

  try {
    synth.cancel();
    synth.speak(utterance);
  } catch {
    window.clearTimeout(blockTimer);
    handlers.onError?.("unknown");
    return null;
  }

  return {
    cancel: () => {
      ended = true;
      window.clearTimeout(blockTimer);
      synth.cancel();
      handlers.onEnd?.();
    },
  };
}

export function cancelSpeech(): void {
  if (speechSynthesisSupported()) window.speechSynthesis.cancel();
}
