import { useNavigate } from "@tanstack/react-router";
import {
  formatDistance,
  isFuzzyMatch,
  normalizeSearch,
  parseAssistantQuery,\n  isTravelRequest,\n  travelModeForText,\n  travelSearchIntent,
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
  const [lastIndex, setLastIndex] = useState(0);\n  const [pendingTravelChoice, setPendingTravelChoice] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const messageId = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionHandle | null>(null);
  const speakRef = useRef<SpeakHandle | null>(null);
  const lastResultRef = useRef<SearchResult | null>(null);
  const lastIndexRef = useRef(0);
  const lastSpokenRef = useRef("");
  const languageTouched = useRef(false);
  const wasOpen = useRef(false);

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
    return assistantText(
      language,
      period === "morning" ? "assistant.greetingMorning" : "assistant.greetingEvening",
    );
  }

  function deliverGreeting(appendMessage: boolean) {
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
    if (!preferencesLoaded) return;
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;
    if (!justOpened || !greetingEnabled) return;
    deliverGreeting(true);
  }, [open, preferencesLoaded, greetingEnabled]);

  useEffect(() => {
    if (!needsGesture) return;
    const activate = () => {
      setNeedsGesture(false);
      setVoiceNotice(null);
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
    if (open) deliverGreeting(true);
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
      let result = await getTrpcClient().search.places.query({
        ...(intent.query ? { q: intent.query } : {}),
        ...(intent.categorySlug ? { categorySlug: intent.categorySlug } : {}),
        ...(origin ? { lat: origin.lat, lng: origin.lng } : {}),
        limit: 20,
      });

      // Si le critère descriptif n'est pas renseigné dans les fiches,
      // ne pas conclure qu'il n'existe aucun établissement de cette catégorie.
      if (result.items.length === 0 && intent.categorySlug && intent.query) {
        const categoryResult = await getTrpcClient().search.places.query({
          categorySlug: intent.categorySlug,
          ...(origin ? { lat: origin.lat, lng: origin.lng } : {}),
          limit: 20,
        });
        if (categoryResult.items.length > 0) {
          lastResultRef.current = categoryResult;
          lastIndexRef.current = 0;
          setLastResult(categoryResult);
          setLastIndex(0);
          say(
            assistantText(language, "assistant.criteriaUnavailable", {
              count: categoryResult.total,
              category: categoryResult.label ?? intent.categorySlug,
              criterion: intent.query,
            }),
            { places: categoryResult.items.slice(0, 4) },
          );
          navigateSearch({ ...intent, query: null }, origin);
          return;
        }
      }

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
    if (pendingTravelChoice) {
      const mode = travelModeForText(clean);
      if (!mode) {
        say(assistantText(language, "assistant.travelClarify"));
        return;
      }
      setPendingTravelChoice(false);
      await runSearch(travelSearchIntent(mode));
      return;
    }
    if (isTravelRequest(clean)) {
      setPendingTravelChoice(true);
      say(assistantText(language, "assistant.travelQuestion"));
      return;
    }
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
                deliverGreeting(true);
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
            className="ben-launcher-attention flex h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-[#ff6b35] px-4 text-[#0b0b0c] shadow-lg transition hover:brightness-110 focus:ring-2 focus:ring-[#ff6b35] focus:ring-offset-2 focus:outline-none motion-reduce:animate-none"
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
          className="ben-panel fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[min(88svh,46rem)] max-h-[46rem] w-full max-w-xl flex-col overflow-hidden rounded-t-[2rem] border border-white/70 bg-[#fffaf6] text-[#252321] shadow-[0_28px_90px_rgba(65,38,24,0.24)] sm:inset-x-auto sm:bottom-5 sm:end-5 sm:h-[min(82vh,46rem)] sm:rounded-[2rem]"
        >
          <header className="flex items-center justify-between gap-3 border-b border-[#eee3da] bg-white/85 px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ffb18e] to-[#e45a35] text-base font-black text-white shadow-md">B</span><div className="min-w-0"><h2 className="truncate text-base font-bold tracking-tight text-[#28231f]">Ben</h2><p className="text-[11px] text-[#8d7e73]">{assistantText(language, "assistant.name")}</p></div></div>
              <label className="mt-2 flex items-center gap-1 text-[11px] text-[#85766c]">
                <span className="sr-only">{assistantText(language, "assistant.language")}</span>
                <select
                  value={language}
                  onChange={(event) => changeLanguage(event.target.value as AssistantLanguage)}
                  aria-label={assistantText(language, "assistant.language")}
                  className="max-w-[8rem] rounded-full border border-[#eadfd6] bg-white px-2.5 py-1 text-xs text-[#51463f] outline-none focus:ring-2 focus:ring-[#f08a62]"
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
                  className="rounded-full border border-[#eadfd6] bg-white px-3 py-2 text-[11px] font-semibold text-[#62534a]"
                >
                  {assistantText(language, "assistant.stop")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={assistantText(language, "assistant.close")}
                className="grid h-9 w-9 place-items-center rounded-full bg-[#f6eee8] text-xl text-[#66564c] transition hover:bg-[#f0e2d8]"
              >
                ×
              </button>
            </div>
          </header>

          <div className="ben-chat-scroll flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite">
            {messages.length === 0 && (
              <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-3 py-8 text-center"><div className="mb-5 grid h-20 w-20 place-items-center rounded-[1.8rem] bg-gradient-to-br from-[#ffb18e] via-[#ff865e] to-[#e45a35] text-3xl font-black text-white shadow-xl shadow-orange-200/70">B</div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#d56b49]">Ben</p><h3 className="mt-3 text-2xl font-bold tracking-tight text-[#302720]">{assistantText(language, "assistant.welcome")}</h3></div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ms-auto max-w-[88%] rounded-[1.35rem] rounded-br-md bg-gradient-to-br from-[#ff9a70] to-[#ed7048] px-4 py-3 text-sm leading-6 text-white shadow-md shadow-orange-100"
                    : "me-auto max-w-[92%] rounded-[1.35rem] rounded-bl-md border border-[#eee2d8] bg-white px-4 py-3 text-sm leading-6 text-[#3a312b] shadow-sm"
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
                  <div className="mt-3 flex flex-col gap-2">
                    {message.places.map((place) => (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => choosePlace(place)}
                        className="rounded-xl border border-[#eee1d6] bg-[#fffaf6] px-3 py-2.5 text-start text-xs text-[#4d4038] transition hover:border-[#ed906e] hover:bg-[#fff2e9]"
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
            <div className="flex items-center gap-2 border-t border-[#eee3da] bg-white/70 px-5 py-2.5 text-xs text-[#8b7b70]">
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
              className="border-t border-[#f2dfc9] bg-[#fff7eb] px-5 py-2.5 text-xs text-[#9a642d]"
            >
              {voiceNotice}
            </p>
          )}

          <div className="border-t border-[#eee3da] bg-white/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8b7b70]">
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
                className="min-w-0 flex-1 rounded-full border border-[#eadfd6] bg-[#fffaf6] px-4 py-3 text-sm text-[#332a24] outline-none placeholder:text-[#a99a8f] transition focus:border-[#ed906e] focus:ring-4 focus:ring-[#ed906e]/15"
              />
              <button
                type="button"
                onClick={toggleListening}
                aria-label={assistantText(language, "assistant.mic")}
                aria-pressed={phase === "listening"}
                className={
                  phase === "listening"
                    ? "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#d94b4b] text-white shadow-md"
                    : "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#eadfd6] bg-white text-[#6e5a4d] transition hover:bg-[#fff2e9]"
                }
              >
                <MicIcon className="h-4 w-4" />
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#e96b45] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-[#d95b37] disabled:opacity-50"
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
