import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureSchema, getPool } from "@/app/lib/db";
import {
  MEMBER_COOKIE,
  generateInviteCode,
  inviteTtlHours,
} from "@/app/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resolve the member from a token (body or cookie). Returns the member row or
 * null. Only approved members with a token can act.
 */
async function resolveMember(token: string) {
  if (!token) return null;
  const { rows } = await getPool().query(
    `SELECT id, twitter, member_token, status
     FROM twitter_registrations
     WHERE member_token = $1 AND status = 'approved'`,
    [token]
  );
  return rows[0] ?? null;
}

function setMemberCookie(res: NextResponse, token: string) {
  res.cookies.set(MEMBER_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180, // 180 days
  });
}

async function listCodesResponse(token: string) {
  const member = await resolveMember(token);
  if (!member) {
    return NextResponse.json({ error: "无效的成员凭证" }, { status: 401 });
  }
  const { rows } = await getPool().query(
    `SELECT code, expires_at, used_at, used_by_twitter, created_at
     FROM invite_codes WHERE created_by = $1 ORDER BY created_at DESC`,
    [member.member_token]
  );
  const res = NextResponse.json({
    member: { twitter: member.twitter },
    codes: rows,
  });
  setMemberCookie(res, token);
  return res;
}

/**
 * GET — list this member's invite codes using the httpOnly lx_member cookie.
 * (No token in the query string — that would leak it into logs/history.)
 */
export async function GET() {
  await ensureSchema();
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value || "";
  return listCodesResponse(token);
}

/**
 * PUT — bootstrap a session from a pasted token (token in the JSON body, not
 * the URL). Sets the member cookie and returns the code list.
 */
export async function PUT(request: Request) {
  await ensureSchema();
  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  return listCodesResponse(token);
}

/**
 * POST — generate a new single-use, time-limited invite code for this member.
 */
export async function POST(request: Request) {
  await ensureSchema();
  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const store = await cookies();
  const token =
    (typeof body.token === "string" ? body.token : "") ||
    store.get(MEMBER_COOKIE)?.value ||
    "";

  const member = await resolveMember(token);
  if (!member) {
    return NextResponse.json({ error: "无效的成员凭证" }, { status: 401 });
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

  const ttlMs = inviteTtlHours() * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  await getPool().query(
    `INSERT INTO invite_codes (code, created_by, created_by_twitter, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [code, member.member_token, member.twitter, expiresAt]
  );

  const res = NextResponse.json({
    ok: true,
    code,
    expires_at: expiresAt,
  });
  setMemberCookie(res, token);
  return res;
}
