import { schema, type Database } from "@upk/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export type CreateAuthOptions = {
  secret: string;
  baseURL?: string;
  trustedOrigins?: string[];
};

export function createAuth(db: Database, options: CreateAuthOptions) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
      usePlural: true,
    }),
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      cookiePrefix: "upk",
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
