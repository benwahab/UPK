import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type D1DatabaseLike = Parameters<typeof drizzle>[0];

export function createDb(d1: D1DatabaseLike) {
  return drizzle(d1, { schema });
}

export type Database = ReturnType<typeof createDb>;

export { schema };
