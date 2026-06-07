import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function resolveSsl(connectionString: string) {
  // Explicitly disabled in the connection string.
  if (connectionString.includes("sslmode=disable")) return false;

  // Opt-in escape hatch for providers with certs Node can't verify against its
  // default CA bundle. Off by default so we don't silently accept MITM.
  // Prefer providing the CA: set DATABASE_CA_CERT (PEM) for proper verification.
  if (process.env.DATABASE_CA_CERT) {
    return { ca: process.env.DATABASE_CA_CERT };
  }
  if (process.env.DATABASE_SSL_NO_VERIFY === "true") {
    return { rejectUnauthorized: false };
  }
  // Default: verify the certificate chain.
  return { rejectUnauthorized: true };
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({
    connectionString,
    ssl: resolveSsl(connectionString),
  });
}

/**
 * Lazily get the connection pool. Created on first use (not at import time) so
 * the build / page-data collection doesn't require DATABASE_URL to be present.
 * Reused across hot reloads in dev to avoid exhausting connections.
 */
export function getPool(): Pool {
  if (!global._pgPool) {
    global._pgPool = createPool();
  }
  return global._pgPool;
}

let initialized = false;

/**
 * Application review status.
 */
export type ApplicationStatus = "pending" | "approved" | "rejected";

/**
 * A membership application row as returned to the admin dashboard.
 */
export interface Application {
  id: number;
  twitter: string;
  wechat: string;
  has_blue_v: boolean | null;
  is_lxdao_member: boolean | null;
  lxdao_proof: string | null;
  directions: string[] | null;
  frequency: string | null;
  intro: string | null;
  referrer: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Ensure the applications table exists and has every column. Idempotent — new
 * columns are added in place so existing rows are preserved. Runs once per
 * process.
 */
export async function ensureSchema() {
  if (initialized) return;
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS twitter_registrations (
      id          BIGSERIAL PRIMARY KEY,
      twitter     TEXT NOT NULL,
      wechat      TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS twitter_registrations_twitter_key
      ON twitter_registrations (lower(twitter));

    -- Application fields (added incrementally; preserves existing rows).
    ALTER TABLE twitter_registrations
      ADD COLUMN IF NOT EXISTS has_blue_v       BOOLEAN,
      ADD COLUMN IF NOT EXISTS is_lxdao_member  BOOLEAN,
      ADD COLUMN IF NOT EXISTS lxdao_proof      TEXT,
      ADD COLUMN IF NOT EXISTS directions       TEXT[],
      ADD COLUMN IF NOT EXISTS frequency        TEXT,
      ADD COLUMN IF NOT EXISTS intro            TEXT,
      ADD COLUMN IF NOT EXISTS referrer         TEXT,
      ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'pending';
  `);
  initialized = true;
}
