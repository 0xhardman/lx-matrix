"use client";

import { useCallback, useEffect, useState } from "react";

interface Code {
  code: string;
  expires_at: string;
  used_at: string | null;
  used_by_twitter: string | null;
  created_at: string;
}

export function InviteManager() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = loading
  const [memberTwitter, setMemberTwitter] = useState("");
  const [codes, setCodes] = useState<Code[]>([]);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/invite");
      if (!res.ok) {
        setAuthed(false);
        return;
      }
      const data = await res.json();
      setAuthed(true);
      setMemberTwitter(data.member?.twitter ?? "");
      setCodes(data.codes ?? []);
    } catch {
      setAuthed(false);
      setError("网络错误");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/invite", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "生成失败");
        return;
      }
      await load();
    } catch {
      setError("网络错误");
    } finally {
      setGenerating(false);
    }
  }

  function copy(code: string) {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 1500);
  }

  function statusOf(c: Code): { label: string; cls: string } {
    if (c.used_at) return { label: "已使用", cls: "bg-gray-100 text-gray-500" };
    if (new Date(c.expires_at).getTime() < Date.now())
      return { label: "已过期", cls: "bg-red-100 text-red-600" };
    return { label: "可用", cls: "bg-green-100 text-green-700" };
  }

  if (authed === null) {
    return <p className="mt-10 text-center text-muted">加载中…</p>;
  }

  // Not a logged-in member — prompt to log in with Twitter.
  if (!authed) {
    return (
      <div className="mt-8 rounded-xl border border-divider bg-background p-8 text-center shadow-[0_4px_24px_var(--card-shadow)]">
        <p className="leading-relaxed text-muted">
          只有通过审核的成员才能生成邀请码。请用你的 Twitter 账号登录。
        </p>
        <a
          href="/api/auth/twitter"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-black px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-85"
        >
          <span className="text-lg">𝕏</span> 用 Twitter 登录
        </a>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-divider bg-alternate px-5 py-4">
        <p className="text-sm">
          成员：<span className="font-semibold">{memberTwitter}</span>
        </p>
        <button
          onClick={generate}
          disabled={generating}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {generating ? "生成中…" : "+ 生成新邀请码"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {codes.length === 0 ? (
          <p className="py-8 text-center text-muted">
            还没有邀请码，点上面的按钮生成一个。
          </p>
        ) : (
          codes.map((c) => {
            const st = statusOf(c);
            const usable = st.label === "可用";
            return (
              <div
                key={c.code}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-divider bg-background p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold tracking-wider">
                      {c.code}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}
                    >
                      {st.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {c.used_at
                      ? `已被 ${c.used_by_twitter ?? "他人"} 使用`
                      : `有效期至 ${new Date(c.expires_at).toLocaleString("zh-CN", { hour12: false })}`}
                  </p>
                </div>
                {usable && (
                  <button
                    onClick={() => copy(c.code)}
                    className="rounded-md border border-divider px-3 py-1.5 text-sm font-medium hover:bg-alternate"
                  >
                    {copied === c.code ? "已复制 ✓" : "复制"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
