import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "群规则 | LX 矩阵",
  description: "LX 矩阵的入群要求、玩法与日常约定。",
};

type Section = {
  id: string;
  title: string;
  intro?: string;
  items?: string[];
  body?: string;
};

const sections: Section[] = [
  {
    id: "what",
    title: "这是干什么的？",
    body: "蓝V 之间互相评论、点赞、转推，可以把双方的流量都做起来。你可能听过蓝鸟会、0xU 这类组织——0xU 早期那批 KOL 靠互推给项目带货，确实赚到过钱。那个时代过去了，现在我们一起看看能不能赚点老马的钱。",
  },
  {
    id: "requirements",
    title: "入群要求",
    items: [
      "LXDAO 成员",
      "有蓝V",
      "积极参与群内互动",
      "保持更新频率（建议日更，至少周更）",
      "内容方向：Web3 / AI / 技术 / 投研",
    ],
  },
  {
    id: "scale",
    title: "群规模与准入",
    items: [
      "首批 20 人，之后慢慢加",
      "控制在 ~30 人以内，保持小而精",
      "新成员由现有群友推荐，简单说明 ta 的推特和内容方向",
    ],
  },
  {
    id: "first",
    title: "进群第一件事",
    body: "通过官网填写申请信息，发一下你的推特链接进行登记。",
  },
  {
    id: "howto",
    title: "互推怎么玩",
    items: [
      "有新文章 / 高质量 thread，丢群里 @所有人",
      "看到的群友：至少点赞，不强制，但鼓励参与",
      "有想法就认真评论讨论，不要水评（“好文”“学到了”这种算法会降权，反而伤号）",
      "转推视内容相关性自愿",
    ],
  },
  {
    id: "frequency",
    title: "频率约定",
    items: [
      "每人每天最多 2-3 次互推请求",
      "互推请求请发当天 / 前一天的内容，过期内容效果差",
    ],
  },
  {
    id: "agreements",
    title: "一些约定",
    items: [
      "群内会定期 review 活跃度和内容质量，长期潜水或跑题的可能会被请出",
      "长期不产出可以提前说一声“暂离”，不算潜水",
      "名字里加 💗 是可选建议，不强制（避免被算法整体识别）",
    ],
  },
  {
    id: "future",
    title: "未来可能",
    items: [
      "搭建推特群组，进一步联动",
      "开发浏览器插件：自动识别群成员发的推文，在 Twitter 上标记群成员身份，互推时一眼就能认出自己人",
    ],
  },
];

export default function RulesPage() {
  return (
    <div>
      {/* Header */}
      <section className="border-b border-divider bg-alternate">
        <div className="mx-auto max-w-[820px] px-5 py-16 text-center sm:py-20">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            欢迎加入 LX 矩阵蓝V互推
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
            这是基本的群规则。进群第一件事，记得先提交入群申请。
          </p>
          <Link
            href="/register"
            className="mt-8 inline-block rounded-md bg-primary px-7 py-3 text-base font-semibold text-white transition-opacity hover:opacity-85"
          >
            去提交入群申请 →
          </Link>
        </div>
      </section>

      {/* Content */}
      <article className="mx-auto max-w-[820px] px-5 py-14">
        <div className="space-y-12">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-20">
              <h2 className="flex items-baseline gap-3 text-2xl font-bold">
                <span className="h-5 w-1.5 self-center rounded-full bg-secondary" />
                {s.title}
              </h2>
              {s.body && (
                <p className="mt-4 leading-relaxed text-muted">{s.body}</p>
              )}
              {s.items && (
                <ul className="mt-4 space-y-2.5">
                  {s.items.map((item, i) => (
                    <li
                      key={i}
                      className="flex gap-3 leading-relaxed text-muted"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
