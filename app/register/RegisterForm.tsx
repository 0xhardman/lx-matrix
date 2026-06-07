"use client";

import { useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; twitter: string }
  | { kind: "error"; message: string };

export function RegisterForm() {
  const [twitter, setTwitter] = useState("");
  const [wechat, setWechat] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twitter, wechat }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: data.error ?? "提交失败" });
        return;
      }
      setStatus({ kind: "success", twitter: data.twitter });
    } catch {
      setStatus({ kind: "error", message: "网络错误，请稍后再试" });
    }
  }

  if (status.kind === "success") {
    return (
      <div className="rounded-xl border border-divider bg-background p-8 text-center shadow-[0_4px_24px_var(--card-shadow)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary/20 text-3xl">
          💗
        </div>
        <h2 className="mt-5 text-2xl font-bold">登记成功！</h2>
        <p className="mt-3 leading-relaxed text-muted">
          已记录{" "}
          <span className="font-semibold text-foreground">
            {status.twitter}
          </span>
          。欢迎加入 LX 矩阵蓝V互推 💗
        </p>
        <button
          type="button"
          onClick={() => {
            setTwitter("");
            setWechat("");
            setStatus({ kind: "idle" });
          }}
          className="mt-6 rounded-md border border-divider bg-background px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-alternate-dark"
        >
          再登记一个
        </button>
      </div>
    );
  }

  const submitting = status.kind === "submitting";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-divider bg-background p-6 shadow-[0_4px_24px_var(--card-shadow)] sm:p-8"
    >
      <div className="space-y-6">
        <div>
          <label
            htmlFor="twitter"
            className="block text-sm font-semibold text-foreground"
          >
            Twitter 账号 <span className="text-red-500">*</span>
          </label>
          <input
            id="twitter"
            name="twitter"
            type="text"
            required
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            placeholder="@yourhandle 或 https://x.com/yourhandle"
            className="mt-2 w-full rounded-[5px] border border-divider bg-background px-4 py-3 text-base outline-none transition-colors focus:border-foreground"
          />
          <p className="mt-1.5 text-xs text-muted">
            填 @用户名 或者直接粘贴你的主页链接都可以。
          </p>
        </div>

        <div>
          <label
            htmlFor="wechat"
            className="block text-sm font-semibold text-foreground"
          >
            微信名称 <span className="text-red-500">*</span>
          </label>
          <input
            id="wechat"
            name="wechat"
            type="text"
            required
            maxLength={64}
            value={wechat}
            onChange={(e) => setWechat(e.target.value)}
            placeholder="你的微信昵称"
            className="mt-2 w-full rounded-[5px] border border-divider bg-background px-4 py-3 text-base outline-none transition-colors focus:border-foreground"
          />
          <p className="mt-1.5 text-xs text-muted">
            方便群里对上号，建议填群内显示的名字。
          </p>
        </div>

        {status.kind === "error" && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-primary px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "提交中…" : "提交登记"}
        </button>
      </div>
    </form>
  );
}
