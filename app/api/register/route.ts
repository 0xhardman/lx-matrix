import { NextResponse } from "next/server";
import { ensureSchema, getPool } from "@/app/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_DIRECTIONS = ["Web3", "AI", "技术", "投研"];
const VALID_FREQUENCIES = ["日更", "周更", "不定期"];

/**
 * Normalize a Twitter input into a clean @handle.
 * Accepts a full URL (https://x.com/foo), "@foo", or "foo".
 * Returns null if no plausible handle can be extracted.
 */
function normalizeTwitter(raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;

  const urlMatch = v.match(
    /(?:twitter\.com|x\.com)\/(?:#!\/)?@?([A-Za-z0-9_]{1,15})/i
  );
  if (urlMatch) {
    v = urlMatch[1];
  } else {
    v = v.replace(/^@/, "");
  }

  if (!/^[A-Za-z0-9_]{1,15}$/.test(v)) return null;
  return `@${v}`;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: Request) {
  let p: Record<string, unknown>;
  try {
    p = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  // --- parse & validate ---
  const twitter = normalizeTwitter(asString(p.twitter));
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

  if (!twitter) {
    return NextResponse.json(
      { error: "请填写有效的 Twitter 账号或链接" },
      { status: 400 }
    );
  }
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

  try {
    await ensureSchema();
    // Upsert by twitter. Re-applying resets status to pending for re-review.
    await getPool().query(
      `
      INSERT INTO twitter_registrations
        (twitter, wechat, has_blue_v, is_lxdao_member, lxdao_proof,
         directions, frequency, intro, referrer, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
      ON CONFLICT (lower(twitter)) DO UPDATE SET
        wechat = EXCLUDED.wechat,
        has_blue_v = EXCLUDED.has_blue_v,
        is_lxdao_member = EXCLUDED.is_lxdao_member,
        lxdao_proof = EXCLUDED.lxdao_proof,
        directions = EXCLUDED.directions,
        frequency = EXCLUDED.frequency,
        intro = EXCLUDED.intro,
        referrer = EXCLUDED.referrer,
        status = 'pending',
        updated_at = now()
      `,
      [
        twitter,
        wechat,
        hasBlueV,
        isLxdaoMember,
        lxdaoProof,
        directions,
        frequency,
        intro,
        referrer,
      ]
    );
    return NextResponse.json({ ok: true, twitter });
  } catch (err) {
    console.error("[register] failed to save application:", err);
    return NextResponse.json({ error: "提交失败，请稍后再试" }, { status: 500 });
  }
}
