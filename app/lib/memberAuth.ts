import { cookies } from "next/headers";
import { getPool } from "@/app/lib/db";
import { SESSION_COOKIE, readSession } from "@/app/lib/session";

export interface AuthedMember {
  id: number;
  twitter: string; // @handle
}

/**
 * Resolve the approved member behind a request. Two ways in:
 *  - the browser extension sends its ext token in `x-member-token`
 *    (it can't carry the httpOnly, SameSite=lax session cookie cross-origin)
 *  - the web app sends the OAuth session cookie
 * Returns null unless the caller maps to an *approved* registration.
 */
export async function resolveMember(
  request: Request
): Promise<AuthedMember | null> {
  const pool = getPool();

  const extToken = request.headers.get("x-member-token")?.trim();
  if (extToken && extToken.startsWith("ext_")) {
    const { rows } = await pool.query<AuthedMember>(
      `SELECT id::int AS id, twitter FROM twitter_registrations
        WHERE ext_token = $1 AND status = 'approved' LIMIT 1`,
      [extToken]
    );
    return rows[0] ?? null;
  }

  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value);
  if (!session?.twitterId) return null;
  const { rows } = await pool.query<AuthedMember>(
    `SELECT id, twitter FROM twitter_registrations
      WHERE twitter_id = $1 AND status = 'approved' LIMIT 1`,
    [session.twitterId]
  );
  return rows[0] ?? null;
}
