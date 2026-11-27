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
  const geoMigration = new URL("../../db/migrations/0004_sahel_geo.sql", import.meta.url);
  sqlite.exec(readFileSync(geoMigration, "utf8"));

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
  insertPlace.run(
    "p4",
    "AAA Pharmacie lointaine",
    "aaa pharmacie lointaine",
    "cat_pharmacie",
    "Ouagadougou",
    12.37,
    -1.52,
    null,
    null,
    "source_fiable",
    now,
    now,
  );

  sqlite.exec(`
    INSERT INTO regions (id, nom, slug, country_code) VALUES ('r1', 'Niamey', 'niamey', 'NE');
    INSERT INTO departements (id, region_id, nom, slug) VALUES ('d1', 'r1', 'Niamey', 'niamey');
    INSERT INTO communes (id, departement_id, nom, slug) VALUES ('c1', 'd1', 'Niamey', 'niamey');
    INSERT INTO villes_zones (id, commune_id, nom, slug, nom_normalise, latitude, longitude)
      VALUES ('v1', 'c1', 'Niamey', 'niamey', 'niamey', 13.51, 2.11);
    INSERT INTO quartiers (id, ville_zone_id, commune_id, nom, slug, nom_normalise, latitude, longitude, source, created_at)
      VALUES ('q1', 'v1', 'c1', 'Plateau', 'plateau', 'plateau', 13.511, 2.112, 'test', '2026-01-01'),
             ('q2', 'v1', 'c1', 'Yantala', 'yantala', 'yantala', 13.53, 2.13, 'test', '2026-01-01');
    UPDATE places SET quartier_id = 'q1', region_id = 'r1', ville_zone_id = 'v1' WHERE id = 'p1';
    UPDATE places SET quartier_id = 'q2' WHERE id = 'p3';
  `);

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

  it("privilégie le nom exact même si un autre lieu est plus proche", async () => {
    const result = await places.search({
      q: "Pharmacie du Plateau",
      lat: 13.53,
      lng: 2.13,
      limit: 20,
    });
    expect(result.intent).toBe("nom");
    expect(result.exactNameMatch).toBe(true);
    expect(result.items[0]?.id).toBe("p1");
  });

  it("recherche un quartier sans le remplacer par la proximité", async () => {
    const result = await places.search({ q: "Yantala", lat: 13.511, lng: 2.112, limit: 20 });
    expect(result.intent).toBe("quartier");
    expect(result.items.map((place) => place.id)).toEqual(["p3"]);
  });

  it("tolère une faute de frappe", async () => {
    const result = await places.search({ q: "pharmachie du plateu", limit: 20 });
    expect(result.items.map((place) => place.id)).toContain("p1");
  });

  it("propose le nom exact sans remplacer le lieu recherché", async () => {
    const result = await places.search({ q: "pharmacie du plateu", limit: 20 });
    expect(result.intent).toBe("texte");
    expect(result.exactNameMatch).toBe(false);
    expect(result.items[0]?.nom).toBe("Pharmacie du Plateau");
  });

  it("reconnaît les catégories anglaises", async () => {
    const result = await places.search({ q: "pharmacy", limit: 20 });
    expect(result.intent).toBe("categorie");
    expect(result.items.map((place) => place.id)).toContain("p1");
  });

  it("tolère une faute sur un quartier sans changer l'intention", async () => {
    const result = await places.search({ q: "Yantalaa", limit: 20 });
    expect(result.intent).toBe("quartier");
    expect(result.items.map((place) => place.id)).toEqual(["p3"]);
  });

  it("ne liste pas tout le catalogue pour une requête sans jeton", async () => {
    const result = await places.search({ q: "...", limit: 20 });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("recherche arabe normalisée", async () => {
    const result = await places.search({ q: "صيدلية", limit: 20 });
    expect(result.items.map((place) => place.id)).toContain("p3");
  });

  it("filtre par catégorie", async () => {
    const result = await places.search({ categorySlug: "ecole", limit: 20 });
    expect(result.items.map((place) => place.id)).toEqual(["p2"]);
  });

  it("conserve le comptage exact avec un filtre par région", async () => {
    const result = await places.search({ regionSlug: "niamey", limit: 20 });
    expect(result.items.map((place) => place.id)).toEqual(["p1"]);
    expect(result.total).toBe(1);
  });

  it("conserve le comptage exact avec un filtre par ville", async () => {
    const result = await places.search({ villeSlug: "niamey", limit: 20 });
    expect(result.items.map((place) => place.id)).toEqual(["p1"]);
    expect(result.total).toBe(1);
  });

  it("tronque après le tri par distance, pas avant", async () => {
    const result = await places.search({
      categorySlug: "pharmacie",
      lat: 13.511,
      lng: 2.112,
      limit: 1,
    });
    expect(result.items[0]?.id).toBe("p1");
  });

  it("calcule la distance et applique le rayon", async () => {
    const result = await places.search({ lat: 13.511, lng: 2.112, radiusKm: 1, limit: 20 });
    expect(result.items[0]?.id).toBe("p1");
    expect(result.items[0]?.distanceM).toBeLessThan(100);
    expect(
      result.items.every((place) => (place.distanceM ?? Number.POSITIVE_INFINITY) <= 1000),
    ).toBe(true);
  });

  it("classe les résultats du plus proche au plus éloigné", async () => {
    const result = await places.search({ lat: 13.53, lng: 2.13, limit: 20 });
    expect(result.items.map((place) => place.id)).toEqual(["p3", "p2", "p1", "p4"]);
    const distances = result.items.map((place) => place.distanceM ?? Number.POSITIVE_INFINITY);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
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
    expect(await places.listPublishedIds()).toEqual(["p1", "p2", "p3", "p4"]);
  });
});
