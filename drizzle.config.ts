import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Prefer DIRECT_DATABASE_URL (Neon's unpooled connection) when set — see
    // scripts/migrate.ts and SETUP.md for why pooled connections are risky
    // for migrations.
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "postgres://placeholder/placeholder",
  },
} satisfies Config;
