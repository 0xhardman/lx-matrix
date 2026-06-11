import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSession } from "@/app/lib/session";
import { MEMBER_COOKIE } from "@/app/lib/gate";

export const metadata: Metadata = {
  title: "登录 | LX 矩阵 · 蓝V互推",
  description: "用 Twitter 登录 LX 矩阵蓝V互推。",
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value);
  const isMember = Boolean(store.get(MEMBER_COOKIE)?.value);

  return (
    <div className="mx-auto flex max-w-[460px] flex-col items-center px-5 py-20 text-center">
      <h1 className="text-3xl font-bold tracking-tight">登录</h1>

      {session && isMember ? (
        <>
          <p className="mt-5 leading-relaxed text-muted">
            已登录为{" "}
            <span className="font-semibold text-foreground">
              {session.twitter}
            </span>
            ，你是已通过审核的成员 💗
          </p>
          <Link
            href="/"
            className="mt-8 w-full rounded-md bg-primary px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-85"
          >
            进入社群
          </Link>
          <Link
            href="/invite"
            className="mt-3 w-full rounded-md border border-divider px-6 py-3 text-base font-semibold transition-colors hover:bg-alternate"
          >
            管理我的邀请码
          </Link>
        </>
      ) : session && !isMember ? (
        <>
          <p className="mt-5 leading-relaxed text-muted">
            已用{" "}
            <span className="font-semibold text-foreground">
              {session.twitter}
            </span>{" "}
            登录，但你还不是成员。
          </p>
          <p className="mt-2 text-sm text-muted">
            想加入的话，凭邀请码提交入群申请，审核通过后即可用 Twitter 直接进入。
          </p>
          <Link
            href="/gate"
            className="mt-8 w-full rounded-md bg-primary px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-85"
          >
            用邀请码申请加入
          </Link>
        </>
      ) : (
        <>
          <p className="mt-5 leading-relaxed text-muted">
            已通过审核的成员可以用 Twitter 登录，直接进入社群、管理邀请码。
          </p>
          {sp.error && (
            <p className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">
              登录失败（{sp.error}），请重试。
            </p>
          )}
          <a
            href="/api/auth/twitter"
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-md bg-black px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-85"
          >
            <span className="text-lg">𝕏</span> 用 Twitter 登录
          </a>
          <p className="mt-5 text-sm text-muted">
            还不是成员？
            <Link href="/gate" className="ml-1 underline underline-offset-4">
              凭邀请码申请加入
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
