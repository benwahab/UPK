import { readFileSync } from "node:fs";
import { schema, type Database } from "@upk/db";
import Sqlite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";
import { createAuth } from "./auth";

const baseURL = "http://localhost:3000";

function createTestDb() {
  const sqlite = new Sqlite(":memory:");
  sqlite.pragma("foreign_keys = ON");
  for (const file of ["0001_init.sql", "0002_auth.sql"]) {
    const path = new URL(`../../db/migrations/${file}`, import.meta.url);
    sqlite.exec(readFileSync(path, "utf8"));
  }
  return drizzle(sqlite, { schema });
}

describe("auth", () => {
  it("inscrit un utilisateur et ouvre une session", async () => {
    const db = createTestDb();
    const auth = createAuth(db as unknown as Database, {
      secret: "test-secret-at-least-32-characters-long",
      baseURL,
      trustedOrigins: [baseURL],
    });

    const signUp = await auth.handler(
      new Request(`${baseURL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: baseURL },
        body: JSON.stringify({
          email: "amina@example.com",
          password: "motdepasse123",
          name: "Amina",
        }),
      }),
    );

    expect(signUp.status).toBe(200);
    const cookie = signUp.headers.get("set-cookie");
    expect(cookie).toContain("upk.session_token");

    const sessionRes = await auth.handler(
      new Request(`${baseURL}/api/auth/get-session`, {
        headers: { cookie: cookie ?? "" },
      }),
    );

    expect(sessionRes.status).toBe(200);
    const session = (await sessionRes.json()) as { user: { email: string } };
    expect(session.user.email).toBe("amina@example.com");
  });
});
