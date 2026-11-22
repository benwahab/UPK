import { readFileSync } from "node:fs";
import { schema, type Database } from "@upk/db";
import Sqlite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";
import { createD1CategoryRepository, createD1PlaceRepository } from "./repositories";

function createTestDb() {
  const sqlite = new Sqlite(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const migration = new URL("../../db/migrations/0001_init.sql", import.meta.url);
  sqlite.exec(readFileSync(migration, "utf8"));

  const db = drizzle(sqlite, { schema });
  const now = new Date().toISOString();
  const insertCategory = sqlite.prepare(
    "INSERT INTO categories (id, nom, slug, ordre, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  insertCategory.run("cat_pharmacie", "Pharmacie", "pharmacie", 0, now);
  insertCategory.run("cat_ecole", "École", "ecole", 1, now);

  const insertPlace = sqlite.prepare(`
    INSERT INTO places (
      id, nom, nom_normalise, category_id, quartier, latitude, longitude,
      telephone, telephone_normalise, statut_publication, statut_verification,
      source, langue, actif, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'valide', ?, 'test', 'fr', 1, ?, ?)
  `);
  insertPlace.run(
    "p1",
    "Pharmacie du Plateau",
    "pharmacie du plateau",
    "cat_pharmacie",
    "Plateau",
    13.511,
    2.112,
    "+22790000001",
    "+22790000001",
    "source_fiable",
    now,
    now,
  );
  insertPlace.run(
    "p2",
    "École primaire Bobiel",
    "ecole primaire bobiel",
    "cat_ecole",
    "Bobiel",
    13.52,
    2.12,
    null,
    null,
    "a_verifier",
    now,
    now,
  );
  insertPlace.run(
    "p3",
    "صيدلية النور",
    "صيدليه النور",
    "cat_pharmacie",
    "Yantala",
    13.53,
    2.13,
    null,
    null,
    "a_verifier",
    now,
    now,
  );

  return db;
}

describe("repositories D1", () => {
  const db = createTestDb();
  const places = createD1PlaceRepository(db as unknown as Database);
  const categories = createD1CategoryRepository(db as unknown as Database);

  it("recherche latine via FTS5", async () => {
    const result = await places.search({ q: "pharmacie", limit: 20 });
    expect(result.items.map((place) => place.id)).toContain("p1");
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  it("recherche arabe normalisée", async () => {
    const result = await places.search({ q: "صيدلية", limit: 20 });
    expect(result.items.map((place) => place.id)).toContain("p3");
  });

  it("filtre par catégorie", async () => {
    const result = await places.search({ categorySlug: "ecole", limit: 20 });
    expect(result.items.map((place) => place.id)).toEqual(["p2"]);
  });

  it("calcule la distance et applique le rayon", async () => {
    const result = await places.search({ lat: 13.511, lng: 2.112, radiusKm: 1, limit: 20 });
    expect(result.items[0]?.id).toBe("p1");
    expect(result.items[0]?.distanceM).toBeLessThan(100);
    expect(
      result.items.every((place) => (place.distanceM ?? Number.POSITIVE_INFINITY) <= 1000),
    ).toBe(true);
  });

  it("lit un lieu par identifiant", async () => {
    expect((await places.byId("p1"))?.nom).toBe("Pharmacie du Plateau");
    expect(await places.byId("absent")).toBeNull();
  });

  it("liste les catégories", async () => {
    const list = await categories.list("fr");
    expect(list.map((category) => category.slug)).toContain("pharmacie");
  });

  it("liste les identifiants publiés", async () => {
    expect(await places.listPublishedIds()).toEqual(["p1", "p2", "p3"]);
  });
});
