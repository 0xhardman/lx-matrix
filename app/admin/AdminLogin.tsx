"use client";

import { useState } from "react";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Reload so the server re-renders the dashboard with the new cookie.
        window.location.reload();
        return;
      }
      const data = await res.json();
      setError(data.error ?? "登录失败");
    } catch {
      setError("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="text-center text-2xl font-bold">管理后台</h1>
      <p className="mt-2 text-center text-sm text-muted">
        请输入管理密码以查看入群申请。
      </p>
      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-xl border border-divider bg-background p-6 shadow-[0_4px_24px_var(--card-shadow)]"
      >
        <label htmlFor="pw" className="block text-sm font-semibold">
          管理密码
        </label>
        <input
          id="pw"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-[5px] border border-divider bg-background px-4 py-3 text-base outline-none transition-colors focus:border-foreground"
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
          {loading ? "登录中…" : "登录"}
        </button>
      </form>
    </div>
  );
}
