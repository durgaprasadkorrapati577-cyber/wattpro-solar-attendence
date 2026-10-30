import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// Managed Postgres providers (Neon, Supabase, Railway, …) require TLS. The libpq
// style `sslmode` / `channel_binding` query parameters are stripped and TLS is
// configured explicitly through the `ssl` option instead — this avoids the
// deprecation warnings emitted by pg-connection-string and keeps behaviour stable
// across pg major versions.
function buildPoolConfig(url: string) {
  const parsed = new URL(url);
  const sslmode = parsed.searchParams.get("sslmode");
  const requiresTls = sslmode ? sslmode !== "disable" : true;
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");
  parsed.searchParams.delete("uselibpqcompat");
  return {
    connectionString: parsed.toString(),
    ...(requiresTls ? { ssl: { rejectUnauthorized: true } } : {}),
  };
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool = globalForDb.__arenaNextJsPostgresqlPool ?? new Pool(buildPoolConfig(databaseUrl));

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
