import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策 | LX 矩阵",
  description: "LX 矩阵网站与浏览器插件的隐私政策、数据收集与使用说明。",
};

const UPDATED = "2026-06-13";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="space-y-3 leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div>
      <section className="border-b border-divider bg-alternate">
        <div className="mx-auto max-w-[760px] px-5 py-12 text-center sm:py-14">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            隐私政策
          </h1>
          <p className="mt-3 text-sm text-muted">最近更新：{UPDATED}</p>
        </div>
      </section>

      <div className="mx-auto max-w-[760px] space-y-10 px-5 py-12">
        <Section title="概述">
          <p>
            LX 矩阵是 LXDAO
            蓝V互推社群的管理工具，由网站和配套浏览器插件（“LX 矩阵 ·
            流量矩阵助手”）组成。本政策说明我们收集哪些数据、为什么收集、如何使用，以及插件具体读取了什么。
            我们只为运营互推社群这一个目的处理数据，不出售、不用于广告、不挪作他用。
          </p>
        </Section>

        <Section title="我们收集的数据">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold text-foreground">账号信息</span>
              ：你通过 Twitter/X 登录时授权的公开资料（用户 ID、用户名、昵称、头像）；
              申请入群时你填写的微信名称、内容方向、自我介绍。
            </li>
            <li>
              <span className="font-semibold text-foreground">公开推文数据</span>
              ：通过公开数据接口抓取的成员公开推文及其计数（发帖数、点赞、转推、回复等），
              用于生成动态流和“今日是否发帖”。
            </li>
            <li>
              <span className="font-semibold text-foreground">互动打卡记录</span>
              ：哪位成员对哪条成员推文完成了互动，以及来源（插件面板或 x.com 页面）。
            </li>
            <li>
              <span className="font-semibold text-foreground">本地设置</span>
              ：插件在你浏览器本地（<code>chrome.storage.local</code>）保存服务地址和你的扩展令牌，
              仅本机可见，不会上传到第三方。
            </li>
          </ul>
          <p>我们不收集你的密码，也不读取你 Twitter/X 的私信或非公开内容。</p>
        </Section>

        <Section title="浏览器插件具体读取了什么">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              在 <code>x.com</code> / <code>twitter.com</code> 时间线上，插件读取页面上已公开的
              推文作者与链接，用来识别哪些是矩阵成员的推文并打上标记。
            </li>
            <li>
              当你在成员推文上点击 点赞 / 转推 / 回复 时，插件仅把该推文的
              <span className="font-semibold text-foreground"> ID </span>
              上报到本站后端用于打卡，不会读取或上传页面其它内容。
            </li>
            <li>
              在本站 <code>/extension</code> 页面，插件接收页面交给它的扩展令牌并保存在本地，
              实现免手动配置。
            </li>
            <li>
              插件不会自动替你点赞或转推，所有互动都由你本人手动完成；插件只做提醒与记录。
            </li>
          </ul>
        </Section>

        <Section title="数据如何使用与存储">
          <p>
            数据存储在本项目的数据库（PostgreSQL）中，用于：成员审核、生成成员动态流与发帖情况、
            统计互动覆盖率。访问受成员令牌或登录态保护，仅已通过审核的成员可读取成员数据。
          </p>
          <p>
            我们<span className="font-semibold text-foreground">不会</span>
            出售你的数据，也不会与无关第三方共享。抓取公开推文依赖第三方数据服务，
            仅传递必要的公开账号标识。
          </p>
        </Section>

        <Section title="权限说明">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <code>storage</code>：在本地保存服务地址、扩展令牌和缓存。
            </li>
            <li>
              <code>alarms</code>：定时（每 30 分钟）刷新待互动数量并更新角标提醒。
            </li>
            <li>
              访问 <code>lx-matrix.vercel.app</code>：调用本站后端读取动态、上报打卡。
            </li>
            <li>
              访问 <code>x.com</code> / <code>twitter.com</code>
              ：识别成员推文并就地打卡。
            </li>
          </ul>
        </Section>

        <Section title="你的选择">
          <p>
            你可以随时卸载插件以停止其全部数据读取；卸载会清除插件在本地保存的设置。
            如需删除你在本站的成员数据或互动记录，请联系管理员。
          </p>
        </Section>

        <Section title="联系我们">
          <p>
            有任何隐私相关问题，请通过 LXDAO 社群或本项目仓库联系管理员：
            <a
              href="https://github.com/0xhardman/lx-matrix"
              className="ml-1 text-foreground underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              github.com/0xhardman/lx-matrix
            </a>
            。
          </p>
        </Section>
      </div>
    </div>
  );
}
