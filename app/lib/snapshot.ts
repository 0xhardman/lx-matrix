import { ensureSchema, getPool } from "@/app/lib/db";
import { fetchTwitterProfile } from "@/app/lib/xapi";

export interface SnapshotResult {
  total: number; // approved members considered
  captured: number; // successfully fetched + recorded
  failed: number; // fetch failures (left untouched)
  failedHandles: string[];
}

// How many xapi calls to run at once. Kept low to be gentle on the upstream
// API while still finishing a few dozen members well within the function
// timeout.
const CONCURRENCY = 3;

/**
 * Fetch the latest public Twitter counters for every approved member, append a
 * row to tweet_snapshots, and refresh the cached profile fields on the
 * registration. Failures are skipped (the previous snapshot/cached value is
 * left in place) so one bad handle never aborts the whole run.
 *
 * Safe to call from the cron route or an admin-triggered manual refresh.
 */
export async function runSnapshot(): Promise<SnapshotResult> {
  await ensureSchema();
  const pool = getPool();

  const { rows } = await pool.query<{ id: number; twitter: string }>(
    `SELECT id, twitter
       FROM twitter_registrations
      WHERE status = 'approved'
      ORDER BY id`
  );

  const result: SnapshotResult = {
    total: rows.length,
    captured: 0,
    failed: 0,
    failedHandles: [],
  };

  let cursor = 0;
  async function worker() {
    while (cursor < rows.length) {
      const member = rows[cursor++];
      const profile = await fetchTwitterProfile(member.twitter);
      if (!profile) {
        result.failed++;
        result.failedHandles.push(member.twitter);
        continue;
      }

      // Record the snapshot and refresh the cached profile in one round-trip
      // each. tweets/followers/following come back as numbers from xapi.
      await pool.query(
        `INSERT INTO tweet_snapshots
           (registration_id, twitter, tweets_count, followers, following)
         VALUES ($1, $2, $3, $4, $5)`,
        [member.id, member.twitter, profile.tweets, profile.followers, profile.following]
      );
      await pool.query(
        `UPDATE twitter_registrations
            SET display_name      = $2,
                avatar_url        = $3,
                last_tweets_count = $4,
                last_snapshot_at  = now()
          WHERE id = $1`,
        [member.id, profile.name, profile.avatar, profile.tweets]
      );
      result.captured++;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, rows.length) }, () => worker())
  );

  return result;
}
