import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyToken } from "@/app/lib/auth";
import { ensureSchema, getPool, type ApplicationStatus } from "@/app/lib/db";
import { generateMemberToken } from "@/app/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUS: ApplicationStatus[] = ["pending", "approved", "rejected"];

async function requireAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(ADMIN_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    await ensureSchema();
    const { rows } = await getPool().query(
      `SELECT id, twitter, wechat, has_blue_v, is_lxdao_member, lxdao_proof,
              directions, frequency, intro, referrer, status,
              member_token, invite_code_used, created_at, updated_at
       FROM twitter_registrations
       ORDER BY
         CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
         created_at DESC`
    );
    return NextResponse.json({ applications: rows });
  } catch (err) {
    console.error("[admin] failed to list applications:", err);
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  let body: { id?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const id = Number(body.id);
  const status = body.status as ApplicationStatus;
  if (!Number.isInteger(id) || !VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  try {
    await ensureSchema();
    // On approval, issue a member_token once (if not already set) so the
    // member can access the site and mint invite codes.
    const { rows } = await getPool().query(
      `UPDATE twitter_registrations
       SET status = $1,
           member_token = CASE
             WHEN $1 = 'approved' AND member_token IS NULL THEN $3
             ELSE member_token
           END,
           updated_at = now()
       WHERE id = $2
       RETURNING member_token`,
      [status, id, generateMemberToken()]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, member_token: rows[0].member_token });
  } catch (err) {
    console.error("[admin] failed to update status:", err);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
