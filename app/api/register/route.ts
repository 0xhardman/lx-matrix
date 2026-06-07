import { NextResponse } from "next/server";
import { ensureSchema, getPool } from "@/app/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Normalize a Twitter input into a clean @handle.
 * Accepts a full URL (https://x.com/foo), "@foo", or "foo".
 * Returns null if no plausible handle can be extracted.
 */
function normalizeTwitter(raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;

  // Pull the handle out of a URL if one was pasted.
  const urlMatch = v.match(
    /(?:twitter\.com|x\.com)\/(?:#!\/)?@?([A-Za-z0-9_]{1,15})/i
  );
  if (urlMatch) {
    v = urlMatch[1];
  } else {
    v = v.replace(/^@/, "");
  }

  if (!/^[A-Za-z0-9_]{1,15}$/.test(v)) return null;
  return `@${v}`;
}

export async function POST(request: Request) {
  let payload: { twitter?: unknown; wechat?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const twitterRaw =
    typeof payload.twitter === "string" ? payload.twitter : "";
  const wechatRaw = typeof payload.wechat === "string" ? payload.wechat : "";

  const twitter = normalizeTwitter(twitterRaw);
  const wechat = wechatRaw.trim();

  if (!twitter) {
    return NextResponse.json(
      { error: "请填写有效的 Twitter 账号或链接" },
      { status: 400 }
    );
  }
  if (!wechat) {
    return NextResponse.json({ error: "请填写微信名称" }, { status: 400 });
  }
  if (wechat.length > 64) {
    return NextResponse.json(
      { error: "微信名称过长（最多 64 个字符）" },
      { status: 400 }
    );
  }

  try {
    await ensureSchema();
    // Upsert: re-registering the same Twitter updates the WeChat name.
    await getPool().query(
      `
      INSERT INTO twitter_registrations (twitter, wechat)
      VALUES ($1, $2)
      ON CONFLICT (lower(twitter))
      DO UPDATE SET wechat = EXCLUDED.wechat, updated_at = now()
      `,
      [twitter, wechat]
    );
    return NextResponse.json({ ok: true, twitter });
  } catch (err) {
    console.error("[register] failed to save registration:", err);
    return NextResponse.json(
      { error: "保存失败，请稍后再试" },
      { status: 500 }
    );
  }
}
