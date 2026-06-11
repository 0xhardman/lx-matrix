// Edge- and Node-compatible gate helpers. Uses Web Crypto (available in both
// the Edge runtime used by middleware and the Node runtime used by API routes),
// so this module must NOT import node:crypto.

export const GATE_COOKIE = "lx_gate"; // temporary "unlocked via invite" pass
export const GATE_CODE_COOKIE = "lx_gate_code"; // which code unlocked
export const MEMBER_COOKIE = "lx_member"; // approved member token

/**
 * Default invite-code lifetime, in hours. Overridable via INVITE_TTL_HOURS.
 */
export function inviteTtlHours(): number {
  const v = Number(process.env.INVITE_TTL_HOURS);
  return Number.isFinite(v) && v > 0 ? v : 72; // default 3 days
}

function randBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

/**
 * Generate a human-friendly single-use invite code, e.g. "LX-7F3K9Q".
 */
export function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  const bytes = randBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[bytes[i] % alphabet.length];
  return `LX-${s}`;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Member token: an opaque random id issued when an application is approved.
 * Acts as both a site-access pass and the identity used to mint invite codes.
 */
export function generateMemberToken(): string {
  const bytes = randBytes(24);
  return (
    "m_" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

// --- gate pass (signed HMAC, so we don't need a DB lookup on every request) ---

function gateSecret(): string {
  // Reuse ADMIN_PASSWORD as the signing secret if no dedicated one is set.
  return process.env.GATE_SECRET || process.env.ADMIN_PASSWORD || "lx-gate-dev";
}

const GATE_MESSAGE = "gate-v1";

async function hmacHex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(gateSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function makeGatePass(): Promise<string> {
  return hmacHex(GATE_MESSAGE);
}

export async function verifyGatePass(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await hmacHex(GATE_MESSAGE);
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
