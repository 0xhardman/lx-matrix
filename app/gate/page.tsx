import type { Metadata } from "next";
import { Suspense } from "react";
import { GateForm } from "./GateForm";

export const metadata: Metadata = {
  title: "邀请码 | LX 矩阵",
  description: "LX 矩阵为邀请制社群，需邀请码进入。",
};

export const dynamic = "force-dynamic";

export default function GatePage() {
  return (
    <div className="mx-auto flex max-w-[480px] flex-col items-center px-5 py-20 text-center">
      <span className="text-4xl">🔒</span>
      <h1 className="mt-5 text-3xl font-bold tracking-tight">
        邀请制 · 凭码进入
      </h1>
      <p className="mt-4 leading-relaxed text-muted">
        LX 矩阵是小而精的邀请制社群。请输入邀请码进入；拿到邀请码后，可在站内提交入群申请。
      </p>
      <Suspense fallback={null}>
        <GateForm />
      </Suspense>
    </div>
  );
}
