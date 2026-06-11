import { NextResponse } from "next/server";
import { cookieSecure } from "@/app/lib/gate";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  pkceChallenge,
  randomUrlToken,
} from "@/app/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";

function baseUrl(request: Request): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

/**
 * Start the Twitter OAuth 2.0 (Authorization Code + PKCE) flow.
 * Redirects the user to X's consent screen.
 */
export async function GET(request: Request) {
  const clientId = process.env.TWITTER_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Twitter 登录未配置（缺少 TWITTER_CLIENT_ID）" },
      { status: 503 }
    );
  }

  const redirectUri = `${baseUrl(request)}/api/auth/callback`;
  const state = randomUrlToken(16);
  const verifier = randomUrlToken(32);
  const challenge = await pkceChallenge(verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "users.read tweet.read",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  const res = NextResponse.redirect(`${AUTHORIZE_URL}?${params.toString()}`);
  const cookieOpts = {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 min to complete the flow
  };
  res.cookies.set(OAUTH_STATE_COOKIE, state, cookieOpts);
  res.cookies.set(OAUTH_VERIFIER_COOKIE, verifier, cookieOpts);
  return res;
}
