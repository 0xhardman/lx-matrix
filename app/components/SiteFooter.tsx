import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSession } from "@/app/lib/session";

export async function SiteFooter() {
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value);
  const isMember = Boolean(session?.isMember);
  return (
    <footer className="border-t border-divider bg-alternate">
      <div className="mx-auto flex max-w-[1216px] flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:flex-row">
        <p>
          LX 矩阵 <span className="text-secondary-dark">💗</span> Built by{" "}
          <Link
            href="https://lxdao.io"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            LXDAO
          </Link>
        </p>
        <nav className="flex items-center gap-4">
          <Link href="/rules" className="hover:text-foreground">
            群规则
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            隐私政策
          </Link>
          {isMember ? (
            <Link href="/invite" className="hover:text-foreground">
              我的邀请码
            </Link>
          ) : (
            <Link href="/register" className="hover:text-foreground">
              申请加入
            </Link>
          )}
        </nav>
      </div>
    </footer>
  );
}
