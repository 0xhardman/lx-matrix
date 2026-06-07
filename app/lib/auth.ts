import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "lx_admin";

function getSecret(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error("ADMIN_PASSWORD is not set");
  return pw;
}

/**
 * Constant-time comparison of a candidate password against ADMIN_PASSWORD.
 */
export function checkPassword(candidate: string): boolean {
  const expected = Buffer.from(getSecret());
  const got = Buffer.from(candidate);
  if (expected.length !== got.length) return false;
  return timingSafeEqual(expected, got);
}

/**
 * The cookie token is an HMAC of a fixed marker keyed by the admin password,
 * so it can't be forged without the password and invalidates if the password
 * changes. No expiry — session is cleared by logout or cookie removal.
 */
export function makeToken(): string {
  return createHmac("sha256", getSecret()).update("admin-v1").digest("hex");
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  let expected: string;
  try {
    expected = makeToken();
  } catch {
    return false;
  }
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const ADMIN_COOKIE = COOKIE_NAME;
