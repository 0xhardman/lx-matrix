import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureSchema, getPool } from "@/app/lib/db";
import { MEMBER_COOKIE } from "@/app/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Day boundary for "posted today" — members are China-based, so we count a day
// in Beijing time rather than UTC.
const TZ = "Asia/Shanghai";

interface MemberRow {
  id: number;
  twitter: string;
  display_name: string | null;
  avatar_url: string | null;
  directions: string[] | null;
  frequency: string | null;
  last_tweets_count: number | null;
  last_snapshot_at: string | null;
  baseline_count: number | null;
}

/**
 * Read the member token from the httpOnly `lx_member` cookie or the
 * `x-member-token` header. Never from the URL (would leak into logs/history).
 */
async function readToken(request: Request): Promise<string> {
  const header = request.headers.get("x-member-token");
  if (header) return header.trim();
  const store = await cookies();
  return store.get(MEMBER_COOKIE)?.value?.trim() || "";
}

export async function GET(request: Request) {
  const token = await readToken(request);
  if (!token) {
    return NextResponse.json({ error: "缺少成员令牌" }, { status: 401 });
  }

  try {
    await ensureSchema();
    const pool = getPool();

    // Validate the caller is an approved member.
    const auth = await pool.query(
      `SELECT 1 FROM twitter_registrations
        WHERE member_token = $1 AND status = 'approved'
        LIMIT 1`,
      [token]
    );
    if (auth.rowCount === 0) {
      return NextResponse.json({ error: "令牌无效" }, { status: 401 });
    }

    // For each approved member, pull the cached current counter plus the
    // tweets_count from the most recent snapshot taken before today (Beijing
    // time) began — the baseline we diff against for today's volume.
    const { rows } = await pool.query<MemberRow>(
      `WITH day_start AS (
         SELECT (date_trunc('day', now() AT TIME ZONE $1) AT TIME ZONE $1) AS ts
       ),
       baseline AS (
         SELECT DISTINCT ON (s.registration_id)
                s.registration_id, s.tweets_count
           FROM tweet_snapshots s, day_start
          WHERE s.captured_at < day_start.ts
          ORDER BY s.registration_id, s.captured_at DESC
       )
       SELECT r.id, r.twitter, r.display_name, r.avatar_url, r.directions,
              r.frequency, r.last_tweets_count, r.last_snapshot_at,
              b.tweets_count AS baseline_count
         FROM twitter_registrations r
         LEFT JOIN baseline b ON b.registration_id = r.id
        WHERE r.status = 'approved'
        ORDER BY lower(r.twitter)`,
      [TZ]
    );

    const members = rows.map((r) => {
      const cumulative = r.last_tweets_count;
      // todayCount is null until we have both a current counter and a
      // pre-today baseline to diff against. Clamp negatives (deleted tweets).
      const todayCount =
        cumulative != null && r.baseline_count != null
          ? Math.max(0, cumulative - r.baseline_count)
          : null;
      return {
        twitter: r.twitter,
        name: r.display_name,
        avatar: r.avatar_url,
        directions: r.directions,
        frequency: r.frequency,
        cumulative,
        todayCount,
        postedToday: todayCount != null ? todayCount > 0 : null,
        lastSnapshotAt: r.last_snapshot_at,
      };
    });

    return NextResponse.json({
      members,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[members] failed to list:", err);
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }
}
