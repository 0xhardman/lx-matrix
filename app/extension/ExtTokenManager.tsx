"use client";

import { useCallback, useEffect, useState } from "react";

export function ExtTokenManager() {
  const [token, setToken] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ext-token");
      if (!res.ok) {
        setAuthed(false);
        return;
      }
      const data = await res.json();
      setAuthed(true);
      setToken(data.token ?? null);
    } catch {
      setAuthed(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/ext-token", { method: "POST" });
      const data = await res.json();
      if (res.ok) setToken(data.token);
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!token) return;
    navigator.clipboard?.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (authed === null) {
    return <p className="text-sm text-muted">加载中…</p>;
  }

  if (!authed) {
    return (
      <div className="rounded-lg border border-divider bg-alternate p-5 text-center">
        <p className="text-sm text-muted">
          只有通过审核的成员才能生成扩展令牌。请先用 Twitter 登录。
        </p>
        <a
          href="/api/auth/twitter"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
        >
          <span>𝕏</span> 用 Twitter 登录
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-divider bg-background p-5">
      {token ? (
        <>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-alternate px-3 py-2 text-sm">
              {token}
            </code>
            <button
              onClick={copy}
              className="shrink-0 rounded-md border border-divider px-3 py-2 text-sm font-medium hover:bg-alternate"
            >
              {copied ? "已复制 ✓" : "复制"}
            </button>
          </div>
          <button
            onClick={generate}
            disabled={busy}
            className="mt-3 text-sm text-muted underline-offset-4 hover:underline disabled:opacity-50"
          >
            {busy ? "重新生成中…" : "重新生成（旧令牌会失效）"}
          </button>
        </>
      ) : (
        <button
          onClick={generate}
          disabled={busy}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {busy ? "生成中…" : "生成扩展令牌"}
        </button>
      )}
    </div>
  );
}
