import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ensureSchema, getPool } from "@/app/lib/db";
import { GATE_COOKIE, makeGatePass, cookieSecure } from "@/app/lib/gate";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  SESSION_COOKIE,
  signSession,
} from "@/app/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const ME_URL =
  "https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name";

function baseUrl(request: Request): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function fail(request: Request, reason: string) {
  const url = new URL("/login", baseUrl(request));
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  const savedState = store.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = store.get(OAUTH_VERIFIER_COOKIE)?.value;

  if (!code || !state || !savedState || state !== savedState || !verifier) {
    return fail(request, "state_mismatch");
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!clientId) return fail(request, "not_configured");

  const redirectUri = `${baseUrl(request)}/api/auth/callback`;

  // Exchange the authorization code for an access token.
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  // Confidential clients authenticate with HTTP Basic; public clients don't.
  if (clientSecret) {
    headers.Authorization =
      "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  }

  let accessToken: string;
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers,
      body,
    });
    if (!tokenRes.ok) {
      console.error("[oauth] token exchange failed:", await tokenRes.text());
      return fail(request, "token_exchange");
    }
    accessToken = (await tokenRes.json()).access_token;
  } catch (err) {
    console.error("[oauth] token request error:", err);
    return fail(request, "token_exchange");
  }

  // Fetch the authenticated user (id is the stable identity key).
  let twitterId: string;
  let handle: string;
  let name: string | undefined;
  let avatar: string | undefined;
  try {
    const meRes = await fetch(ME_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meRes.ok) {
      console.error("[oauth] users/me failed:", await meRes.text());
      return fail(request, "user_fetch");
    }
    const me = (await meRes.json()).data;
    twitterId = String(me.id);
    handle = "@" + me.username;
    name = me.name;
    avatar = me.profile_image_url;
  } catch (err) {
    console.error("[oauth] users/me error:", err);
    return fail(request, "user_fetch");
  }

  // Look up membership by stable twitter_id, falling back to handle for legacy
  // rows that predate id capture. On a handle-match, backfill the id and keep
  // the handle current.
  let isMember = false;
  try {
    await ensureSchema();
    const pool = getPool();
    let { rows } = await pool.query(
      `SELECT id, status FROM twitter_registrations WHERE twitter_id = $1`,
      [twitterId]
    );
    if (rows.length === 0) {
      // Legacy fallback: match by handle, then backfill the id.
      const byHandle = await pool.query(
        `SELECT id, status FROM twitter_registrations WHERE lower(twitter) = lower($1)`,
        [handle]
      );
      if (byHandle.rows[0]) {
        rows = byHandle.rows;
        await pool.query(
          `UPDATE twitter_registrations SET twitter_id = $1, twitter = $2, updated_at = now() WHERE id = $3`,
          [twitterId, handle, byHandle.rows[0].id]
        );
      }
    } else {
      // Keep the display handle fresh in case it changed.
      await pool.query(
        `UPDATE twitter_registrations SET twitter = $1, updated_at = now() WHERE id = $2`,
        [handle, rows[0].id]
      );
    }
    isMember = rows[0]?.status === "approved";
  } catch (err) {
    console.error("[oauth] membership lookup failed:", err);
  }

  // Set the login session, and clear the one-time OAuth cookies.
  const dest = isMember ? "/" : "/login?status=not_member";
  const res = NextResponse.redirect(new URL(dest, baseUrl(request)));
  res.cookies.set(
    SESSION_COOKIE,
    await signSession({ twitterId, twitter: handle, name, avatar, isMember }),
    {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    }
  );
  res.cookies.delete(OAUTH_STATE_COOKIE);
  res.cookies.delete(OAUTH_VERIFIER_COOKIE);

  // Approved members get a gate pass so middleware lets them browse gated pages.
  if (isMember) {
    res.cookies.set(GATE_COOKIE, await makeGatePass(), {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
