import type { Metadata } from "next";
import { InviteManager } from "./InviteManager";

export const metadata: Metadata = {
  title: "我的邀请码 | LX 矩阵",
  description: "已通过审核的成员可在此生成并管理邀请码。",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function InvitePage() {
  return (
    <div className="mx-auto max-w-[640px] px-5 py-14">
      <h1 className="text-3xl font-bold tracking-tight">我的邀请码</h1>
      <p className="mt-3 leading-relaxed text-muted">
        通过审核的成员可以生成邀请码，分享给想加入的朋友。每个邀请码{" "}
        <span className="font-semibold text-foreground">只能用一次</span>
        ，且有时效。
      </p>
      <InviteManager />
    </div>
  );
}
