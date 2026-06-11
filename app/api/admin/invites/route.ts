import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyToken } from "@/app/lib/auth";
import { ensureSchema, getPool } from "@/app/lib/db";
import { generateInviteCode, inviteTtlHours } from "@/app/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(ADMIN_COOKIE)?.value);
}

/** GET — list all invite codes. */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT code, created_by, created_by_twitter, expires_at,
            used_at, used_by_twitter, created_at
     FROM invite_codes ORDER BY created_at DESC LIMIT 200`
  );
  return NextResponse.json({ codes: rows });
}

/** POST — admin generates an invite code. */
export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  await ensureSchema();

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
     VALUES ($1, 'admin', 'admin', $2)`,
    [code, expiresAt]
  );

  return NextResponse.json({ ok: true, code, expires_at: expiresAt });
}
