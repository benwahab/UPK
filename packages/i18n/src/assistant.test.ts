import { describe, expect, it } from "vitest";
import {
  assistantLanguageLabels,
  assistantLanguages,
  assistantText,
  assistantVoiceSupport,
} from "./assistant";

describe("catalogues assistant", () => {
  it("couvrent les trois langues prises en charge", () => {
    expect(assistantLanguages).toEqual(["fr", "en", "ar"]);
    for (const language of assistantLanguages) {
      expect(assistantLanguageLabels[language].trim()).not.toBe("");
    }
  });

  it("conservent le message exact du lieu introuvable", () => {
    expect(assistantText("fr", "assistant.notFound")).toBe(
      "Je n'ai pas trouvé cet endroit dans UPK.\n\nVous rendez-vous à cet endroit actuellement ? Si oui, vous pouvez l'ajouter à UPK pour permettre à d'autres utilisateurs de le retrouver.",
    );
  });

  it("conservent le message exact d'incompréhension", () => {
    expect(assistantText("fr", "assistant.notUnderstood")).toBe(
      "Désolé, je n'ai pas bien compris votre demande. Pouvez-vous l'écrire pour que je puisse vous aider ?",
    );
  });

  it("interpolent les valeurs", () => {
    expect(assistantText("fr", "assistant.found", { name: "Pharmacie La Fayette" })).toBe(
      "J’ai trouvé Pharmacie La Fayette.",
    );
  });

  it("déclarent les trois langues prises en charge pour la voix", () => {
    expect(assistantVoiceSupport).toEqual({ fr: "native", en: "native", ar: "native" });
  });
});
