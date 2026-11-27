import { normalizeSearch } from "./normalize";

export const assistantLanguages = ["fr", "en", "ar", "ha", "za"] as const;
export type AssistantLanguage = (typeof assistantLanguages)[number];

export function isAssistantLanguage(value: string): value is AssistantLanguage {
  return (assistantLanguages as readonly string[]).includes(value);
}

export const assistantSpeechLanguages: Record<AssistantLanguage, string> = {
  fr: "fr-FR",
  en: "en-US",
  ar: "ar-SA",
  ha: "ha-NG",
  za: "dje",
};

export type GreetingPeriod = "morning" | "evening";

export function hourInTimeZone(date: Date, timeZone?: string): number {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        hourCycle: "h23",
      }).formatToParts(date);
      const hour = Number(parts.find((part) => part.type === "hour")?.value);
      if (Number.isInteger(hour) && hour >= 0 && hour <= 23) return hour;
    } catch {
      // Fuseau inconnu : on retombe sur l'horloge locale de l'appareil.
    }
  }
  return date.getHours();
}

export function greetingPeriod(date: Date, timeZone?: string): GreetingPeriod {
  const hour = hourInTimeZone(date, timeZone);
  return hour >= 5 && hour < 14 ? "morning" : "evening";
}

export function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

const CATEGORY_ALIASES: Record<string, string> = {
  pharmacie: "pharmacie",
  pharmacies: "pharmacie",
  pharmacy: "pharmacie",
  chemist: "pharmacie",
  drugstore: "pharmacie",
  "kantin magani": "pharmacie",
  magani: "pharmacie",
  farmasi: "pharmacie",
  صيدليه: "pharmacie",
  sante: "sante",
  hopital: "sante",
  hopitaux: "sante",
  clinique: "sante",
  cliniques: "sante",
  dispensaire: "sante",
  dispensaires: "sante",
  medecin: "sante",
  medecins: "sante",
  docteur: "sante",
  docteurs: "sante",
  hospital: "sante",
  clinic: "sante",
  doctor: "sante",
  asibiti: "sante",
  likita: "sante",
  مستشفي: "sante",
  عياده: "sante",
  restaurant: "restaurant",
  restaurants: "restaurant",
  cafe: "restaurant",
  cafes: "restaurant",
  eatery: "restaurant",
  food: "restaurant",
  "gidan abinci": "restaurant",
  "gidan nwaari": "restaurant",
  مطعم: "restaurant",
  hotel: "hotel",
  hotels: "hotel",
  auberge: "hotel",
  auberges: "hotel",
  lodge: "hotel",
  otal: "hotel",
  فندق: "hotel",
  banque: "banque",
  banques: "banque",
  bank: "banque",
  banki: "banque",
  بنك: "banque",
  مصرف: "banque",
  atm: "distributeur",
  dab: "distributeur",
  distributeur: "distributeur",
  distributeurs: "distributeur",
  "cash machine": "distributeur",
  "cash point": "distributeur",
  صراف: "distributeur",
  "injin kudi": "distributeur",
  "station service": "station-service",
  "stations service": "station-service",
  "gas station": "station-service",
  "petrol station": "station-service",
  essence: "station-service",
  carburant: "station-service",
  fuel: "station-service",
  "gidan man fetur": "station-service",
  "محطه وقود": "station-service",
  garage: "garage",
  garages: "garage",
  mechanic: "garage",
  repair: "garage",
  "gidan gyara": "garage",
  ورشه: "garage",
  ecole: "ecole",
  ecoles: "ecole",
  school: "ecole",
  makaranta: "ecole",
  مدرسه: "ecole",
  marche: "marche",
  marches: "marche",
  market: "marche",
  kasuwa: "marche",
  habu: "marche",
  سوق: "marche",
  administration: "administration",
  administrations: "administration",
  government: "administration",
  "government office": "administration",
  "ofishin gwamnati": "administration",
  اداره: "administration",
  commerce: "commerce",
  commerces: "commerce",
  boutique: "commerce",
  boutiques: "commerce",
  shop: "commerce",
  store: "commerce",
  supermarket: "commerce",
  supermarche: "commerce",
  supermarches: "commerce",
  shago: "commerce",
  متجر: "commerce",
  transport: "transport",
  transports: "transport",
  taxi: "transport",
  bus: "transport",
  sufuri: "transport",
  نقل: "transport",
  loisirs: "loisirs",
  leisure: "loisirs",
  park: "loisirs",
  nishadi: "loisirs",
  ترفيه: "loisirs",
  "services professionnels": "services-professionnels",
  "professional services": "services-professionnels",
  services: "services-professionnels",
  mosquee: "lieu-culte",
  mosquees: "lieu-culte",
  mosque: "lieu-culte",
  church: "lieu-culte",
  eglise: "lieu-culte",
  eglises: "lieu-culte",
  culte: "lieu-culte",
  masallaci: "lieu-culte",
  misikiti: "lieu-culte",
  مسجد: "lieu-culte",
  كنيسه: "lieu-culte",
};

const PROXIMITY_PHRASES = [
  "pres de moi",
  "a proximite de moi",
  "a proximite",
  "proche de moi",
  "autour de moi",
  "near me",
  "nearby",
  "around me",
  "close to me",
  "قريب مني",
  "بالقرب مني",
  "kusa da ni",
  "kusa",
  "sambu",
];

const LEAD_PHRASES = [
  "je cherche",
  "je voudrais",
  "je veux",
  "je souhaite",
  "i am looking for",
  "i'm looking for",
  "i would like",
  "ou se trouve",
  "ou est",
  "where can i find",
  "where is",
  "trouve",
  "trouver",
  "cherche",
  "recherche",
  "find",
  "search for",
  "look for",
  "ina neman",
  "ina",
  "neman",
  "ay ga",
  "أبحث عن",
  "أين",
];

const ARTICLES = ["l", "la", "le", "les", "un", "une", "des", "de", "du", "the", "a", "an"];

const GEO_PREFIXES = [
  "dans le quartier",
  "dans la ville",
  "quartier de",
  "quartier",
  "neighborhood",
  "neighbourhood",
  "city",
  "ville",
  "un quartier",
  "une ville",
];

const POLITE = ["s il vous plait", "s'il vous plait", "please", "من فضلك", "don allah"];

const FOLLOW_UPS: Array<{ topic: FollowUpTopic; words: string[] }> = [
  {
    topic: "hours",
    words: [
      "horaire",
      "horaires",
      "ouvert",
      "ouverte",
      "open",
      "opening",
      "hours",
      "وقت",
      "ساعات",
      "lokaci",
    ],
  },
  {
    topic: "phone",
    words: ["telephone", "numero", "phone", "call", "هاتف", "رقم", "waya", "lambar waya"],
  },
  {
    topic: "address",
    words: ["adresse", "address", "situe", "localisation", "عنوان", "adireshi"],
  },
  {
    topic: "distance",
    words: ["distance", "combien", "loin", "km", "مسافه", "nisa"],
  },
  {
    topic: "website",
    words: ["site", "web", "website", "موقع"],
  },
  {
    topic: "open",
    words: ["ouvre", "ouvrir", "fiche", "details", "افتح", "budewa"],
  },
  {
    topic: "next",
    words: ["suivant", "next", "autre", "اخر", "na gaba"],
  },
  {
    topic: "repeat",
    words: ["repete", "repeat", "encore", "أعد", "sake"],
  },
];

export type FollowUpTopic =
  "hours" | "phone" | "address" | "distance" | "website" | "open" | "next" | "repeat";

export type AssistantIntent =
  | { kind: "greeting"; raw: string }
  | {
      kind: "search";
      raw: string;
      query: string | null;
      categorySlug: string | null;
      proximity: boolean;
    }
  | { kind: "followup"; raw: string; topic: FollowUpTopic }
  | { kind: "unknown"; raw: string };

function containsPhrase(text: string, phrase: string): boolean {
  return ` ${text} `.includes(` ${phrase} `);
}

function removePhrase(text: string, phrase: string): string {
  return ` ${text} `.replace(` ${phrase} `, " ").replace(/\s+/g, " ").trim();
}

function stripPrefix(text: string, prefix: string): string | null {
  if (text === prefix) return "";
  if (text.startsWith(`${prefix} `)) return text.slice(prefix.length).trim();
  return null;
}

function stripArticles(text: string): string {
  let current = text;
  for (let index = 0; index < 3; index += 1) {
    const match = ARTICLES.find((article) => current.startsWith(`${article} `));
    if (!match) break;
    current = current.slice(match.length).trim();
  }
  return current;
}

function stripGeoPrefix(text: string): string {
  let current = text;
  for (const prefix of GEO_PREFIXES) {
    const stripped = stripPrefix(current, prefix);
    if (stripped !== null) {
      current = stripped;
      break;
    }
  }
  return current;
}

function findCategory(text: string): { slug: string; alias: string } | null {
  const aliases = Object.keys(CATEGORY_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    if (containsPhrase(text, alias)) return { slug: CATEGORY_ALIASES[alias]!, alias };
  }
  return null;
}

export function categorySlugForText(text: string): string | null {
  const normalized = normalizeSearch(text);
  const category = findCategory(normalized);
  if (!category) return null;
  return hasMeaningfulWords(removePhrase(normalized, category.alias)) ? null : category.slug;
}

function findFollowUp(text: string): FollowUpTopic | null {
  const tokens = new Set(text.split(" ").filter(Boolean));
  for (const followUp of FOLLOW_UPS) {
    if (
      followUp.words.some((word) =>
        word.includes(" ") ? containsPhrase(text, word) : tokens.has(word),
      )
    ) {
      return followUp.topic;
    }
  }
  return null;
}

function hasMeaningfulWords(text: string): boolean {
  return text.split(" ").some((token) => token.length > 1 && !ARTICLES.includes(token));
}

function locationAfterConnector(text: string): string | null {
  for (const connector of ["a", "au", "aux", "dans", "en", "sur"]) {
    if (text.startsWith(`${connector} `)) {
      const location = text.slice(connector.length).trim();
      const first = location.split(" ")[0];
      if (hasMeaningfulWords(location) && first && !ARTICLES.includes(first)) return location;
    }
  }
  return null;
}

export function parseAssistantQuery(raw: string): AssistantIntent {
  const normalized = normalizeSearch(raw);
  if (!normalized) return { kind: "unknown", raw };

  let text = normalized;
  for (const polite of POLITE) {
    if (containsPhrase(text, polite)) text = removePhrase(text, polite);
  }

  const greetings = [
    "bonjour",
    "bonsoir",
    "salut",
    "hello",
    "hi",
    "salam",
    "assalam",
    "fofo",
    "barka",
  ];
  const greeting = greetings.find((word) => text === word || text.startsWith(`${word} `));
  if (greeting) {
    text = text.slice(greeting.length).trim();
    if (!text) return { kind: "greeting", raw };
  }

  for (const lead of LEAD_PHRASES) {
    const stripped = stripPrefix(text, lead);
    if (stripped !== null) {
      text = stripped;
      break;
    }
  }
  text = stripArticles(text);
  text = stripGeoPrefix(text);
  text = stripArticles(text);

  let proximity = false;
  for (const phrase of PROXIMITY_PHRASES) {
    if (containsPhrase(text, phrase)) {
      proximity = true;
      text = removePhrase(text, phrase);
    }
  }
  text = stripArticles(text).trim();

  const category = findCategory(text);
  if (category) {
    const withoutCategory = removePhrase(text, category.alias);
    const location = locationAfterConnector(withoutCategory);
    const query = location ?? (hasMeaningfulWords(withoutCategory) ? text : null);
    return { kind: "search", raw, query, categorySlug: category.slug, proximity };
  }

  const followUp = findFollowUp(text);
  if (followUp) return { kind: "followup", raw, topic: followUp };

  if (!hasMeaningfulWords(text)) return { kind: "unknown", raw };
  return { kind: "search", raw, query: text, categorySlug: null, proximity };
}
