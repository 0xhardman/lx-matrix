import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyToken } from "@/app/lib/auth";
import { runSnapshot } from "@/app/lib/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A few dozen sequential-ish xapi calls; give the function room to finish.
export const maxDuration = 300;

/**
 * Authorize the snapshot run. Two callers are allowed:
 *  - Vercel Cron, which sends `Authorization: Bearer <CRON_SECRET>` when the
 *    CRON_SECRET env var is set.
 *  - A logged-in admin (lx_admin cookie), for manual refresh / testing.
 */
async function authorized(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth === `Bearer ${secret}`) return true;
  }
  const store = await cookies();
  return verifyToken(store.get(ADMIN_COOKIE)?.value);
}

export async function GET(request: Request) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const result = await runSnapshot();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron] snapshot failed:", err);
    return NextResponse.json({ error: "采集失败" }, { status: 500 });
  }
}
