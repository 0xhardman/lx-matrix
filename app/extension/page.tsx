import type { Metadata } from "next";
import { ExtTokenManager } from "./ExtTokenManager";

export const metadata: Metadata = {
  title: "浏览器插件 | LX 矩阵",
  description: "安装 LX 矩阵成员监控浏览器插件。",
};

export const dynamic = "force-dynamic";

const DOWNLOAD = "/lx-matrix-extension.zip";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
        {n}
      </span>
      <div className="leading-relaxed">{children}</div>
    </li>
  );
}

export default function ExtensionPage() {
  return (
    <div>
      <section className="border-b border-divider bg-alternate">
        <div className="mx-auto max-w-[720px] px-5 py-14 text-center sm:py-16">
          <span className="text-4xl">🧩</span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            浏览器插件
          </h1>
          <p className="mx-auto mt-4 max-w-md leading-relaxed text-muted">
            流量矩阵助手：成员新帖自动进入你的待互动队列，浏览器角标提醒；
            在 X 上刷到成员推文会打「LX 矩阵」标，点赞/转发/回复自动打卡。
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[720px] space-y-12 px-5 py-12">
        {/* Step 1: download */}
        <section>
          <h2 className="text-xl font-bold">① 下载插件</h2>
          <p className="mt-2 leading-relaxed text-muted">
            下载并解压到一个你不会删掉的文件夹（插件加载后需要这个目录一直存在）。
          </p>
          <a
            href={DOWNLOAD}
            download
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-85"
          >
            ⬇ 下载插件压缩包
          </a>
        </section>

        {/* Step 2: load into Chrome */}
        <section>
          <h2 className="text-xl font-bold">② 加载到 Chrome</h2>
          <ol className="mt-4 space-y-3 text-muted">
            <Step n={1}>解压下载的 zip，得到一个文件夹。</Step>
            <Step n={2}>
              地址栏打开{" "}
              <code className="rounded bg-alternate px-1.5 py-0.5 text-sm">
                chrome://extensions
              </code>
              ，右上角打开「开发者模式」。
            </Step>
            <Step n={3}>
              点「加载已解压的扩展程序」，选择刚解压出来的文件夹。
            </Step>
            <Step n={4}>
              工具栏出现 LX 矩阵图标，点开即是插件面板。
            </Step>
          </ol>
          <p className="mt-3 text-sm text-muted">
            支持 Chrome / Edge / Brave 等 Chromium 内核浏览器。
          </p>
        </section>

        {/* Step 3: configure */}
        <section>
          <h2 className="text-xl font-bold">③ 连接插件</h2>
          <p className="mt-2 leading-relaxed text-muted">
            装好插件后，点下面的「生成扩展令牌」，插件会
            <span className="font-semibold text-foreground">自动填好</span>
            服务地址和令牌——点开工具栏图标就能直接用，不用复制粘贴。
          </p>

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold">你的扩展令牌</p>
            <ExtTokenManager />
            <p className="mt-2 text-xs text-muted">
              令牌只能读成员动态、以你的身份打互动卡，不能生成邀请码。请勿分享给他人；怀疑泄露就「重新生成」。
              没装插件时，可手动复制令牌、在插件设置里粘贴。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
