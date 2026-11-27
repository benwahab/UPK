import { expect, test } from "@playwright/test";

test.skip(!process.env.E2E_BASE_URL, "nécessite un déploiement avec service worker");

test("le service worker met les pages en cache", async ({ page }) => {
  await page.goto("/fr");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(async () => {
    const keys = await caches.keys();
    return keys.includes("upk-v4-pages");
  });

  const paths = await page.evaluate(async () => {
    const cache = await caches.open("upk-v4-pages");
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });

  expect(paths).toContain("/fr");
});
