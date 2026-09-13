import { mkdirSync } from "fs";

import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";

import * as schema from "./schema";

/**
 * Database client.
 *
 * Production / staging: set DATABASE_URL to a real Postgres instance (Neon or
 * Supabase both work — see SETUP.md) and every query below runs through
 * `postgres` (postgres.js) + drizzle-orm/postgres-js.
 *
 * Local development with no cloud account: leave DATABASE_URL unset and the
 * app falls back to an embedded Postgres-compatible database (PGlite,
 * persisted to `.data/local-db` on disk) so `npm run dev` works with zero
 * setup. Same schema, same SQL dialect, same Drizzle query API either way —
 * only the driver differs.
 */

function createDb() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { max: 10 });
    return { db: drizzlePostgres(client, { schema }), driver: "postgres" as const };
  }
  mkdirSync("./.data/local-db", { recursive: true });
  const client = new PGlite("./.data/local-db");
  return { db: drizzlePglite(client, { schema }), driver: "pglite" as const };
}

declare global {
  var __calliq_db__: ReturnType<typeof createDb> | undefined;
}

function getInstance() {
  if (!global.__calliq_db__) {
    global.__calliq_db__ = createDb();
  }
  return global.__calliq_db__;
}

export const db = getInstance().db;
export const dbDriver = getInstance().driver;
export { schema };
