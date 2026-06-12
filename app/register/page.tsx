import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSession } from "@/app/lib/session";
import { GATE_CODE_COOKIE } from "@/app/lib/gate";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "申请加入 | LX 矩阵",
  description: "填写申请信息，申请加入 LX 矩阵。",
};

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value);
  const hasInvite = Boolean(store.get(GATE_CODE_COOKIE)?.value);
  const isMember = Boolean(session?.isMember);

  return (
    <div>
      <section className="border-b border-divider bg-alternate">
        <div className="mx-auto max-w-[640px] px-5 py-16 text-center sm:py-20">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            申请加入
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-muted">
            填写下面的信息申请加入。通过 review 后，我们会通过微信与你联系。
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[640px] px-5 py-14">
        {isMember ? (
          <Notice
            title="你已经是成员啦 💗"
            body="无需再次申请。可以去生成邀请码，邀请你的朋友加入。"
            cta={{ href: "/invite", label: "我的邀请码" }}
          />
        ) : !session ? (
          <Notice
            title="先用 Twitter 登录"
            body="申请前需要先用 Twitter 登录，这样你的账号是验证过的、无需手填。"
            cta={{ href: "/api/auth/twitter", label: "用 Twitter 登录", raw: true }}
          />
        ) : !hasInvite ? (
          <Notice
            title="需要邀请码"
            body="本群为邀请制。请先用邀请码进入，再回来提交申请。没有邀请码？向已加入的群友索取。"
            cta={{ href: "/gate?from=/register", label: "输入邀请码" }}
          />
        ) : (
          <RegisterForm twitter={session.twitter} />
        )}
      </div>
    </div>
  );
}

function Notice({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { href: string; label: string; raw?: boolean };
}) {
  return (
    <div className="rounded-xl border border-divider bg-background p-8 text-center shadow-[0_4px_24px_var(--card-shadow)]">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm leading-relaxed text-muted">{body}</p>
      {cta.raw ? (
        <a
          href={cta.href}
          className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-85"
        >
          {cta.label}
        </a>
      ) : (
        <Link
          href={cta.href}
          className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-85"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
