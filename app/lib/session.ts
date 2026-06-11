// Twitter-OAuth login session. A signed, tamper-proof cookie carrying the
// logged-in user's Twitter handle. Edge/Node compatible (Web Crypto only).

export const SESSION_COOKIE = "lx_session";
export const OAUTH_STATE_COOKIE = "lx_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "lx_oauth_verifier";

function sessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.GATE_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "lx-session-dev"
  );
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return b64url(new Uint8Array(sig));
}

export interface SessionData {
  twitter: string; // @handle
  name?: string;
  avatar?: string;
}

/** Create a signed session token: base64url(json).signature */
export async function signSession(data: SessionData): Promise<string> {
  const payload = b64url(new TextEncoder().encode(JSON.stringify(data)));
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

/** Verify and decode a session token. Returns null if missing/tampered. */
export async function readSession(
  token: string | undefined
): Promise<SessionData | null> {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = await hmac(payload);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++)
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    return JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
  } catch {
    return null;
  }
}

// --- PKCE helpers for the OAuth 2.0 Authorization Code flow ---

export function randomUrlToken(bytes = 32): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return b64url(a);
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return b64url(new Uint8Array(digest));
}
