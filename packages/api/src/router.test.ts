import { describe, expect, it } from "vitest";
import type { Context } from "./context";
import { appRouter } from "./router";

const ctx: Context = {
  user: null,
  places: {
    async search() {
      return {
        items: [
          {
            id: "p1",
            nom: "Pharmacie du Fleuve",
            categorieSlug: "pharmacie",
            categorieNom: "Pharmacie",
            quartier: "Plateau",
            ville: "Niamey",
            latitude: 13.5,
            longitude: 2.1,
            telephone: "+22720733412",
            verifie: true,
            distanceM: 320,
          },
        ],
        nextCursor: null,
        total: 1,
      };
    },
    async byId(id) {
      return id === "p1"
        ? {
            id,
            nom: "Pharmacie du Fleuve",
            categorieSlug: "pharmacie",
            categorieNom: "Pharmacie",
            quartier: "Plateau",
            ville: "Niamey",
            latitude: 13.5,
            longitude: 2.1,
            telephone: "+22720733412",
            verifie: true,
            distanceM: null,
          }
        : null;
    },
  },
  categories: {
    async list() {
      return [{ id: "cat_pharmacie", slug: "pharmacie", nom: "Pharmacie", ordre: 0 }];
    },
  },
};

describe("appRouter", () => {
  it("recherche des lieux", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.search.places({ q: "pharmacie" });
    expect(result.total).toBe(1);
    expect(result.items[0]?.nom).toBe("Pharmacie du Fleuve");
  });

  it("renvoie null pour un lieu inconnu", async () => {
    const caller = appRouter.createCaller(ctx);
    await expect(caller.places.byId({ id: "inconnu" })).resolves.toBeNull();
  });

  it("refuse une position incomplète", async () => {
    const caller = appRouter.createCaller(ctx);
    await expect(caller.search.places({ q: "x", lat: 13.5 })).rejects.toThrow();
  });
});
