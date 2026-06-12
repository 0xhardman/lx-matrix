import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSession } from "@/app/lib/session";

const highlights = [
  {
    title: "小而精",
    desc: "首批 20 人，控制在 ~30 人以内。新成员由现有群友推荐，保持质量。",
  },
  {
    title: "互推带流量",
    desc: "蓝V 之间互相评论、点赞、转推，把双方的流量都做起来。",
  },
  {
    title: "内容方向",
    desc: "Web3 / AI / 技术 / 投研。认真讨论，不水评，保持周更节奏。",
  },
];

export default async function Home() {
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value);
  const isMember = Boolean(session?.isMember);
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-divider bg-alternate">
        <div className="mx-auto max-w-[1216px] px-5 py-20 text-center sm:py-28">
          <span className="inline-block rounded-full border border-divider bg-background px-4 py-1.5 text-sm font-medium text-muted">
            LXDAO 蓝V 互推矩阵 <span className="text-secondary-dark">💗</span>
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            一起看看能不能
            <br className="hidden sm:block" /> 赚点老马的钱
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            蓝V 之间互相评论、点赞、转推，把双方的流量都做起来。小而精的
            LXDAO 互推社群，聚焦 Web3 / AI / 技术 / 投研。
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isMember ? (
              <Link
                href="/invite"
                className="w-full rounded-md bg-primary px-7 py-3 text-base font-semibold text-white transition-opacity hover:opacity-85 sm:w-auto"
              >
                我的邀请码
              </Link>
            ) : (
              <Link
                href="/register"
                className="w-full rounded-md bg-primary px-7 py-3 text-base font-semibold text-white transition-opacity hover:opacity-85 sm:w-auto"
              >
                申请加入
              </Link>
            )}
            <Link
              href="/rules"
              className="w-full rounded-md border border-divider bg-background px-7 py-3 text-base font-semibold text-foreground transition-colors hover:bg-alternate-dark sm:w-auto"
            >
              查看群规则
            </Link>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="mx-auto max-w-[1216px] px-5 py-16 sm:py-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {highlights.map((h) => (
            <div
              key={h.title}
              className="rounded-lg border border-divider bg-background p-6 shadow-[0_4px_24px_var(--card-shadow)]"
            >
              <h3 className="text-xl font-semibold">{h.title}</h3>
              <p className="mt-3 leading-relaxed text-muted">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA — members are already in, so only show the apply prompt to guests. */}
      {isMember ? (
        <section className="mx-auto max-w-[1216px] px-5 pb-20">
          <div className="flex flex-col items-center justify-between gap-6 rounded-xl bg-primary px-8 py-12 text-center sm:flex-row sm:text-left">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                邀请你的朋友加入
              </h2>
              <p className="mt-2 text-white/70">
                生成邀请码分享出去，一起把流量做起来 💗
              </p>
            </div>
            <Link
              href="/invite"
              className="shrink-0 rounded-md bg-secondary px-7 py-3 text-base font-semibold text-black transition-opacity hover:opacity-85"
            >
              生成邀请码 →
            </Link>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-[1216px] px-5 pb-20">
          <div className="flex flex-col items-center justify-between gap-6 rounded-xl bg-primary px-8 py-12 text-center sm:flex-row sm:text-left">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                准备好加入了吗？
              </h2>
              <p className="mt-2 text-white/70">
                填写申请信息，通过 review 后我们会与你联系。
              </p>
            </div>
            <Link
              href="/register"
              className="shrink-0 rounded-md bg-secondary px-7 py-3 text-base font-semibold text-black transition-opacity hover:opacity-85"
            >
              去申请 →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
