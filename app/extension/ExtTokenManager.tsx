"use client";

import { useCallback, useEffect, useState } from "react";

export function ExtTokenManager() {
  const [token, setToken] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // Whether the installed extension acknowledged receiving the token.
  const [connected, setConnected] = useState(false);

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

  // Listen for the extension's content script acknowledging the handoff.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (
        e.source === window &&
        e.origin === window.location.origin &&
        e.data?.source === "lx-matrix-ext" &&
        e.data?.type === "connected"
      ) {
        setConnected(true);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Hand the token to the extension (if installed) — its content script saves
  // it so the popup needs no manual entry. Posted whenever the token changes.
  useEffect(() => {
    if (!token) return;
    window.postMessage(
      {
        source: "lx-matrix",
        type: "ext-token",
        token,
        apiBase: window.location.origin,
      },
      window.location.origin
    );
  }, [token]);

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
      {connected && (
        <div className="mb-4 rounded-md border border-green-600/30 bg-green-600/10 px-4 py-3 text-sm font-medium text-green-700">
          ✓ 已自动填入浏览器插件，点开插件图标即可直接使用，无需复制。
        </div>
      )}
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
