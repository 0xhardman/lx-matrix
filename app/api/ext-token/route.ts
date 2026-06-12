import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureSchema, getPool } from "@/app/lib/db";
import { generateExtToken } from "@/app/lib/gate";
import { SESSION_COOKIE, readSession } from "@/app/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Resolve the approved member id from the OAuth session, re-checked in DB. */
async function resolveMemberId(): Promise<number | null> {
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value);
  if (!session?.twitterId) return null;
  const { rows } = await getPool().query(
    `SELECT id FROM twitter_registrations
     WHERE twitter_id = $1 AND status = 'approved'`,
    [session.twitterId]
  );
  return rows[0]?.id ?? null;
}

/** GET — return the member's current extension token (may be null). */
export async function GET() {
  await ensureSchema();
  const id = await resolveMemberId();
  if (id === null) {
    return NextResponse.json({ error: "请先用成员身份登录" }, { status: 401 });
  }
  const { rows } = await getPool().query(
    `SELECT ext_token FROM twitter_registrations WHERE id = $1`,
    [id]
  );
  return NextResponse.json({ token: rows[0]?.ext_token ?? null });
}

/** POST — create or rotate the member's extension token. */
export async function POST() {
  await ensureSchema();
  const id = await resolveMemberId();
  if (id === null) {
    return NextResponse.json({ error: "请先用成员身份登录" }, { status: 401 });
  }
  const token = generateExtToken();
  await getPool().query(
    `UPDATE twitter_registrations SET ext_token = $1, updated_at = now() WHERE id = $2`,
    [token, id]
  );
  return NextResponse.json({ ok: true, token });
}
