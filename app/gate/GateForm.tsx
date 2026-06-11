"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function GateForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "校验失败");
        return;
      }
      // Unlocked — go where they wanted (or home). Guard against open redirect:
      // reject scheme-relative (//host) and backslash tricks.
      const safe =
        from.startsWith("/") &&
        !from.startsWith("//") &&
        !from.startsWith("/\\")
          ? from
          : "/";
      router.replace(safe);
      router.refresh();
    } catch {
      setError("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 w-full">
      <input
        type="text"
        value={code}
        autoFocus
        onChange={(e) => setCode(e.target.value)}
        placeholder="输入邀请码，如 LX-7F3K9Q"
        className="w-full rounded-[5px] border border-divider bg-background px-4 py-3 text-center text-base tracking-wider outline-none transition-colors focus:border-foreground"
      />
      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-md bg-primary px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {loading ? "校验中…" : "进入"}
      </button>
      <p className="mt-5 text-sm text-muted">
        没有邀请码？请向已加入的群友索取。
      </p>
    </form>
  );
}
