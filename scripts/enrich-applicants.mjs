#!/usr/bin/env node
/**
 * Read every applicant's Twitter handle from the database and enrich it with
 * public profile data fetched via the xapi CLI. Read-only on the database.
 *
 * Usage:
 *   node scripts/enrich-applicants.mjs                 # all applicants
 *   node scripts/enrich-applicants.mjs --status pending
 *   node scripts/enrich-applicants.mjs @handle1 @handle2   # ad-hoc handles, no DB
 *   node scripts/enrich-applicants.mjs --json          # machine-readable output
 *
 * Reads DATABASE_URL from .env (same as the app).
 */

import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Pool } from "pg";

const execFileP = promisify(execFile);

// --- load .env (simple parser, same convention as the app) ---
function loadEnv() {
  try {
    for (const line of readFileSync(".env", "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
    }
  } catch {
    /* no .env, rely on real env */
  }
}

// --- SSL resolution, mirrors app/lib/db.ts: verify by default ---
function resolveSsl(cs) {
  if (cs.includes("sslmode=disable")) return false;
  if (process.env.DATABASE_CA_CERT) return { ca: process.env.DATABASE_CA_CERT };
  if (process.env.DATABASE_SSL_NO_VERIFY === "true") return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

// --- args ---
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const statusIdx = args.indexOf("--status");
const statusFilter = statusIdx !== -1 ? args[statusIdx + 1] : null;
const adHocHandles = args.filter((a) => a.startsWith("@") || /^[A-Za-z0-9_]{1,15}$/.test(a));

// --- get the list of handles (from DB or ad-hoc) ---
async function getApplicants() {
  if (adHocHandles.length > 0) {
    return adHocHandles.map((h) => ({
      twitter: h.startsWith("@") ? h : `@${h}`,
      wechat: null,
      status: null,
    }));
  }
  loadEnv();
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("DATABASE_URL not set (and no @handles given)");
  const pool = new Pool({ connectionString: cs, ssl: resolveSsl(cs) });
  const where = statusFilter ? "WHERE status = $1" : "";
  const params = statusFilter ? [statusFilter] : [];
  const { rows } = await pool.query(
    `SELECT twitter, wechat, status, directions, frequency
     FROM twitter_registrations ${where}
     ORDER BY created_at DESC`,
    params
  );
  await pool.end();
  return rows;
}

// --- fetch one profile via xapi ---
async function fetchProfile(handle) {
  const screen = handle.replace(/^@/, "");
  try {
    const { stdout } = await execFileP(
      "npx",
      ["xapi-to", "call", "twitter.user_by_screen_name", "--input", JSON.stringify({ screen_name: screen })],
      { maxBuffer: 10 * 1024 * 1024 }
    );
    const j = JSON.parse(stdout);
    if (!j.success || !j.data) return { error: "not found" };
    const d = j.data;
    return {
      name: d.name,
      screen_name: d.screen_name,
      followers: d.followers_count,
      following: d.friends_count,
      tweets: d.statuses_count,
      likes: d.favourites_count,
      media: d.media_count,
      created_at: d.created_at,
      description: (d.description || "").replace(/\s+/g, " ").trim(),
      url: `https://x.com/${d.screen_name}`,
    };
  } catch (e) {
    return { error: e.message.slice(0, 120) };
  }
}

function fmt(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

// --- main ---
const applicants = await getApplicants();

if (applicants.length === 0) {
  console.log(asJson ? "[]" : "数据库里目前没有报名记录（0 条）。");
  process.exit(0);
}

const results = [];
for (const a of applicants) {
  const profile = await fetchProfile(a.twitter);
  results.push({ ...a, profile });
}

if (asJson) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log(`\n共 ${results.length} 位报名者：\n`);
  for (const r of results) {
    const p = r.profile;
    console.log(`━━━ ${r.twitter}${r.wechat ? `  (微信: ${r.wechat})` : ""}${r.status ? `  [${r.status}]` : ""}`);
    if (p.error) {
      console.log(`    ⚠️  抓取失败: ${p.error}`);
    } else {
      console.log(`    ${p.name}  ·  ${p.url}`);
      console.log(`    粉丝 ${fmt(p.followers)} | 关注 ${fmt(p.following)} | 推文 ${fmt(p.tweets)} | 点赞 ${fmt(p.likes)}`);
      if (p.description) console.log(`    简介: ${p.description.slice(0, 100)}`);
    }
    console.log();
  }
}
