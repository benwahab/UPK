import { useNavigate } from "@tanstack/react-router";
import {
  formatDistance,
  isFuzzyMatch,
  normalizeSearch,
  parseAssistantQuery,
  greetingPeriod,
  deviceTimeZone,
  type AssistantIntent,
  type PlaceSummary,
  type SearchResult,
} from "@upk/domain";
import {
  assistantIsRtl,
  assistantLanguageLabels,
  assistantLanguages,
  assistantText,
  assistantVoiceSupport,
  type AssistantLanguage,
} from "@upk/i18n";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getTrpcClient } from "../lib/trpc";
import {
  cancelSpeech,
  hasVoiceFor,
  speak,
  speechRecognitionSupported,
  startListening,
  type SpeakHandle,
  type SpeechRecognitionHandle,
} from "../lib/speech";

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
  places?: PlaceSummary[];
  notFound?: boolean;
  notUnderstood?: boolean;
};

type Phase = "idle" | "listening" | "thinking" | "speaking";

const GREETING_KEY = "upk-assistant-greeting";
const LANGUAGE_KEY = "upk-assistant-language";

// Le module persiste pendant une ouverture de l'application : les changements
// de page ne relancent pas l'accueil, un rechargement complet si.
const greetedThisOpen = { value: false };

function isAssistantLanguage(value: string | null): value is AssistantLanguage {
  return Boolean(value && (assistantLanguages as readonly string[]).includes(value));
}

function distanceText(place: PlaceSummary): string | null {
  return place.distanceM === null ? null : formatDistance(place.distanceM);
}

function placeSummaryText(place: PlaceSummary): string {
  return [place.nom, place.categorieNom, place.quartier ?? place.ville].filter(Boolean).join(" · ");
}

export function VoiceAssistant({ locale }: { locale: "fr" | "en" | "ar" }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<AssistantLanguage>(locale);
  const [greetingEnabled, setGreetingEnabled] = useState(true);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [needsGesture, setNeedsGesture] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SearchResult | null>(null);
  const [lastIndex, setLastIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const messageId = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionHandle | null>(null);
  const speakRef = useRef<SpeakHandle | null>(null);
  const lastResultRef = useRef<SearchResult | null>(null);
  const lastIndexRef = useRef(0);
  const lastSpokenRef = useRef("");
  const languageTouched = useRef(false);

  useEffect(() => {
    try {
      const storedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
      if (isAssistantLanguage(storedLanguage)) {
        languageTouched.current = true;
        setLanguage(storedLanguage);
      }
      setGreetingEnabled(window.localStorage.getItem(GREETING_KEY) !== "off");
    } catch {
      // Le stockage local peut être bloqué : les préférences restent en mémoire.
    }
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!languageTouched.current) setLanguage(locale);
  }, [locale]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      speakRef.current?.cancel();
    };
  }, []);

  function append(role: Message["role"], text: string, options: Partial<Message> = {}) {
    messageId.current += 1;
    setMessages((current) => [...current, { id: messageId.current, role, text, ...options }]);
  }

  function stopSpeaking() {
    speakRef.current?.cancel();
    speakRef.current = null;
    cancelSpeech();
    setPhase("idle");
  }

  function say(text: string, options: Partial<Message> = {}) {
    lastSpokenRef.current = text;
    append("assistant", text, options);
    if (assistantVoiceSupport[language] === "experimental" && !hasVoiceFor(language)) {
      setVoiceNotice(assistantText(language, "assistant.experimentalVoice"));
      setPhase("idle");
      return;
    }

    setPhase("speaking");
    speakRef.current = speak(text, language, {
      onStart: () => setPhase("speaking"),
      onEnd: () => setPhase("idle"),
      onBlocked: () => {
        setPhase("idle");
        setNeedsGesture(true);
        setVoiceNotice(assistantText(language, "assistant.voiceNotAllowed"));
      },
      onError: (code) => {
        setPhase("idle");
        if (code === "not-allowed") {
          setNeedsGesture(true);
          setVoiceNotice(assistantText(language, "assistant.voiceNotAllowed"));
        } else {
          setVoiceNotice(assistantText(language, "assistant.voiceError"));
        }
      },
    });
    if (!speakRef.current) {
      setPhase("idle");
      setVoiceNotice(assistantText(language, "assistant.voiceUnavailable"));
    }
  }

  function greetingText(): string {
    const period = greetingPeriod(new Date(), deviceTimeZone());
    const greeting = assistantText(
      language,
      period === "morning" ? "assistant.greetingMorning" : "assistant.greetingEvening",
    );
    return assistantText(language, "assistant.welcome");
  }

  function deliverGreeting(appendMessage: boolean) {
    greetedThisOpen.value = true;
    const text = greetingText();
    if (appendMessage) append("assistant", text);
    lastSpokenRef.current = text;
    if (assistantVoiceSupport[language] === "experimental" && !hasVoiceFor(language)) {
      setVoiceNotice(assistantText(language, "assistant.experimentalVoice"));
      return;
    }
    setPhase("speaking");
    speakRef.current = speak(text, language, {
      onStart: () => setPhase("speaking"),
      onEnd: () => setPhase("idle"),
      onBlocked: () => {
        setPhase("idle");
        setNeedsGesture(true);
        setVoiceNotice(assistantText(language, "assistant.voiceNotAllowed"));
      },
      onError: (code) => {
        setPhase("idle");
        if (code === "not-allowed") {
          setNeedsGesture(true);
          setVoiceNotice(assistantText(language, "assistant.voiceNotAllowed"));
        } else {
          setVoiceNotice(assistantText(language, "assistant.voiceUnavailable"));
        }
      },
    });
    if (!speakRef.current) {
      setPhase("idle");
      setVoiceNotice(assistantText(language, "assistant.voiceUnavailable"));
    }
  }

  useEffect(() => {
    if (!preferencesLoaded || !greetingEnabled || greetedThisOpen.value) return;
    const timer = window.setTimeout(() => {
      if (greetedThisOpen.value) return;
      deliverGreeting(true);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [preferencesLoaded, greetingEnabled, language]);

  useEffect(() => {
    if (!needsGesture) return;
    const activate = () => {
      setNeedsGesture(false);
      setVoiceNotice(null);
      if (greetedThisOpen.value) {
        const text = lastSpokenRef.current || greetingText();
        setPhase("speaking");
        speakRef.current = speak(text, language, {
          onStart: () => setPhase("speaking"),
          onEnd: () => setPhase("idle"),
          onBlocked: () => {
            setPhase("idle");
            setNeedsGesture(true);
            setVoiceNotice(assistantText(language, "assistant.voiceNotAllowed"));
          },
          onError: () => setPhase("idle"),
        });
      } else {
        deliverGreeting(true);
      }
    };
    window.addEventListener("pointerdown", activate, { once: true });
    window.addEventListener("keydown", activate, { once: true });
    return () => {
      window.removeEventListener("pointerdown", activate);
      window.removeEventListener("keydown", activate);
    };
  }, [needsGesture, language]);

  function changeLanguage(next: AssistantLanguage) {
    languageTouched.current = true;
    setLanguage(next);
    setVoiceNotice(null);
    setNeedsGesture(false);
    stopSpeaking();
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // Préférence non persistée si le stockage est bloqué.
    }
  }

  function toggleGreeting() {
    const next = !greetingEnabled;
    setGreetingEnabled(next);
    try {
      window.localStorage.setItem(GREETING_KEY, next ? "on" : "off");
    } catch {
      // Préférence non persistée si le stockage est bloqué.
    }
    if (!next) {
      stopSpeaking();
      setVoiceNotice(assistantText(language, "assistant.greetingOff"));
      return;
    }
    setVoiceNotice(assistantText(language, "assistant.greetingOn"));
    if (!greetedThisOpen.value) deliverGreeting(true);
  }

  function navigateSearch(
    intent: Extract<AssistantIntent, { kind: "search" }>,
    origin: { lat: number; lng: number } | null,
  ) {
    void navigate({
      to: "/$locale",
      params: { locale },
      search: {
        ...(intent.query ? { q: intent.query } : {}),
        ...(intent.categorySlug ? { category: intent.categorySlug } : {}),
        ...(origin ? { lat: origin.lat, lng: origin.lng } : {}),
      },
    });
  }

  function currentPosition(): Promise<{ lat: number; lng: number } | null> {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8_000, maximumAge: 0 },
      );
    });
  }

  async function originFor(intent: Extract<AssistantIntent, { kind: "search" }>) {
    if (intent.proximity || intent.categorySlug) return currentPosition();
    if (typeof navigator === "undefined" || !("permissions" in navigator)) return null;
    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      return status.state === "granted" ? currentPosition() : null;
    } catch {
      return null;
    }
  }

  async function runSearch(intent: Extract<AssistantIntent, { kind: "search" }>) {
    setPhase("thinking");
    setVoiceNotice(null);
    const origin = await originFor(intent);
    try {
      const result = await getTrpcClient().search.places.query({
        ...(intent.query ? { q: intent.query } : {}),
        ...(intent.categorySlug ? { categorySlug: intent.categorySlug } : {}),
        ...(origin ? { lat: origin.lat, lng: origin.lng } : {}),
        limit: 20,
      });
      lastResultRef.current = result;
      lastIndexRef.current = 0;
      setLastResult(result);
      setLastIndex(0);
      handleResult(result, intent, origin);
    } catch {
      say(assistantText(language, "assistant.networkError"));
    }
  }

  function handleResult(
    result: SearchResult,
    intent: Extract<AssistantIntent, { kind: "search" }>,
    origin: { lat: number; lng: number } | null,
  ) {
    const items = result.items;
    if (items.length === 0) {
      say(assistantText(language, "assistant.notFound"), { notFound: true });
      navigateSearch(intent, origin);
      return;
    }

    if (result.intent === "categorie") {
      const nearest = items[0];
      const distance = nearest ? distanceText(nearest) : null;
      const count = assistantText(language, "assistant.categoryCount", {
        count: result.total,
        category: result.label ?? intent.categorySlug ?? "",
      });
      const extra = distance
        ? assistantText(language, "assistant.nearest", {
            name: nearest?.nom ?? "",
            distance,
          })
        : !origin
          ? assistantText(language, "assistant.locationNeeded")
          : "";
      say(`${count} ${extra}`.trim(), { places: items.slice(0, 4) });
      navigateSearch(intent, origin);
      return;
    }

    if (result.intent === "quartier" || result.intent === "ville") {
      const key = result.intent === "quartier" ? "assistant.quarterCount" : "assistant.cityCount";
      say(assistantText(language, key, { name: result.label ?? "", count: result.total }), {
        places: items.slice(0, 4),
      });
      navigateSearch(intent, origin);
      return;
    }

    const normalizedQuery = intent.query ? normalizeSearch(intent.query) : "";
    const exactItems = normalizedQuery
      ? items.filter((item) => normalizeSearch(item.nom) === normalizedQuery)
      : [];

    if (result.intent === "nom" || exactItems.length > 0) {
      if (exactItems.length > 1) {
        say(assistantText(language, "assistant.multiple"), { places: exactItems.slice(0, 5) });
        navigateSearch(intent, origin);
        return;
      }
      const place = exactItems[0] ?? items[0];
      if (!place) {
        say(assistantText(language, "assistant.notFound"), { notFound: true });
        navigateSearch(intent, origin);
        return;
      }
      const distance = distanceText(place);
      const text = [
        assistantText(language, "assistant.found", { name: place.nom }),
        distance ? assistantText(language, "assistant.atDistance", { distance }) : "",
      ]
        .filter(Boolean)
        .join(" ");
      say(text, { places: [place] });
      navigateSearch(intent, origin);
      return;
    }

    const fuzzyItems = intent.query
      ? items.filter(
          (item) =>
            isFuzzyMatch(intent.query ?? "", item.nom) ||
            isFuzzyMatch(intent.query ?? "", item.quartier ?? ""),
        )
      : [];
    if (fuzzyItems.length > 0) {
      const suggestion = fuzzyItems[0];
      if (!suggestion) return;
      say(
        assistantText(language, "assistant.suggestion", {
          query: intent.query ?? "",
          suggestion: suggestion.nom,
        }),
        { places: fuzzyItems.slice(0, 4) },
      );
      navigateSearch(intent, origin);
      return;
    }

    say(assistantText(language, "assistant.notFound"), { notFound: true });
    navigateSearch(intent, origin);
  }

  function handleFollowUp(topic: string) {
    const result = lastResultRef.current;
    const place = result?.items[lastIndexRef.current];
    if (!place) {
      say(assistantText(language, "assistant.notUnderstood"));
      return;
    }

    if (topic === "open") {
      void navigate({ to: "/$locale/places/$id", params: { locale, id: place.id } });
      return;
    }
    if (topic === "next") {
      const nextIndex = lastIndexRef.current + 1;
      const nextPlace = result?.items[nextIndex];
      if (!nextPlace) {
        say(assistantText(language, "assistant.noInfo"));
        return;
      }
      lastIndexRef.current = nextIndex;
      setLastIndex(nextIndex);
      const distance = distanceText(nextPlace);
      say(
        [
          assistantText(language, "assistant.found", { name: nextPlace.nom }),
          distance ? assistantText(language, "assistant.atDistance", { distance }) : "",
        ]
          .filter(Boolean)
          .join(" "),
        { places: [nextPlace] },
      );
      return;
    }
    if (topic === "repeat") {
      say(lastSpokenRef.current || assistantText(language, "assistant.notUnderstood"));
      return;
    }
    if (topic === "distance") {
      const distance = distanceText(place);
      say(
        distance
          ? assistantText(language, "assistant.distanceOnly", { distance })
          : assistantText(language, "assistant.locationNeeded"),
      );
      return;
    }
    if (topic === "hours") {
      say(
        place.horaires
          ? assistantText(language, "assistant.hours", { value: place.horaires })
          : assistantText(language, "assistant.noInfo"),
      );
      return;
    }
    if (topic === "phone") {
      say(
        place.telephone
          ? assistantText(language, "assistant.phone", { value: place.telephone })
          : assistantText(language, "assistant.noInfo"),
      );
      return;
    }
    if (topic === "website") {
      say(
        place.siteWeb
          ? assistantText(language, "assistant.website", { value: place.siteWeb })
          : assistantText(language, "assistant.noInfo"),
      );
      return;
    }
    const address = [place.adresse, place.quartier, place.ville].filter(Boolean).join(", ");
    say(
      address
        ? assistantText(language, "assistant.address", { value: address })
        : assistantText(language, "assistant.noInfo"),
    );
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean) return;
    setInput("");
    append("user", clean);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setPhase("thinking");
    setVoiceNotice(null);
    const intent = parseAssistantQuery(clean);
    if (intent.kind === "greeting") {
      say(greetingText());
      return;
    }
    if (intent.kind === "followup") {
      handleFollowUp(intent.topic);
      return;
    }
    if (intent.kind === "unknown") {
      say(assistantText(language, "assistant.notUnderstood"), { notUnderstood: true });
      window.setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    await runSearch(intent);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  function toggleListening() {
    if (phase === "listening") {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setPhase("idle");
      return;
    }
    if (!speechRecognitionSupported()) {
      say(assistantText(language, "assistant.micUnavailable"));
      return;
    }
    stopSpeaking();
    setVoiceNotice(null);
    setPhase("listening");
    let received = false;
    let failed = false;
    recognitionRef.current = startListening(language, {
      onResult: (text) => {
        received = true;
        setPhase("thinking");
        void send(text);
      },
      onError: () => {
        failed = true;
        setPhase("idle");
        say(assistantText(language, "assistant.listeningError"));
      },
      onEnd: () => {
        if (!received && !failed) setPhase("idle");
        recognitionRef.current = null;
      },
    });
  }

  function choosePlace(place: PlaceSummary) {
    setOpen(true);
    const distance = distanceText(place);
    say(
      [
        assistantText(language, "assistant.found", { name: place.nom }),
        distance ? assistantText(language, "assistant.atDistance", { distance }) : "",
      ]
        .filter(Boolean)
        .join(" "),
      { places: [place] },
    );
    void navigate({ to: "/$locale/places/$id", params: { locale, id: place.id } });
  }

  const status =
    phase === "listening"
      ? assistantText(language, "assistant.listening")
      : phase === "thinking"
        ? assistantText(language, "assistant.thinking")
        : phase === "speaking"
          ? assistantText(language, "assistant.speaking")
          : null;

  return (
    <>
      {!open && (
        <div className="fixed bottom-5 end-4 z-40 flex flex-col items-end gap-2">
          {needsGesture && greetingEnabled && (
            <button
              type="button"
              onClick={() => {
                setNeedsGesture(false);
                deliverGreeting(!greetedThisOpen.value);
              }}
              className="max-w-[15rem] rounded-full border border-[var(--upk-border)] bg-[var(--upk-bg)] px-3 py-2 text-xs font-medium shadow-lg"
            >
              {assistantText(language, "assistant.voiceActivate")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={assistantText(language, "assistant.open")}
            className="flex h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-[#f28a24] px-4 text-white shadow-lg transition hover:brightness-110 focus:ring-2 focus:ring-[#f28a24] focus:ring-offset-2 focus:outline-none"
          >
            <span className="text-sm font-semibold">Ben</span>
          </button>
        </div>
      )}

      {open && (
        <section
          role="dialog"
          aria-label={assistantText(language, "assistant.name")}
          dir={assistantIsRtl(language) ? "rtl" : "ltr"}
          className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-h-[min(78vh,42rem)] w-auto max-w-md flex-col overflow-hidden rounded-2xl border border-[#343434] bg-[#101010] text-white shadow-2xl sm:end-4 sm:start-auto sm:mx-0 sm:w-[24rem]"
        >
          <header className="flex items-center justify-between gap-2 border-b border-[var(--upk-border)] p-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">Ben · 
                {assistantText(language, "assistant.name")}
              </h2>
              <label className="mt-1 flex items-center gap-1 text-[11px] text-[var(--upk-muted-fg)]">
                <span className="sr-only">{assistantText(language, "assistant.language")}</span>
                <select
                  value={language}
                  onChange={(event) => changeLanguage(event.target.value as AssistantLanguage)}
                  aria-label={assistantText(language, "assistant.language")}
                  className="max-w-[8rem] rounded border border-[var(--upk-border)] bg-[var(--upk-bg)] px-1 py-0.5"
                >
                  {assistantLanguages.map((code) => (
                    <option key={code} value={code}>
                      {assistantLanguageLabels[code]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-1">
              {phase === "speaking" && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  aria-label={assistantText(language, "assistant.stop")}
                  className="rounded-lg border border-[var(--upk-border)] px-2 py-1 text-[11px]"
                >
                  {assistantText(language, "assistant.stop")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={assistantText(language, "assistant.close")}
                className="rounded-lg border border-[var(--upk-border)] px-2 py-1 text-sm"
              >
                ×
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
            {messages.length === 0 && (
              <div className="rounded-xl border border-[#343434] bg-[#181818] p-3 text-sm"><p className="font-semibold text-white">Ben</p><p className="mt-1 text-white/80">{assistantText(language, "assistant.welcome")}</p></div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ms-auto max-w-[90%] rounded-xl bg-[#f28a24] px-3 py-2 text-sm text-white"
                    : "me-auto max-w-[95%] rounded-xl border border-[#343434] bg-[#1b1b1b] px-3 py-2 text-sm text-white"
                }
              >
                <p className="whitespace-pre-line">{message.text}</p>
                {message.notFound && (
                  <a
                    href={`/${locale}/contribuer`}
                    className="mt-2 inline-block font-medium text-[var(--upk-primary)] underline"
                  >
                    {assistantText(language, "assistant.contribute")}
                  </a>
                )}
                {message.notUnderstood && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => inputRef.current?.focus()}
                      className="rounded border border-[var(--upk-border)] bg-[var(--upk-bg)] px-2 py-1 text-xs"
                    >
                      {assistantText(language, "assistant.writeInstead")}
                    </button>
                    <button
                      type="button"
                      onClick={toggleListening}
                      className="rounded border border-[var(--upk-border)] bg-[var(--upk-bg)] px-2 py-1 text-xs"
                    >
                      {assistantText(language, "assistant.repeat")}
                    </button>
                  </div>
                )}
                {message.places && message.places.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {message.places.map((place) => (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => choosePlace(place)}
                        className="rounded-lg border border-[var(--upk-border)] bg-[var(--upk-bg)] px-2 py-1.5 text-start text-xs hover:border-[var(--upk-primary)]"
                      >
                        <span className="font-medium">{placeSummaryText(place)}</span>
                        {place.distanceM !== null && (
                          <span className="ms-1 text-[var(--upk-muted-fg)]">
                            · {formatDistance(place.distanceM)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {status && (
            <div className="flex items-center gap-2 border-t border-[var(--upk-border)] px-3 py-2 text-xs text-[var(--upk-muted-fg)]">
              <span
                className={
                  phase === "listening"
                    ? "h-2 w-2 animate-pulse rounded-full bg-[var(--upk-danger)]"
                    : "h-2 w-2 rounded-full bg-[var(--upk-primary)]"
                }
              />
              <span role="status">{status}</span>
            </div>
          )}
          {voiceNotice && (
            <p
              role="status"
              className="border-t border-[var(--upk-border)] px-3 py-2 text-xs text-amber-800"
            >
              {voiceNotice}
            </p>
          )}

          <div className="border-t border-[var(--upk-border)] p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--upk-muted-fg)]">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={greetingEnabled}
                  onChange={toggleGreeting}
                  className="h-3.5 w-3.5"
                />
                {assistantText(language, "assistant.greetingToggle")}
              </label>
              {assistantVoiceSupport[language] === "experimental" && (
                <span>{assistantText(language, "assistant.experimentalVoice")}</span>
              )}
            </div>
            <form onSubmit={submit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={assistantText(language, "assistant.inputPlaceholder")}
                aria-label={assistantText(language, "assistant.inputPlaceholder")}
                className="min-w-0 flex-1 rounded-lg border border-[#3b3b3b] bg-[#191919] px-3 py-2 text-sm text-white outline-none placeholder:text-white/45 focus:ring-2 focus:ring-[#f28a24]"
              />
              <button
                type="button"
                onClick={toggleListening}
                aria-label={assistantText(language, "assistant.mic")}
                aria-pressed={phase === "listening"}
                className={
                  phase === "listening"
                    ? "rounded-lg bg-[var(--upk-danger)] px-3 py-2 text-[var(--upk-primary-fg)]"
                    : "rounded-lg border border-[var(--upk-border)] px-3 py-2"
                }
              >
                <MicIcon className="h-4 w-4" />
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[var(--upk-primary)] px-3 py-2 text-sm font-medium text-[var(--upk-primary-fg)]"
              >
                {assistantText(language, "assistant.send")}
              </button>
            </form>
            {lastResult && lastResult.items.length > 1 && (
              <p className="mt-2 text-[11px] text-[var(--upk-muted-fg)]">
                {assistantText(language, "assistant.next")}: {lastIndex + 1}/
                {lastResult.items.length}
              </p>
            )}
          </div>
        </section>
      )}
    </>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
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
  );
}
