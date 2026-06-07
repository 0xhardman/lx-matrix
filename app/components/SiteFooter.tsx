import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-divider bg-alternate">
      <div className="mx-auto flex max-w-[1216px] flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:flex-row">
        <p>
          LX 矩阵 · 蓝V互推 <span className="text-secondary-dark">💗</span> Built
          by{" "}
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
          <Link href="/register" className="hover:text-foreground">
            账号登记
          </Link>
        </nav>
      </div>
    </footer>
  );
}
