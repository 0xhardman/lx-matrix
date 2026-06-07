import Image from "next/image";
import Link from "next/link";

const navItems = [
  { href: "/rules", label: "群规则" },
  { href: "/register", label: "账号登记" },
];

export function SiteHeader() {
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
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-alternate hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/register"
            className="ml-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-85"
          >
            登记我的推特
          </Link>
        </nav>
      </div>
    </header>
  );
}
