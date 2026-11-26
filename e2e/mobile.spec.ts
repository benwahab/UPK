import { expect, test } from "@playwright/test";

test("le bandeau d'installation mobile utilise beforeinstallprompt", async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) >= 600, "parcours mobile uniquement");

  await page.goto("/fr");
  await page.waitForLoadState("networkidle");

  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
  });

  const install = page.getByRole("button", { name: "Installer UPK" });
  await expect(install).toBeVisible();
  await install.click();
  await expect(install).toBeHidden();
});
