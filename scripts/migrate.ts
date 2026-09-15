/**
 * Runs pending Drizzle migrations (from ./drizzle) against whichever driver
 * is active: real Postgres when DATABASE_URL is set, otherwise the local
 * embedded PGlite database used for zero-setup dev. Run with `npm run db:migrate`.
 *
 * If DATABASE_URL points at a Neon pooled connection (hostname contains
 * "-pooler"), set DIRECT_DATABASE_URL to Neon's direct/unpooled connection
 * string instead — Neon's own docs warn that running migrations through the
 * pooled (PgBouncer transaction-mode) endpoint can fail. This script prefers
 * DIRECT_DATABASE_URL when present and falls back to DATABASE_URL otherwise,
 * so app runtime (src/lib/db/index.ts) can keep using the pooled URL.
 */
import "dotenv/config";
import { mkdirSync } from "fs";

async function main() {
  const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

  if (url) {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(url, { max: 1 });
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "./drizzle" });
    await client.end();
    console.log(`[db:migrate] applied migrations to Postgres (${url.replace(/:[^:@]+@/, ":***@")})`);
    return;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  mkdirSync("./.data/local-db", { recursive: true });
  const client = new PGlite("./.data/local-db");
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[db:migrate] applied migrations to local PGlite database (./.data/local-db)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[db:migrate] failed:", err);
    process.exit(1);
  });
