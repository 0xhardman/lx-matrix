import { NextRequest, NextResponse } from "next/server";
import { GATE_COOKIE, MEMBER_COOKIE, verifyGatePass } from "@/app/lib/gate";
import { SESSION_COOKIE, readSession } from "@/app/lib/session";

// Pages that require an invite (or member) to view.
const GATED_PATHS = ["/", "/rules"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isGated = GATED_PATHS.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/"))
  );
  if (!isGated) return NextResponse.next();

  const hasGatePass = await verifyGatePass(req.cookies.get(GATE_COOKIE)?.value);
  const hasMember = Boolean(req.cookies.get(MEMBER_COOKIE)?.value);
  const hasSession = Boolean(
    await readSession(req.cookies.get(SESSION_COOKIE)?.value)
  );

  if (hasGatePass || hasMember || hasSession) return NextResponse.next();

  // Not unlocked — send to the gate, remembering where they wanted to go.
  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on the gated pages only; skip api, static, assets.
  matcher: ["/", "/rules/:path*"],
};
