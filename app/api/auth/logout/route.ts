import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/app/lib/session";
import { MEMBER_COOKIE, GATE_COOKIE } from "@/app/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  for (const c of [SESSION_COOKIE, MEMBER_COOKIE, GATE_COOKIE]) {
    res.cookies.set(c, "", { path: "/", maxAge: 0 });
  }
  return res;
}
