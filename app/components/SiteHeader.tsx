import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSession } from "@/app/lib/session";
import { MEMBER_COOKIE } from "@/app/lib/gate";
import { LogoutButton } from "./LogoutButton";

const linkClass =
  "rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-alternate hover:text-foreground";

export async function SiteHeader() {
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value);
  const hasMemberCookie = Boolean(store.get(MEMBER_COOKIE)?.value);
  // A member is anyone whose signed session says so, or who holds a member
  // token cookie (e.g. entered via /invite without OAuth).
  const isMember = Boolean(session?.isMember) || hasMemberCookie;
  // "Logged in" means authenticated by any means — so we always offer logout.
  const loggedIn = Boolean(session) || hasMemberCookie;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-divider bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1216px] items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/lxdao-logo.svg"
            alt="LXDAO"
            width={121}
            height={32}
            priority
          />
          <span className="hidden text-sm font-semibold text-muted sm:inline">
            矩阵 · 蓝V互推 <span className="text-secondary-dark">💗</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/rules" className={linkClass}>
            群规则
          </Link>

          {/* Members get the invite manager; non-members the apply link. */}
          {isMember ? (
            <Link href="/invite" className={linkClass}>
              我的邀请码
            </Link>
          ) : (
            <Link href="/register" className={linkClass}>
              申请加入
            </Link>
          )}

          {loggedIn ? (
            <LogoutButton />
          ) : (
            <Link href="/login" className={linkClass}>
              登录
            </Link>
          )}

          {/* Primary CTA: apply (guests) or enter (members). */}
          {isMember ? (
            <Link
              href="/"
              className="ml-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-85"
            >
              进入社群
            </Link>
          ) : (
            <Link
              href="/register"
              className="ml-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-85"
            >
              申请加入
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
