import { NextResponse } from "next/server";
import { checkPassword, makeToken, ADMIN_COOKIE } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";

  let ok = false;
  try {
    ok = checkPassword(password);
  } catch {
    return NextResponse.json(
      { error: "服务器未配置管理密码" },
      { status: 500 }
    );
  }

  if (!ok) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, makeToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
