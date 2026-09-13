/**
 * Runs pending Drizzle migrations (from ./drizzle) against whichever driver
 * is active: real Postgres when DATABASE_URL is set, otherwise the local
 * embedded PGlite database used for zero-setup dev. Run with `npm run db:migrate`.
 */
import "dotenv/config";
import { mkdirSync } from "fs";

async function main() {
  const url = process.env.DATABASE_URL;

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
