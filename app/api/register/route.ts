import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureSchema, getPool } from "@/app/lib/db";
import { GATE_CODE_COOKIE, normalizeCode } from "@/app/lib/gate";
import { SESSION_COOKIE, readSession } from "@/app/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_DIRECTIONS = ["Web3", "AI", "技术", "投研"];
const VALID_FREQUENCIES = ["日更", "周更", "不定期"];

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: Request) {
  // Identity comes from the OAuth session — the applicant must be logged in,
  // so the Twitter account is verified (not self-typed) and we capture the
  // stable user id.
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value);
  if (!session?.twitterId) {
    return NextResponse.json(
      { error: "请先用 Twitter 登录，再提交申请" },
      { status: 401 }
    );
  }
  const twitter = session.twitter;
  const twitterId = session.twitterId;

  let p: Record<string, unknown>;
  try {
    p = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  // --- parse & validate ---
  const wechat = asString(p.wechat);
  const hasBlueV = p.hasBlueV === true;
  const isLxdaoMember = p.isLxdaoMember === true;
  const lxdaoProof = asString(p.lxdaoProof) || null;
  const directions = Array.isArray(p.directions)
    ? p.directions.filter(
        (d): d is string =>
          typeof d === "string" && VALID_DIRECTIONS.includes(d)
      )
    : [];
  const frequency = asString(p.frequency);
  const intro = asString(p.intro);
  const referrer = asString(p.referrer) || null;

  if (!wechat) {
    return NextResponse.json({ error: "请填写微信名称" }, { status: 400 });
  }
  if (wechat.length > 64) {
    return NextResponse.json(
      { error: "微信名称过长（最多 64 个字符）" },
      { status: 400 }
    );
  }
  if (!hasBlueV) {
    return NextResponse.json(
      { error: "入群要求有蓝V，请确认你已开通蓝V" },
      { status: 400 }
    );
  }
  if (!isLxdaoMember) {
    return NextResponse.json(
      { error: "入群要求为 LXDAO 成员" },
      { status: 400 }
    );
  }
  if (directions.length === 0) {
    return NextResponse.json(
      { error: "请至少选择一个内容方向" },
      { status: 400 }
    );
  }
  if (!VALID_FREQUENCIES.includes(frequency)) {
    return NextResponse.json({ error: "请选择更新频率" }, { status: 400 });
  }
  if (!intro) {
    return NextResponse.json(
      { error: "请用一句话介绍你的主要内容" },
      { status: 400 }
    );
  }
  if (intro.length > 500) {
    return NextResponse.json(
      { error: "介绍过长（最多 500 个字符）" },
      { status: 400 }
    );
  }

  // Invite code: read from the gate cookie (set when the visitor unlocked).
  const inviteCode = normalizeCode(store.get(GATE_CODE_COOKIE)?.value ?? "");
  if (!inviteCode) {
    return NextResponse.json(
      { error: "请先通过邀请码进入，再提交申请" },
      { status: 403 }
    );
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await ensureSchema();
    await client.query("BEGIN");

    // Lock the code row and re-check validity inside the transaction.
    const { rows } = await client.query(
      `SELECT code, expires_at, used_at FROM invite_codes WHERE code = $1 FOR UPDATE`,
      [inviteCode]
    );
    const codeRow = rows[0];
    if (!codeRow) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "邀请码无效" }, { status: 403 });
    }
    if (codeRow.used_at) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "邀请码已被使用" }, { status: 410 });
    }
    if (new Date(codeRow.expires_at).getTime() < Date.now()) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "邀请码已过期" }, { status: 410 });
    }

    // Upsert by stable twitter_id (the identity). Re-applying resets to pending.
    const fields = [
      wechat,
      hasBlueV,
      isLxdaoMember,
      lxdaoProof,
      directions,
      frequency,
      intro,
      referrer,
      inviteCode,
      twitter,
      twitterId,
    ];
    const existing = await client.query(
      `SELECT id FROM twitter_registrations WHERE twitter_id = $1`,
      [twitterId]
    );
    if (existing.rows[0]) {
      await client.query(
        `UPDATE twitter_registrations SET
           wechat = $1, has_blue_v = $2, is_lxdao_member = $3, lxdao_proof = $4,
           directions = $5, frequency = $6, intro = $7, referrer = $8,
           invite_code_used = $9, twitter = $10, status = 'pending',
           updated_at = now()
         WHERE twitter_id = $11`,
        fields
      );
    } else {
      await client.query(
        `INSERT INTO twitter_registrations
           (wechat, has_blue_v, is_lxdao_member, lxdao_proof, directions,
            frequency, intro, referrer, invite_code_used, twitter, twitter_id,
            status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')`,
        fields
      );
    }

    // Burn the code.
    await client.query(
      `UPDATE invite_codes SET used_at = now(), used_by_twitter = $2 WHERE code = $1`,
      [inviteCode, twitter]
    );

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, twitter });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[register] failed to save application:", err);
    return NextResponse.json({ error: "提交失败，请稍后再试" }, { status: 500 });
  } finally {
    client.release();
  }
}
