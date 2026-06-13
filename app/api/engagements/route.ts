import { NextResponse } from "next/server";
import { ensureSchema, getPool } from "@/app/lib/db";
import { resolveMember } from "@/app/lib/memberAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCES = new Set(["popup", "x.com"]);

/**
 * Engagement check-in. Body: { tweetId, engaged = true, source = "popup" }.
 * engaged=false withdraws a check-in (mis-click in the popup).
 * Self check-ins are rejected — your own tweets aren't part of your queue.
 */
export async function POST(request: Request) {
  try {
    await ensureSchema();
    const member = await resolveMember(request);
    if (!member) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    let body: { tweetId?: unknown; engaged?: unknown; source?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    const tweetId = typeof body.tweetId === "string" ? body.tweetId.trim() : "";
    if (!/^\d{1,25}$/.test(tweetId)) {
      return NextResponse.json({ error: "tweetId 无效" }, { status: 400 });
    }
    const engaged = body.engaged !== false;
    const source =
      typeof body.source === "string" && SOURCES.has(body.source)
        ? body.source
        : "popup";

    const db = getPool();
    if (!engaged) {
      await db.query(
        `DELETE FROM tweet_engagements
          WHERE registration_id = $1 AND tweet_id = $2`,
        [member.id, tweetId]
      );
      return NextResponse.json({ ok: true, engaged: false });
    }

    // Only known member tweets count toward the matrix, and never your own.
    const { rows } = await db.query(
      `SELECT (registration_id = $2) AS own FROM member_tweets
        WHERE tweet_id = $1`,
      [tweetId, member.id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "不是矩阵成员的推文" }, { status: 404 });
    }
    if (rows[0].own) {
      return NextResponse.json(
        { error: "不能给自己的推文打卡" },
        { status: 400 }
      );
    }

    await db.query(
      `INSERT INTO tweet_engagements (registration_id, tweet_id, source)
       VALUES ($1, $2, $3)
       ON CONFLICT (registration_id, tweet_id) DO NOTHING`,
      [member.id, tweetId, source]
    );
    return NextResponse.json({ ok: true, engaged: true });
  } catch (err) {
    console.error("[engagements] failed:", err);
    return NextResponse.json({ error: "写入失败" }, { status: 500 });
  }
}
