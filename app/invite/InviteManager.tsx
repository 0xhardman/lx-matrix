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
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [memberTwitter, setMemberTwitter] = useState("");
  const [codes, setCodes] = useState<Code[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState("");

  // Try the cookie first (returning member); or bootstrap from a pasted token
  // via PUT (token goes in the body, never the URL).
  const tryLoad = useCallback(async (withToken?: string) => {
    setLoading(true);
    setError("");
    try {
      const res = withToken
        ? await fetch("/api/invite", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: withToken }),
          })
        : await fetch("/api/invite");
      if (!res.ok) {
        if (!withToken) {
          // No valid cookie — show the token entry, no error.
          setAuthed(false);
          return false;
        }
        const data = await res.json();
        setError(data.error ?? "凭证无效");
        return false;
      }
      const data = await res.json();
      setAuthed(true);
      setMemberTwitter(data.member?.twitter ?? "");
      setCodes(data.codes ?? []);
      return true;
    } catch {
      setError("网络错误");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    tryLoad();
  }, [tryLoad]);

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "生成失败");
        return;
      }
      await tryLoad(token || undefined);
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
    if (c.used_at)
      return { label: "已使用", cls: "bg-gray-100 text-gray-500" };
    if (new Date(c.expires_at).getTime() < Date.now())
      return { label: "已过期", cls: "bg-red-100 text-red-600" };
    return { label: "可用", cls: "bg-green-100 text-green-700" };
  }

  if (!authed) {
    return (
      <div className="mt-8 rounded-xl border border-divider bg-background p-6 shadow-[0_4px_24px_var(--card-shadow)]">
        <label htmlFor="token" className="block text-sm font-semibold">
          成员凭证
        </label>
        <p className="mt-1 text-xs text-muted">
          审核通过后你会收到一个成员凭证（以 m_ 开头），粘贴到这里。
        </p>
        <input
          id="token"
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value.trim())}
          placeholder="m_xxxxxxxx…"
          className="mt-2 w-full rounded-[5px] border border-divider bg-background px-4 py-3 text-base outline-none transition-colors focus:border-foreground"
        />
        {error && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          onClick={() => tryLoad(token)}
          disabled={loading || !token}
          className="mt-5 w-full rounded-md bg-primary px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {loading ? "验证中…" : "进入"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-divider bg-alternate px-5 py-4">
        <p className="text-sm">
          成员：
          <span className="font-semibold">{memberTwitter}</span>
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
