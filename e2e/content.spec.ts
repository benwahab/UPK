import { expect, test } from "@playwright/test";

test("les photos restent masquées tant que R2 est désactivé", async ({ page }) => {
  await page.goto("/fr/contribuer");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});

test("la confidentialité couvre la position et la voix", async ({ page }) => {
  await page.goto("/fr/confidentialite");

  await expect(page.getByText(/Autour de moi/)).toBeVisible();
  await expect(page.getByText(/reconnaissance vocale/i)).toBeVisible();
  await expect(page.getByText(/photos est temporairement désactivé/i)).toBeVisible();
});
