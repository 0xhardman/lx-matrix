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
export type ApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "deactivated";

/**
 * A membership application row as returned to the admin dashboard.
 */
export interface Application {
  id: number;
  twitter: string; // @handle (display only — may change over time)
  twitter_id: string | null; // stable Twitter user id (identity key)
  wechat: string;
  has_blue_v: boolean | null;
  is_lxdao_member: boolean | null;
  lxdao_proof: string | null;
  directions: string[] | null;
  frequency: string | null;
  intro: string | null;
  referrer: string | null;
  status: ApplicationStatus;
  invite_code_used: string | null;
  // Cached public Twitter profile, refreshed by the snapshot cron.
  display_name: string | null;
  avatar_url: string | null;
  last_tweets_count: number | null;
  last_snapshot_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A point-in-time capture of a member's public Twitter counters. Inserted by
 * the snapshot cron; the daily post count is derived as the delta between
 * consecutive snapshots.
 */
export interface TweetSnapshot {
  id: number;
  registration_id: number;
  twitter: string;
  tweets_count: number;
  followers: number | null;
  following: number | null;
  captured_at: string;
}

/**
 * An invite code. Single-use, time-limited.
 */
export interface InviteCode {
  code: string;
  created_by: string | null; // creator's twitter_id, or 'admin'
  created_by_twitter: string | null;
  expires_at: string;
  used_at: string | null;
  used_by_twitter: string | null;
  created_at: string;
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
      ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS member_token     TEXT,
      ADD COLUMN IF NOT EXISTS invite_code_used TEXT,
      ADD COLUMN IF NOT EXISTS twitter_id       TEXT,
      -- Cached public Twitter profile, refreshed by the snapshot cron.
      ADD COLUMN IF NOT EXISTS display_name      TEXT,
      ADD COLUMN IF NOT EXISTS avatar_url        TEXT,
      ADD COLUMN IF NOT EXISTS last_tweets_count INTEGER,
      ADD COLUMN IF NOT EXISTS last_snapshot_at  TIMESTAMPTZ;

    -- Stable Twitter user id is the identity key (handle can change).
    CREATE UNIQUE INDEX IF NOT EXISTS twitter_registrations_twitter_id_key
      ON twitter_registrations (twitter_id) WHERE twitter_id IS NOT NULL;

    -- Per-run capture of each member's public Twitter counters. The daily
    -- posting volume is computed as the delta between consecutive snapshots.
    CREATE TABLE IF NOT EXISTS tweet_snapshots (
      id              BIGSERIAL PRIMARY KEY,
      registration_id BIGINT NOT NULL
        REFERENCES twitter_registrations (id) ON DELETE CASCADE,
      twitter         TEXT NOT NULL,
      tweets_count    INTEGER NOT NULL,
      followers       INTEGER,
      following       INTEGER,
      captured_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS tweet_snapshots_reg_captured_idx
      ON tweet_snapshots (registration_id, captured_at DESC);

    -- Invite codes: single-use, time-limited.
    CREATE TABLE IF NOT EXISTS invite_codes (
      code               TEXT PRIMARY KEY,
      created_by         TEXT,
      created_by_twitter TEXT,
      expires_at         TIMESTAMPTZ NOT NULL,
      used_at            TIMESTAMPTZ,
      used_by_twitter    TEXT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS invite_codes_created_by_idx
      ON invite_codes (created_by);
  `);
  initialized = true;
}
