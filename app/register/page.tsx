import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "账号登记 | LX 矩阵 · 蓝V互推",
  description: "登记你的 Twitter 账号和微信名称，方便群内互推对接。",
};

export default function RegisterPage() {
  return (
    <div>
      <section className="border-b border-divider bg-alternate">
        <div className="mx-auto max-w-[640px] px-5 py-16 text-center sm:py-20">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            账号登记
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-muted">
            填一下你的 Twitter 账号和对应的微信名称，方便群内互推时对接。
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[640px] px-5 py-14">
        <RegisterForm />
      </div>
    </div>
  );
}
