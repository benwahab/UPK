import { readFileSync } from "node:fs";
import { schema, type Database } from "@upk/db";
import Sqlite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";
import {
  createD1AuditRepository,
  createD1ContributionRepository,
  createD1ModerationRepository,
  createD1RateLimitRepository,
  createD1ReportRepository,
} from "./contribution-repositories";
import { createD1PlaceRepository } from "./repositories";

function createTestDb() {
  const sqlite = new Sqlite(":memory:");
  sqlite.pragma("foreign_keys = ON");
  for (const file of [
    "0001_init.sql",
    "0002_auth.sql",
    "0003_contribution_moderation.sql",
  ]) {
    const path = new URL(`../../db/migrations/${file}`, import.meta.url);
    sqlite.exec(readFileSync(path, "utf8"));
  }

  const now = new Date().toISOString();
  sqlite
    .prepare("INSERT INTO categories (id, nom, slug, ordre, created_at) VALUES (?, ?, ?, ?, ?)")
    .run("cat_pharmacie", "Pharmacie", "pharmacie", 0, now);
  sqlite
    .prepare(
      `INSERT INTO places (
        id, nom, nom_normalise, category_id, quartier, latitude, longitude,
        statut_publication, statut_verification, source, langue, actif,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'valide', 'source_fiable', 'test', 'fr', 1, ?, ?)`,
    )
    .run(
      "p1",
      "Pharmacie du Plateau",
      "pharmacie du plateau",
      "cat_pharmacie",
      "Plateau",
      13.511,
      2.112,
      now,
      now,
    );

  return { sqlite, db: drizzle(sqlite, { schema }) };
}

const contributionInput = {
  nom: "Pharmacie test",
  categorySlug: "pharmacie",
  quartier: "Plateau",
  latitude: 13.512,
  longitude: 2.113,
  telephone: "90000001",
  langue: "fr" as const,
};

describe("repositories contribution et modération", () => {
  it("crée une proposition invisible avant validation", async () => {
    const { db } = createTestDb();
    const contributions = createD1ContributionRepository(db as unknown as Database);
    const places = createD1PlaceRepository(db as unknown as Database);
    const moderation = createD1ModerationRepository(db as unknown as Database);

    const created = await contributions.create(contributionInput, {
      userId: null,
      contactEmail: "test@example.com",
      gpsPrecisionM: 8,
    });

    expect(created.id.startsWith("usr_")).toBe(true);
    expect(created.submissionToken.length).toBeGreaterThan(20);
    await expect(
      contributions.verifySubmission(created.id, created.submissionToken),
    ).resolves.toBe(true);
    await expect(contributions.verifySubmission(created.id, "mauvais")).resolves.toBe(false);
    await expect(places.byId(created.id)).resolves.toBeNull();

    const pending = await moderation.listPending();
    expect(pending.map((place) => place.id)).toContain(created.id);
    expect(pending.find((place) => place.id === created.id)?.contactEmail).toBe(
      "test@example.com",
    );
  });

  it("ajoute une photo puis approuve la proposition", async () => {
    const { db } = createTestDb();
    const contributions = createD1ContributionRepository(db as unknown as Database);
    const places = createD1PlaceRepository(db as unknown as Database);
    const moderation = createD1ModerationRepository(db as unknown as Database);

    const created = await contributions.create(contributionInput, { userId: "u1" });
    await contributions.addPhoto(created.id, `places/${created.id}/photo.jpg`, "Façade");

    const pending = await moderation.findPending(created.id);
    expect(pending?.photos).toEqual([
      {
        key: `places/${created.id}/photo.jpg`,
        url: `/api/photos/places/${created.id}/photo.jpg`,
        alt: "Façade",
      },
    ]);

    await moderation.approve(created.id, "admin");
    await expect(moderation.findPending(created.id)).resolves.toBeNull();
    const published = await places.byId(created.id);
    expect(published?.nom).toBe("Pharmacie test");
    expect(published?.photos).toEqual([
      {
        key: `places/${created.id}/photo.jpg`,
        url: `/api/photos/places/${created.id}/photo.jpg`,
        alt: "Façade",
      },
    ]);
  });

  it("enregistre un rejet motivé", async () => {
    const { sqlite, db } = createTestDb();
    const contributions = createD1ContributionRepository(db as unknown as Database);
    const moderation = createD1ModerationRepository(db as unknown as Database);

    const created = await contributions.create(contributionInput, { userId: null });
    await moderation.reject(created.id, "admin", "Doublon existant");

    const row = sqlite
      .prepare("SELECT statut_publication, motif_refus FROM places WHERE id = ?")
      .get(created.id) as { statut_publication: string; motif_refus: string };
    expect(row.statut_publication).toBe("refuse");
    expect(row.motif_refus).toBe("Doublon existant");
    await expect(moderation.findPending(created.id)).resolves.toBeNull();
  });

  it("crée, liste et traite un signalement", async () => {
    const { db } = createTestDb();
    const reports = createD1ReportRepository(db as unknown as Database);
    const moderation = createD1ModerationRepository(db as unknown as Database);

    const created = await reports.create(
      { placeId: "p1", typeProbleme: "ferme", description: "Fermé" },
      { userId: null, email: "test@example.com" },
    );
    const open = await moderation.listReports();
    expect(open.map((report) => report.id)).toContain(created.id);
    expect(open[0]?.placeNom).toBe("Pharmacie du Plateau");

    await moderation.resolveReport(created.id, "traite", "Corrigé", "admin");
    await expect(moderation.listReports()).resolves.toEqual([]);
  });

  it("limite les écritures par fenêtre", async () => {
    const { db } = createTestDb();
    const limits = createD1RateLimitRepository(db as unknown as Database);

    const first = await limits.consume("contribution", "client", 2, 3600);
    const second = await limits.consume("contribution", "client", 2, 3600);
    const third = await limits.consume("contribution", "client", 2, 3600);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("écrit un journal d'audit append-only", async () => {
    const { sqlite, db } = createTestDb();
    const audit = createD1AuditRepository(db as unknown as Database);

    await audit.append({
      actorId: "admin",
      actorRole: "admin",
      action: "contribution.approve",
      section: "moderation",
      targetType: "place",
      targetId: "usr_1",
      result: "valide",
      after: { forceGps: false },
    });

    const row = sqlite
      .prepare("SELECT action, apres FROM journal_admin")
      .get() as { action: string; apres: string };
    expect(row.action).toBe("contribution.approve");
    expect(JSON.parse(row.apres)).toEqual({ forceGps: false });
    expect(() =>
      sqlite.prepare("UPDATE journal_admin SET action = 'x'").run(),
    ).toThrow(/append-only/);
    expect(() => sqlite.prepare("DELETE FROM journal_admin").run()).toThrow(/append-only/);
  });
});
