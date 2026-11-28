import { expect, test, type Page } from "@playwright/test";

function distancesFromCards(page: Page) {
  return page.locator("main section ul li").evaluateAll((cards) =>
    cards
      .map((card) => {
        const match = card.textContent?.match(/(\d+(?:[.,]\d+)?)\s*(km|m)/);
        if (!match) return null;
        const value = Number(match[1].replace(",", "."));
        return match[2] === "km" ? value * 1000 : value;
      })
      .filter((value): value is number => value !== null),
  );
}

test("l'accueil reste simple sans recherche", async ({ page }) => {
  await page.goto("/fr");

  await expect(page.getByText("Cherchez un lieu")).toBeVisible();
  await expect(page.getByRole("button", { name: "Autour de moi" })).toBeVisible();
  await expect(page.locator("main section ul li")).toHaveCount(0);
  await expect(page.getByText(/résultats/)).toHaveCount(0);
});

test("une recherche texte affiche des résultats", async ({ page }) => {
  await page.goto("/fr?q=pharmacie");

  await expect(page.locator('input[name="q"]')).toHaveValue("pharmacie");
  await expect(page.getByText(/résultats/).first()).toBeVisible();
  await expect(page.locator("main section ul li").first()).toBeVisible();
  expect(await page.locator("main section ul li").count()).toBeGreaterThan(0);
});

test("le filtre catégorie relance la recherche", async ({ page }) => {
  await page.goto("/fr");
  await page.locator('select[name="category"]').selectOption("pharmacie");
  await expect(page).toHaveURL(/category=pharmacie/);

  await expect(page.locator("main section ul li").first()).toBeVisible();
  await expect(page.locator("main section ul li").first()).toContainText("Pharmacie");
});

test.describe("avec une position autorisée", () => {
  test.use({
    geolocation: { latitude: 13.5158061, longitude: 2.1360744 },
    permissions: ["geolocation"],
  });

  test("le bouton demande la position et trie par distance", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "permissions", {
        configurable: true,
        value: { query: async () => ({ state: "prompt" }) },
      });
    });

    await page.goto("/fr");
    await expect(page.getByText("Cherchez un lieu")).toBeVisible();
    await page.getByRole("button", { name: "Autour de moi" }).click();
    await expect(page).toHaveURL(/lat=13\.5158061/);
    await expect(page.getByText("Les plus proches d’abord")).toBeVisible();
    await expect(page.locator("main section ul li").first()).toBeVisible();
    await expect(page.locator("main section ul li").first()).toContainText(
      /\d+(?:[.,]\d+)?\s*(km|m)/,
    );

    const distances = await distancesFromCards(page);
    expect(distances.length).toBeGreaterThan(0);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));

    await page.getByRole("button", { name: "Effacer la position" }).click();
    await expect(page).not.toHaveURL(/[?&]lat=/);
    await expect(page.getByText("Cherchez un lieu")).toBeVisible();
  });

  test("la position est reprise automatiquement", async ({ page }) => {
    await page.goto("/fr");
    await expect(page).toHaveURL(/lat=13\.5158061/);
    await expect(page.locator("main section ul li").first()).toBeVisible();
  });
});

test("la recherche vocale remplit et lance la requête", async ({ page }) => {
  await page.addInitScript(() => {
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
          this.onresult?.({ results: [[{ transcript: "pharmacie" }]] });
          this.onend?.();
        }, 20);
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
  });

  await page.goto("/fr");
  await page.getByRole("button", { name: "Recherche vocale" }).click();
  await expect(page).toHaveURL(/q=pharmacie/);

  await expect(page.locator('input[name="q"]')).toHaveValue("pharmacie");
  await expect(page.locator("main section ul li").first()).toBeVisible();
});

test.describe("sans JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("la recherche reste rendue par le serveur", async ({ page }) => {
    await page.goto("/fr?q=pharmacie");

    await expect(page.locator("main section ul li").first()).toBeVisible();
    await expect(page.getByText("Cherchez un lieu")).toHaveCount(0);
  });
});
