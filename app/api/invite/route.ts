import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureSchema, getPool } from "@/app/lib/db";
import { generateInviteCode, inviteTtlHours } from "@/app/lib/gate";
import { SESSION_COOKIE, readSession } from "@/app/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resolve the current member from the OAuth session, re-checking the DB by
 * stable twitter_id so a deactivated member is rejected immediately (no waiting
 * for the 30-day session to expire). Returns the member row or null.
 */
async function resolveMember() {
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value);
  if (!session?.twitterId) return null;
  const { rows } = await getPool().query(
    `SELECT id, twitter, twitter_id, status
     FROM twitter_registrations
     WHERE twitter_id = $1 AND status = 'approved'`,
    [session.twitterId]
  );
  return rows[0] ?? null;
}

/**
 * GET — list the logged-in member's invite codes.
 */
export async function GET() {
  await ensureSchema();
  const member = await resolveMember();
  if (!member) {
    return NextResponse.json({ error: "请先用成员身份登录" }, { status: 401 });
  }
  const { rows } = await getPool().query(
    `SELECT code, expires_at, used_at, used_by_twitter, created_at
     FROM invite_codes WHERE created_by = $1 ORDER BY created_at DESC`,
    [member.twitter_id]
  );
  return NextResponse.json({ member: { twitter: member.twitter }, codes: rows });
}

/**
 * POST — generate a new single-use, time-limited invite code for this member.
 */
export async function POST() {
  await ensureSchema();
  const member = await resolveMember();
  if (!member) {
    return NextResponse.json({ error: "请先用成员身份登录" }, { status: 401 });
  }

  // Generate a unique code (retry on the off chance of a collision).
  let code = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const exists = await getPool().query(
      `SELECT 1 FROM invite_codes WHERE code = $1`,
      [code]
    );
    if (exists.rowCount === 0) break;
    code = generateInviteCode();
  }

  const expiresAt = new Date(
    Date.now() + inviteTtlHours() * 60 * 60 * 1000
  ).toISOString();

  await getPool().query(
    `INSERT INTO invite_codes (code, created_by, created_by_twitter, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [code, member.twitter_id, member.twitter, expiresAt]
  );

  return NextResponse.json({ ok: true, code, expires_at: expiresAt });
}
