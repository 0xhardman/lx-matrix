import { useEffect, useMemo, useState } from "react";
import { fetchMembers } from "./api";
import { loadSettings, saveSettings } from "./storage";
import type { Member, Settings } from "./types";

type Status = "loading" | "ready" | "error" | "needs-setup";

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Initial load: read saved settings, then fetch if configured.
  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      if (!s.apiBase || !s.token) {
        setStatus("needs-setup");
        setShowSettings(true);
      } else {
        void refresh(s);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh(s: Settings) {
    setStatus("loading");
    setError("");
    try {
      const data = await fetchMembers(s);
      setMembers(data.members);
      setGeneratedAt(data.generatedAt);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
      setStatus("error");
    }
  }

  const sorted = useMemo(() => sortMembers(members), [members]);
  const stats = useMemo(() => summarize(members), [members]);

  if (!settings) return <div className="app loading">加载中…</div>;

  return (
    <div className="app">
      <header className="bar">
        <div className="title">LX 矩阵 · 成员监控</div>
        <div className="actions">
          <button
            className="icon-btn"
            title="刷新"
            disabled={status === "loading"}
            onClick={() => refresh(settings)}
          >
            ↻
          </button>
          <button
            className="icon-btn"
            title="设置"
            onClick={() => setShowSettings((v) => !v)}
          >
            ⚙
          </button>
        </div>
      </header>

      {showSettings && (
        <SettingsPanel
          initial={settings}
          onSave={async (s) => {
            await saveSettings(s);
            setSettings(s);
            setShowSettings(false);
            void refresh(s);
          }}
          onClose={
            settings.apiBase && settings.token
              ? () => setShowSettings(false)
              : undefined
          }
        />
      )}

      {!showSettings && (
        <>
          {status === "ready" && (
            <div className="summary">
              <span className="ok">✅ {stats.posted} 已发</span>
              <span className="muted">·</span>
              <span className="warn">⚪ {stats.notPosted} 未发</span>
              <span className="muted">·</span>
              <span className="muted">共 {members.length} 人</span>
            </div>
          )}

          {status === "loading" && <div className="hint">加载中…</div>}
          {status === "error" && (
            <div className="hint error-text">
              {error}
              <button className="link-btn" onClick={() => refresh(settings)}>
                重试
              </button>
            </div>
          )}

          {status === "ready" && (
            <ul className="list">
              {sorted.map((m) => (
                <MemberRow key={m.twitter} m={m} />
              ))}
            </ul>
          )}

          {status === "ready" && generatedAt && (
            <footer className="foot">数据更新于 {formatTime(generatedAt)}</footer>
          )}
        </>
      )}
    </div>
  );
}

function MemberRow({ m }: { m: Member }) {
  const handle = m.twitter.replace(/^@/, "");
  return (
    <li className="row">
      <a
        className="avatar-link"
        href={`https://x.com/${handle}`}
        target="_blank"
        rel="noreferrer"
      >
        {m.avatar ? (
          <img className="avatar" src={m.avatar} alt="" />
        ) : (
          <div className="avatar placeholder">{handle[0]?.toUpperCase()}</div>
        )}
      </a>
      <div className="meta">
        <div className="name-line">
          <a
            className="name"
            href={`https://x.com/${handle}`}
            target="_blank"
            rel="noreferrer"
          >
            {m.name || m.twitter}
          </a>
          {m.frequency && <span className="freq">{m.frequency}</span>}
        </div>
        <div className="sub">
          @{handle}
          {m.cumulative != null && <span className="dim"> · 共 {m.cumulative} 帖</span>}
        </div>
      </div>
      <TodayBadge m={m} />
    </li>
  );
}

function TodayBadge({ m }: { m: Member }) {
  if (m.todayCount == null) return <span className="badge none">无数据</span>;
  if (m.todayCount > 0)
    return <span className="badge posted">今日 +{m.todayCount}</span>;
  return <span className="badge idle">未发</span>;
}

function SettingsPanel({
  initial,
  onSave,
  onClose,
}: {
  initial: Settings;
  onSave: (s: Settings) => void;
  onClose?: () => void;
}) {
  const [apiBase, setApiBase] = useState(initial.apiBase);
  const [token, setToken] = useState(initial.token);

  return (
    <div className="settings">
      <label className="field">
        <span>服务地址</span>
        <input
          type="text"
          placeholder="https://你的域名.vercel.app"
          value={apiBase}
          onChange={(e) => setApiBase(e.target.value)}
        />
      </label>
      <label className="field">
        <span>成员令牌</span>
        <input
          type="password"
          placeholder="m_..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </label>
      <p className="note">
        令牌即审核通过后获得的 member token，可在 /invite 页面找到。仅已通过审核的成员可查看。
      </p>
      <div className="settings-actions">
        <button
          className="primary"
          disabled={!apiBase.trim() || !token.trim()}
          onClick={() =>
            onSave({ apiBase: apiBase.trim(), token: token.trim() })
          }
        >
          保存
        </button>
        {onClose && (
          <button className="ghost" onClick={onClose}>
            取消
          </button>
        )}
      </div>
    </div>
  );
}

// "未发" first so the people who need a nudge are at the top; within a group,
// order by handle.
function sortMembers(members: Member[]): Member[] {
  const rank = (m: Member) => (m.postedToday ? 1 : 0);
  return [...members].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.twitter.toLowerCase().localeCompare(b.twitter.toLowerCase())
  );
}

function summarize(members: Member[]) {
  let posted = 0;
  let notPosted = 0;
  for (const m of members) {
    if (m.postedToday) posted++;
    else notPosted++;
  }
  return { posted, notPosted };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
