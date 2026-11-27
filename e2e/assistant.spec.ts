import { expect, test, type Page } from "@playwright/test";

type AssistantWindow = Window & {
  __assistant?: { transcript: string; blocked?: boolean; spoken: string[] };
};

async function installFakeSpeech(
  page: Page,
  options: { transcript?: string; now?: string; blocked?: boolean } = {},
) {
  await page.addInitScript(
    ({ transcript, now, blocked }) => {
      const state = { transcript, blocked, spoken: [] as string[] };
      (window as AssistantWindow).__assistant = state;

      if (now) {
        const RealDate = Date;
        class FakeDate extends RealDate {
          constructor(...args: ConstructorParameters<typeof Date>) {
            if (args.length === 0) super(now);
            else super(...args);
          }
          static override now() {
            return new RealDate(now).getTime();
          }
        }
        Object.defineProperty(window, "Date", { configurable: true, value: FakeDate });
      }

      class FakeUtterance {
        text: string;
        lang = "";
        voice: SpeechSynthesisVoice | null = null;
        rate = 1;
        pitch = 1;
        onstart: (() => void) | null = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) {
          this.text = text;
        }
      }

      const synth = {
        speaking: false,
        getVoices: () => [
          { lang: "fr-FR", name: "Français" },
          { lang: "en-US", name: "English" },
          { lang: "ar-SA", name: "العربية" },
        ],
        speak: (utterance: FakeUtterance) => {
          state.spoken.push(utterance.text);
          if (blocked) return;
          synth.speaking = true;
          setTimeout(() => {
            synth.speaking = false;
            utterance.onstart?.();
            utterance.onend?.();
          }, 5);
        },
        cancel: () => {
          synth.speaking = false;
        },
      };

      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        configurable: true,
        value: FakeUtterance,
      });
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synth });

      type FakeResultEvent = {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      };
      class FakeSpeechRecognition {
        lang = "";
        continuous = false;
        interimResults = false;
        maxAlternatives = 1;
        onresult: ((event: FakeResultEvent) => void) | null = null;
        onerror: (() => void) | null = null;
        onend: (() => void) | null = null;
        start() {
          setTimeout(() => {
            this.onresult?.({ results: [[{ transcript: state.transcript }]] });
            this.onend?.();
          }, 10);
        }
        stop() {
          this.onend?.();
        }
        abort() {}
      }
      Object.defineProperty(window, "SpeechRecognition", {
        configurable: true,
        value: FakeSpeechRecognition,
      });
    },
    {
      transcript: options.transcript ?? "Trouve une pharmacie près de moi",
      now: options.now,
      blocked: options.blocked ?? false,
    },
  );
}

test.describe("assistant vocal UPK", () => {
  test.use({
    timezoneId: "Africa/Niamey",
    geolocation: { latitude: 13.5158061, longitude: 2.1360744 },
    permissions: ["geolocation"],
  });

  test("accueille une seule fois par ouverture, le matin", async ({ page }) => {
    await installFakeSpeech(page, { now: "2026-11-21T08:00:00Z" });
    await page.goto("/fr");
    await expect
      .poll(() => page.evaluate(() => (window as AssistantWindow).__assistant?.spoken[0]))
      .toContain("Bonjour et bienvenue sur UPK !");
    const firstCount = await page.evaluate(
      () => (window as AssistantWindow).__assistant?.spoken.length ?? 0,
    );
    await page.getByRole("link", { name: "À propos" }).first().click();
    await expect(page).toHaveURL(/a-propos/);
    await page.waitForTimeout(1_000);
    expect(
      await page.evaluate(() => (window as AssistantWindow).__assistant?.spoken.length ?? 0),
    ).toBe(firstCount);
  });

  test("dit bonsoir après 14 h locales", async ({ page }) => {
    await installFakeSpeech(page, { now: "2026-11-21T15:00:00Z" });
    await page.goto("/fr");
    await expect
      .poll(() => page.evaluate(() => (window as AssistantWindow).__assistant?.spoken[0]))
      .toContain("Bonsoir et bienvenue sur UPK !");
  });

  test("propose d'activer la voix quand l'autoplay est bloqué", async ({ page }) => {
    await installFakeSpeech(page, { now: "2026-11-21T08:00:00Z", blocked: true });
    await page.goto("/fr");
    await expect(page.getByRole("button", { name: "Activer la voix" })).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: /assistant vocal/ }).click();
    await expect(page.getByText(/lecture automatique est bloquée/)).toBeVisible();
  });

  test("respecte la désactivation de l'accueil vocal", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("upk-assistant-greeting", "off"));
    await installFakeSpeech(page, { now: "2026-11-21T08:00:00Z" });
    await page.goto("/fr");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1_000);
    expect(
      await page.evaluate(() => (window as AssistantWindow).__assistant?.spoken.length ?? 0),
    ).toBe(0);

    await page.getByRole("button", { name: /assistant vocal/ }).click();
    const toggle = page.getByLabel("Accueil vocal");
    await expect(toggle).not.toBeChecked();
    await toggle.check();
    await expect
      .poll(() => page.evaluate(() => (window as AssistantWindow).__assistant?.spoken.length ?? 0))
      .toBeGreaterThan(0);
  });

  test("comprend une catégorie vocale et utilise la position fraîche", async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto("/fr");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /assistant vocal/ }).click();
    await page.getByRole("button", { name: "Parler à l’assistant" }).click();

    await expect(page).toHaveURL(/category=pharmacie/);
    await expect(page).toHaveURL(/lat=13\.5158061/);
    await expect(page.getByText(/résultats pour pharmacie/i).first()).toBeVisible();
  });

  test("propose l'écrit après une incompréhension vocale", async ({ page }) => {
    await installFakeSpeech(page, { transcript: "..." });
    await page.goto("/fr");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /assistant vocal/ }).click();
    await page.getByRole("button", { name: "Parler à l’assistant" }).click();

    await expect(
      page.getByText(
        "Désolé, je n'ai pas bien compris votre demande. Pouvez-vous l'écrire pour que je puisse vous aider ?",
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Écrire la demande" }).click();
    await page.getByLabel("Écrivez votre recherche…").fill("pharmacie");
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page).toHaveURL(/category=pharmacie/);
    await expect(page.getByText(/résultats pour pharmacie/i).first()).toBeVisible();
  });

  test("affiche le message de contribution quand le lieu est introuvable", async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto("/fr");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /assistant vocal/ }).click();
    await page.getByLabel("Écrivez votre recherche…").fill("zzzz introuvable");
    await page.getByRole("button", { name: "Envoyer" }).click();

    await expect(page.getByText(/Je n'ai pas trouvé cet endroit dans UPK\./).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Ajouter ce lieu" }).first()).toBeVisible();
  });

  test("propose une correction sans remplacer le lieu recherché", async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto("/fr?q=pharmacie%20des%20arene");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("status").filter({ hasText: "Aucun nom exact" })).toBeVisible();
    const suggestion = page.getByRole("button", { name: /Vouliez-vous dire/ });
    await expect(suggestion).toBeVisible();
    await suggestion.click();
    await expect(page).toHaveURL(/q=Pharmacie/);
    await expect(page.locator("main section ul li").first()).toContainText("Pharmacie des Arènes");
  });

  test("répond à une question complémentaire sans relancer la recherche", async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto("/fr");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /assistant vocal/ }).click();
    await page.getByRole("button", { name: "Parler à l’assistant" }).click();
    await expect(page).toHaveURL(/category=pharmacie/);
    await page.getByLabel("Écrivez votre recherche…").fill("horaires");
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(
      page.getByText(/Horaires :|Cette information n.?est pas renseignée/).first(),
    ).toBeVisible();
    await expect(page).toHaveURL(/category=pharmacie/);
  });

  test("change de langue sans changer automatiquement la langue de recherche", async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto("/fr");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /assistant vocal/ }).click();
    await page.getByLabel("Langue de l’assistant").selectOption("en");
    await expect(page.getByPlaceholder("Type your search…")).toBeVisible();
    await expect(page.getByRole("heading", { name: "UPK Assistant" })).toBeVisible();
  });
});
