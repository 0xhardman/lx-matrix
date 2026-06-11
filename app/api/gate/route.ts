import { NextResponse } from "next/server";
import { ensureSchema, getPool } from "@/app/lib/db";
import {
  GATE_COOKIE,
  GATE_CODE_COOKIE,
  makeGatePass,
  normalizeCode,
  cookieSecure,
} from "@/app/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Validate an invite code and, if it's valid and not expired/used, set a
 * temporary gate-pass cookie so the visitor can browse the gated pages.
 *
 * The code is NOT consumed here — it's only burned when an application is
 * actually submitted (see /api/register).
 */
export async function POST(request: Request) {
  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const code = normalizeCode(typeof body.code === "string" ? body.code : "");
  if (!code) {
    return NextResponse.json({ error: "请输入邀请码" }, { status: 400 });
  }

  try {
    await ensureSchema();
    const { rows } = await getPool().query(
      `SELECT code, expires_at, used_at FROM invite_codes WHERE code = $1`,
      [code]
    );
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "邀请码无效" }, { status: 404 });
    }
    if (row.used_at) {
      return NextResponse.json({ error: "邀请码已被使用" }, { status: 410 });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "邀请码已过期" }, { status: 410 });
    }

    const res = NextResponse.json({ ok: true });
    // Remember which code unlocked, so /register can burn it on submit.
    res.cookies.set(GATE_COOKIE, await makeGatePass(), {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day browsing pass
    });
    res.cookies.set(GATE_CODE_COOKIE, code, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return res;
  } catch (err) {
    console.error("[gate] validation failed:", err);
    return NextResponse.json({ error: "校验失败，请稍后再试" }, { status: 500 });
  }
}
