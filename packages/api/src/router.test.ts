import { describe, expect, it } from "vitest";
import type { Context, ModerationPlace } from "./context";
import { appRouter } from "./router";

const ctx: Context = {
  user: null,
  client: { ip: "127.0.0.1", ipHash: "test-client", userAgent: "vitest" },
  contributions: {
    async create() {
      return { id: "usr_1", submissionToken: "token" };
    },
    async addPhoto() {},
    async verifySubmission() {
      return true;
    },
  },
  reports: {
    async create() {
      return { id: "sig_1" };
    },
  },
  moderation: {
    async listPending() {
      return [];
    },
    async findPending() {
      return null;
    },
    async approve() {},
    async reject() {},
    async listReports() {
      return [];
    },
    async resolveReport() {},
  },
  rateLimits: {
    async consume() {
      return { allowed: true, remaining: 4, resetAt: Date.now() + 3_600_000 };
    },
  },
  audit: {
    async append() {},
  },
  turnstile: {
    async verify() {
      return true;
    },
  },
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
            photos: [],
          },
        ],
        nextCursor: null,
        total: 1,
      };
    },
    async listPublishedIds() {
      return ["p1"];
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
            photos: [],
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

const admin = {
  id: "admin",
  email: "admin@upk.test",
  roles: ["admin"],
  permissions: ["moderation:write"],
};

const pendingPlace: ModerationPlace = {
  id: "usr_1",
  nom: "Pharmacie test",
  categorieSlug: "pharmacie",
  categorieNom: "Pharmacie",
  description: null,
  quartier: "Plateau",
  adresse: null,
  ville: "Niamey",
  latitude: 13.5,
  longitude: 2.1,
  telephone: null,
  whatsapp: null,
  siteWeb: null,
  horaires: null,
  contactEmail: "test@example.com",
  gpsPrecisionM: 30,
  statutPublication: "en_attente",
  createdAt: "2026-11-22T00:00:00.000Z",
  ownerId: null,
  photos: [],
};

const contribution = {
  nom: "Pharmacie test",
  categorySlug: "pharmacie",
  latitude: 13.5,
  longitude: 2.1,
  turnstileToken: "ok",
};

function makeContext(overrides: Partial<Context> = {}): Context {
  return { ...ctx, ...overrides };
}

describe("contributions et modération", () => {
  it("crée une proposition et l'audite", async () => {
    const actions: string[] = [];
    const caller = appRouter.createCaller(
      makeContext({
        audit: {
          async append(entry) {
            actions.push(entry.action);
          },
        },
      }),
    );
    const result = await caller.contributions.create(contribution);
    expect(result.id).toBe("usr_1");
    expect(actions).toEqual(["contribution.create"]);
  });

  it("refuse une proposition au-delà du quota", async () => {
    const caller = appRouter.createCaller(
      makeContext({
        rateLimits: {
          async consume() {
            return { allowed: false, remaining: 0, resetAt: Date.now() };
          },
        },
      }),
    );
    await expect(caller.contributions.create(contribution)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });

  it("refuse un Turnstile invalide", async () => {
    const caller = appRouter.createCaller(
      makeContext({
        turnstile: {
          async verify() {
            return false;
          },
        },
      }),
    );
    await expect(caller.contributions.create(contribution)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("crée un signalement pour un lieu publié", async () => {
    const result = await appRouter
      .createCaller(makeContext())
      .reports.create({ placeId: "p1", typeProbleme: "ferme", turnstileToken: "ok" });
    expect(result.id).toBe("sig_1");
  });

  it("réserve la file de modération aux administrateurs", async () => {
    await expect(appRouter.createCaller(ctx).moderation.pending()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    const caller = appRouter.createCaller(makeContext({ user: admin }));
    await expect(caller.moderation.pending()).resolves.toEqual([]);
    await expect(caller.moderation.me()).resolves.toEqual({ isAdmin: true });
  });

  it("exige une confirmation si le GPS dépasse 20 m", async () => {
    const actions: string[] = [];
    const caller = appRouter.createCaller(
      makeContext({
        user: admin,
        moderation: {
          ...ctx.moderation,
          async findPending() {
            return pendingPlace;
          },
        },
        audit: {
          async append(entry) {
            actions.push(entry.action);
          },
        },
      }),
    );
    await expect(caller.moderation.approve({ id: "usr_1" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(caller.moderation.approve({ id: "usr_1", forceGps: true })).resolves.toEqual({
      ok: true,
    });
    expect(actions).toEqual(["contribution.approve"]);
  });

  it("enregistre un rejet motivé", async () => {
    const caller = appRouter.createCaller(
      makeContext({
        user: admin,
        moderation: {
          ...ctx.moderation,
          async findPending() {
            return pendingPlace;
          },
        },
      }),
    );
    await expect(
      caller.moderation.reject({ id: "usr_1", motif: "Doublon existant" }),
    ).resolves.toEqual({ ok: true });
  });
});
