import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "申请加入 | LX 矩阵 · 蓝V互推",
  description: "填写申请信息，申请加入 LX 矩阵蓝V互推群。",
};

export default function RegisterPage() {
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
        <RegisterForm />
      </div>
    </div>
  );
}
