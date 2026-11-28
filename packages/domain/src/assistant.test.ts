import { describe, expect, it } from "vitest";
import {
  assistantSpeechLanguages,
  greetingPeriod,
  hourInTimeZone,
  parseAssistantQuery,\n  isTravelRequest,\n  travelModeForText,\n  travelSearchIntent,
} from "./assistant";

describe("salutation locale", () => {
  it("dit bonjour de 05:00 à 13:59", () => {
    expect(greetingPeriod(new Date("2026-11-21T05:00:00Z"), "UTC")).toBe("morning");
    expect(greetingPeriod(new Date("2026-11-21T13:59:00Z"), "UTC")).toBe("morning");
  });
  it("dit bonsoir dès 14:00 et avant 05:00", () => {
    expect(greetingPeriod(new Date("2026-11-21T14:00:00Z"), "UTC")).toBe("evening");
    expect(greetingPeriod(new Date("2026-11-21T04:59:00Z"), "UTC")).toBe("evening");
  });
  it("utilise le fuseau réel du lieu", () => {
    expect(hourInTimeZone(new Date("2026-11-21T13:30:00Z"), "Africa/Niamey")).toBe(14);
    expect(hourInTimeZone(new Date("2026-11-21T13:30:00Z"), "Africa/Bamako")).toBe(13);
    expect(hourInTimeZone(new Date("2026-11-21T13:30:00Z"), "Africa/Ouagadougou")).toBe(13);
  });
  it("retombe sur l'horloge de l'appareil pour un fuseau inconnu", () => {
    const date = new Date("2026-11-21T10:00:00Z");
    expect(hourInTimeZone(date, "Fuseau/Inconnu")).toBe(date.getHours());
  });
});

describe("compréhension des demandes", () => {
  it("demande une précision pour une demande générale de voyage", () => {
    expect(isTravelRequest("Je veux voyager")).toBe(true);
    expect(isTravelRequest("I want to travel")).toBe(true);
    expect(isTravelRequest("Je cherche un restaurant")).toBe(false);
  });

  it("reconnaît le moyen de transport choisi et prépare la recherche", () => {
    expect(travelModeForText("Par avion")).toBe("plane");
    expect(travelModeForText("Je préfère le bus")).toBe("bus");
    expect(travelModeForText("Depuis l'auto-gare")).toBe("bus");
    expect(travelModeForText("En train")).toBe("train");
    expect(travelModeForText("Je ne sais pas")).toBe(null);
    expect(travelSearchIntent("bus")).toMatchObject({
      kind: "search", categorySlug: "transport", query: "gare routiere",
    });
  });

  it("comprend une catégorie et la proximité en français", () => {
    const intent = parseAssistantQuery("Trouve une pharmacie près de moi.");
    expect(intent).toMatchObject({
      kind: "search",
      categorySlug: "pharmacie",
      proximity: true,
      query: null,
    });
  });

  it("comprend un nom d'établissement sans le remplacer", () => {
    const intent = parseAssistantQuery("Où se trouve l'hôtel Univers ?");
    expect(intent).toMatchObject({
      kind: "search",
      categorySlug: "hotel",
      query: "hotel univers",
    });
  });

  it("comprend un restaurant au bord du fleuve comme catégorie avec critère descriptif", () => {
    expect(parseAssistantQuery("Trouve-moi un restaurant au bord du fleuve")).toMatchObject({
      kind: "search",
      categorySlug: "restaurant",
      query: "fleuve",
    });
    expect(parseAssistantQuery("Je cherche un restaurant près du fleuve")).toMatchObject({
      kind: "search",
      categorySlug: "restaurant",
      query: "fleuve",
    });
    expect(parseAssistantQuery("Find a restaurant by the river")).toMatchObject({
      kind: "search",
      categorySlug: "restaurant",
      query: "fleuve",
    });
  });

  it("comprend plusieurs formulations naturelles de recherche par critère", () => {
    for (const request of [
      "Trouve-moi un restaurant au bord du fleuve",
      "Je cherche un restaurant près du fleuve",
      "Un restaurant sur les rives du fleuve",
      "Find a restaurant by the river",
      "Find a riverside restaurant",
      "أبحث عن مطعم على ضفاف النهر",
    ]) {
      expect(parseAssistantQuery(request)).toMatchObject({
        kind: "search",
        categorySlug: "restaurant",
        query: "fleuve",
      });
    }
  });

  it("conserve un critère descriptif générique après la catégorie", () => {
    expect(parseAssistantQuery("Je cherche un restaurant avec terrasse")).toMatchObject({
      kind: "search",
      categorySlug: "restaurant",
      query: "restaurant avec terrasse",
    });
  });

  it("comprend un quartier", () => {
    expect(parseAssistantQuery("Je cherche le quartier Yantala.")).toMatchObject({
      kind: "search",
      query: "yantala",
      categorySlug: null,
    });
  });

  it("sépare une catégorie d'une ville", () => {
    expect(parseAssistantQuery("Les restaurants à Bamako")).toMatchObject({
      kind: "search",
      categorySlug: "restaurant",
      query: "bamako",
    });
  });

  it("conserve le nom mal orthographié", () => {
    expect(parseAssistantQuery("Pharmacie la fayete")).toMatchObject({
      kind: "search",
      categorySlug: "pharmacie",
      query: "pharmacie la fayete",
    });
  });

  it("comprend les catégories en anglais, arabe, haoussa et zarma", () => {
    expect(parseAssistantQuery("Find a pharmacy near me")).toMatchObject({
      kind: "search",
      categorySlug: "pharmacie",
      proximity: true,
      query: null,
    });
    expect(parseAssistantQuery("أبحث عن صيدلية")).toMatchObject({
      kind: "search",
      categorySlug: "pharmacie",
    });
    expect(parseAssistantQuery("Ina neman kantin magani kusa da ni")).toMatchObject({
      kind: "search",
      categorySlug: "pharmacie",
      proximity: true,
      query: null,
    });
    expect(parseAssistantQuery("Ay ga farmasi sambu")).toMatchObject({
      kind: "search",
      categorySlug: "pharmacie",
      proximity: true,
      query: null,
    });
  });

  it("ne confond pas une catégorie avec une question complémentaire", () => {
    expect(parseAssistantQuery("Pharmacie ouverte")).toMatchObject({
      kind: "search",
      categorySlug: "pharmacie",
    });
  });

  it("reconnaît les questions complémentaires", () => {
    expect(parseAssistantQuery("Quels sont les horaires ?")).toMatchObject({
      kind: "followup",
      topic: "hours",
    });
    expect(parseAssistantQuery("Et le téléphone ?")).toMatchObject({
      kind: "followup",
      topic: "phone",
    });
  });

  it("distingue une salutation d'une recherche", () => {
    expect(parseAssistantQuery("Bonjour")).toEqual({ kind: "greeting", raw: "Bonjour" });
    expect(parseAssistantQuery("Bonjour, pharmacie")).toMatchObject({
      kind: "search",
      categorySlug: "pharmacie",
    });
  });

  it("ne devine pas une intention vide", () => {
    expect(parseAssistantQuery("...")).toEqual({ kind: "unknown", raw: "..." });
  });

  it("expose les codes de reconnaissance vocale", () => {
    expect(assistantSpeechLanguages.fr).toBe("fr-FR");
    expect(assistantSpeechLanguages.ar).toBe("ar-SA");
    expect(assistantSpeechLanguages.ha).toBe("ha-NG");
    expect(assistantSpeechLanguages.za).toBe("dje");
  });
});
