import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureSchema, getPool } from "@/app/lib/db";
import { getFeed } from "@/app/lib/feed";
import { SESSION_COOKIE, readSession } from "@/app/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// On-demand xapi fetch of every member can take a little while.
export const maxDuration = 60;

/** Authorize as an approved member via OAuth session or extension token. */
async function isApprovedMember(request: Request): Promise<boolean> {
  const pool = getPool();
  const extToken = request.headers.get("x-member-token")?.trim();
  if (extToken && extToken.startsWith("ext_")) {
    const r = await pool.query(
      `SELECT 1 FROM twitter_registrations
        WHERE ext_token = $1 AND status = 'approved' LIMIT 1`,
      [extToken]
    );
    return r.rowCount! > 0;
  }
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value);
  if (!session?.twitterId) return false;
  const r = await pool.query(
    `SELECT 1 FROM twitter_registrations
      WHERE twitter_id = $1 AND status = 'approved' LIMIT 1`,
    [session.twitterId]
  );
  return r.rowCount! > 0;
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    if (!(await isApprovedMember(request))) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    const force = new URL(request.url).searchParams.get("force") === "1";
    const { items, refreshedAt } = await getFeed(force);
    return NextResponse.json({ items, refreshedAt });
  } catch (err) {
    console.error("[feed] failed:", err);
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }
}
