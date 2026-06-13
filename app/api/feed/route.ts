import { NextResponse } from "next/server";
import { ensureSchema } from "@/app/lib/db";
import { getFeed } from "@/app/lib/feed";
import { resolveMember } from "@/app/lib/memberAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// On-demand xapi fetch of every member can take a little while.
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const member = await resolveMember(request);
    if (!member) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    const force = new URL(request.url).searchParams.get("force") === "1";
    const { items, refreshedAt, summary } = await getFeed(member.id, force);
    return NextResponse.json({ items, refreshedAt, summary });
  } catch (err) {
    console.error("[feed] failed:", err);
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }
}
