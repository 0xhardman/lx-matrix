import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyToken } from "@/app/lib/auth";
import { fetchTwitterProfile } from "@/app/lib/xapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// xapi (npx) can take a while on a cold call.
export const maxDuration = 60;

export async function POST(request: Request) {
  const store = await cookies();
  if (!verifyToken(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  let body: { handle?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const handle = typeof body.handle === "string" ? body.handle : "";
  if (!handle) {
    return NextResponse.json({ error: "缺少 handle" }, { status: 400 });
  }

  const profile = await fetchTwitterProfile(handle);
  if (!profile) {
    return NextResponse.json(
      { error: "抓取失败，可能账号不存在或暂时不可用" },
      { status: 502 }
    );
  }
  return NextResponse.json({ profile });
}
