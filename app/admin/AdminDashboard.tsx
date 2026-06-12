"use client";

import { useCallback, useEffect, useState } from "react";
import type { Application, ApplicationStatus } from "@/app/lib/db";
import type { TwitterProfile } from "@/app/lib/xapi";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
  deactivated: "已停用",
};

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  pending: "bg-secondary/20 text-secondary-dark",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  deactivated: "bg-amber-100 text-amber-700",
};

const FILTERS: { key: "all" | ApplicationStatus; label: string }[] = [
  { key: "pending", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "已拒绝" },
  { key: "deactivated", label: "已停用" },
  { key: "all", label: "全部" },
];

export function AdminDashboard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | ApplicationStatus>("pending");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/applications");
      if (!res.ok) {
        setError("读取失败，可能登录已过期");
        return;
      }
      const data = await res.json();
      setApps(data.applications ?? []);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: number, status: ApplicationStatus) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setApps((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  const counts = {
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  const visible =
    filter === "all" ? apps : apps.filter((a) => a.status === filter);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">入群申请</h1>
          <p className="mt-1 text-sm text-muted">
            待审核 {counts.pending} · 已通过 {counts.approved} · 已拒绝{" "}
            {counts.rejected}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="rounded-md border border-divider px-3 py-2 text-sm font-medium hover:bg-alternate"
          >
            刷新
          </button>
          <button
            onClick={logout}
            className="rounded-md border border-divider px-3 py-2 text-sm font-medium hover:bg-alternate"
          >
            退出
          </button>
        </div>
      </div>

      <AdminInvitePanel />

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.key
                ? "border-primary bg-primary text-white"
                : "border-divider bg-background text-muted hover:bg-alternate"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-10 text-center text-muted">加载中…</p>
      ) : visible.length === 0 ? (
        <p className="mt-10 text-center text-muted">没有符合条件的申请。</p>
      ) : (
        <div className="mt-6 space-y-4">
          {visible.map((a) => (
            <ApplicationCard
              key={a.id}
              app={a}
              busy={busyId === a.id}
              onUpdate={updateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface InviteRow {
  code: string;
  created_by_twitter: string | null;
  expires_at: string;
  used_at: string | null;
  used_by_twitter: string | null;
}

function AdminInvitePanel() {
  const [open, setOpen] = useState(false);
  const [codes, setCodes] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invites");
      if (res.ok) setCodes((await res.json()).codes ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/invites", { method: "POST" });
      if (res.ok) await load();
    } finally {
      setGenerating(false);
    }
  }

  function codeStatus(c: InviteRow): { label: string; cls: string } {
    if (c.used_at) return { label: "已使用", cls: "bg-gray-100 text-gray-500" };
    if (new Date(c.expires_at).getTime() < Date.now())
      return { label: "已过期", cls: "bg-red-100 text-red-600" };
    return { label: "可用", cls: "bg-green-100 text-green-700" };
  }

  return (
    <div className="mt-6 rounded-xl border border-divider bg-background p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">邀请码管理</h2>
        <div className="flex gap-2">
          <button
            onClick={generate}
            disabled={generating}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {generating ? "生成中…" : "+ 生成邀请码"}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-md border border-divider px-3 py-2 text-sm font-medium hover:bg-alternate"
          >
            {open ? "收起" : "查看全部"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="py-4 text-center text-sm text-muted">加载中…</p>
          ) : codes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">还没有邀请码。</p>
          ) : (
            codes.map((c) => {
              const st = codeStatus(c);
              return (
                <div
                  key={c.code}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-divider px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <code className="font-mono font-bold tracking-wider">
                      {c.code}
                    </code>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}
                    >
                      {st.label}
                    </span>
                    <CopyButton text={c.code} />
                  </div>
                  <span className="text-xs text-muted">
                    {c.used_at
                      ? `被 ${c.used_by_twitter ?? "他人"} 使用`
                      : `至 ${new Date(c.expires_at).toLocaleString("zh-CN", { hour12: false })}`}
                    {" · 来自 "}
                    {c.created_by_twitter ?? "—"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({
  app,
  busy,
  onUpdate,
}: {
  app: Application;
  busy: boolean;
  onUpdate: (id: number, status: ApplicationStatus) => void;
}) {
  const handle = app.twitter.replace(/^@/, "");
  const [profile, setProfile] = useState<TwitterProfile | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  async function fetchProfile() {
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch("/api/admin/twitter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error ?? "抓取失败");
        return;
      }
      setProfile(data.profile);
    } catch {
      setFetchError("网络错误");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="rounded-xl border border-divider bg-background p-5 shadow-[0_2px_12px_var(--card-shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <a
            href={`https://x.com/${handle}`}
            target="_blank"
            rel="noreferrer"
            className="text-lg font-bold underline-offset-4 hover:underline"
          >
            {app.twitter}
          </a>
          <span
            className={`ml-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              STATUS_STYLE[app.status]
            }`}
          >
            {STATUS_LABEL[app.status]}
          </span>
          <a
            href={`https://x.com/${handle}`}
            target="_blank"
            rel="noreferrer"
            className="ml-2 inline-block rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-600 hover:bg-sky-100"
            title="去 Twitter 主页确认蓝V"
          >
            去主页核验蓝V ↗
          </a>
        </div>
        <div className="flex gap-2">
          <button
            disabled={fetching}
            onClick={fetchProfile}
            className="rounded-md border border-divider px-3 py-1.5 text-sm font-medium hover:bg-alternate disabled:opacity-40"
          >
            {fetching ? "抓取中…" : profile ? "重新抓取" : "抓资料"}
          </button>
          <button
            disabled={busy || app.status === "approved"}
            onClick={() => onUpdate(app.id, "approved")}
            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            通过
          </button>
          <button
            disabled={busy || app.status === "rejected"}
            onClick={() => onUpdate(app.id, "rejected")}
            className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            拒绝
          </button>
          {app.status === "approved" && (
            <button
              disabled={busy}
              onClick={() => onUpdate(app.id, "deactivated")}
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-40"
            >
              停用
            </button>
          )}
          {app.status === "deactivated" && (
            <button
              disabled={busy}
              onClick={() => onUpdate(app.id, "approved")}
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              恢复
            </button>
          )}
          {app.status !== "pending" && (
            <button
              disabled={busy}
              onClick={() => onUpdate(app.id, "pending")}
              className="rounded-md border border-divider px-3 py-1.5 text-sm font-medium hover:bg-alternate disabled:opacity-40"
            >
              重置
            </button>
          )}
        </div>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Field label="微信">{app.wechat}</Field>
        <Field label="蓝V">{boolText(app.has_blue_v)}</Field>
        <Field label="LXDAO 成员">{boolText(app.is_lxdao_member)}</Field>
        <Field label="LXDAO 佐证">{app.lxdao_proof || "—"}</Field>
        <Field label="内容方向">
          {app.directions?.length ? app.directions.join(" / ") : "—"}
        </Field>
        <Field label="更新频率">{app.frequency || "—"}</Field>
        <Field label="推荐人">{app.referrer || "—"}</Field>
        <Field label="所用邀请码">{app.invite_code_used || "—"}</Field>
        <Field label="提交时间">{formatDate(app.created_at)}</Field>
      </dl>

      {app.intro && (
        <div className="mt-3 rounded-md bg-alternate px-4 py-3 text-sm leading-relaxed text-foreground">
          {app.intro}
        </div>
      )}

      {fetchError && (
        <p className="mt-3 rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">
          {fetchError}
        </p>
      )}

      {profile && (
        <div className="mt-3 rounded-md border border-sky-100 bg-sky-50/50 px-4 py-3">
          <div className="flex items-center gap-3">
            {profile.avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar}
                alt={profile.name}
                className="h-9 w-9 rounded-full"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile.name}</p>
              <p className="text-xs text-muted">
                注册于 {formatJoinDate(profile.created_at)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Stat label="粉丝" value={fmtNum(profile.followers)} />
            <Stat label="关注" value={fmtNum(profile.following)} />
            <Stat label="推文" value={fmtNum(profile.tweets)} />
            <Stat label="点赞" value={fmtNum(profile.likes)} />
          </div>
          {profile.description && (
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {profile.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted">{label}：</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function boolText(v: boolean | null): string {
  if (v === null) return "—";
  return v ? "是" : "否";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
}

function formatJoinDate(raw: string): string {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString("zh-CN");
  } catch {
    return raw;
  }
}

function fmtNum(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="shrink-0 rounded-md border border-divider px-2.5 py-1 text-xs font-medium hover:bg-alternate"
    >
      {done ? "已复制 ✓" : "复制"}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="text-muted">{label} </span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}
