import { describe, expect, it } from "vitest";
import { normalizeArabic, normalizeLatin, normalizePhone, normalizeSearch } from "./normalize";

describe("normalizeLatin", () => {
  it("supprime les accents et la casse", () => {
    expect(normalizeLatin("École  Privée")).toBe("ecole privee");
  });
  it("gère les apostrophes", () => {
    expect(normalizeLatin("Chez l'Ambassadeur")).toBe("chez l ambassadeur");
  });
});

describe("normalizeArabic", () => {
  it("supprime les harakat", () => {
    expect(normalizeArabic("مَدْرَسَة")).toBe("مدرسه");
  });
  it("unifie alef et ya", () => {
    expect(normalizeArabic("أحمد")).toBe("احمد");
    expect(normalizeArabic("مصطفى")).toBe("مصطفي");
  });
});

describe("normalizeSearch", () => {
  it("choisit la normalisation selon le script", () => {
    expect(normalizeSearch("Pharmacie")).toBe("pharmacie");
    expect(normalizeSearch("صيدلية")).toBe("صيدليه");
  });
});

describe("normalizePhone", () => {
  it("normalise un numéro nigérien à 8 chiffres", () => {
    expect(normalizePhone("20 73 34 12")).toBe("+22720733412");
  });
  it("accepte le préfixe international", () => {
    expect(normalizePhone("+227 20 73 34 12")).toBe("+22720733412");
  });
  it("rejette un numéro invalide", () => {
    expect(normalizePhone("123")).toBeNull();
  });
});
