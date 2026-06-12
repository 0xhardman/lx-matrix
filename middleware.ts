import { NextRequest, NextResponse } from "next/server";
import { GATE_COOKIE, verifyGatePass } from "@/app/lib/gate";
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
  // Only an *approved member* session passes the gate — a logged-in non-member
  // must still use an invite code. isMember is signed into the token server-side.
  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  const isMemberSession = Boolean(session?.isMember);

  if (hasGatePass || isMemberSession) {
    return NextResponse.next();
  }

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
