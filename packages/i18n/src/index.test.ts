import { describe, expect, it } from "vitest";
import ar from "../locales/ar.json";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import { dir, formatNumber, t } from "./index";

describe("catalogues", () => {
  it("ont exactement les mêmes clés", () => {
    const reference = Object.keys(fr).sort();
    expect(Object.keys(en).sort()).toEqual(reference);
    expect(Object.keys(ar).sort()).toEqual(reference);
  });
  it("ne contiennent aucune valeur vide", () => {
    for (const catalog of [fr, en, ar]) {
      for (const value of Object.values(catalog)) expect(value.trim()).not.toBe("");
    }
  });
});

describe("direction", () => {
  it("passe en RTL uniquement pour l'arabe", () => {
    expect(dir("fr")).toBe("ltr");
    expect(dir("en")).toBe("ltr");
    expect(dir("ar")).toBe("rtl");
  });
});

describe("t", () => {
  it("renvoie la traduction demandée", () => {
    expect(t("ar", "nav.search")).toBe("بحث");
  });
});

describe("formatNumber", () => {
  it("conserve les chiffres latins en arabe", () => {
    expect(formatNumber("ar", 1234.5)).toMatch(/1/);
  });
});
