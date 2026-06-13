import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchFeed, fetchMembers, setEngaged } from "./api";
import { loadSettings, saveSettings } from "./storage";
import type { FeedItem, FeedSummary, Member, Settings } from "./types";

type Tab = "feed" | "members";
type Status = "loading" | "ready" | "error" | "needs-setup";

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tab, setTab] = useState<Tab>("feed");
  const [showSettings, setShowSettings] = useState(false);

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedAt, setFeedAt] = useState<string | null>(null);
  const [summary, setSummary] = useState<FeedSummary | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  const loadFeed = useCallback(async (s: Settings, force = false) => {
    setStatus("loading");
    setError("");
    try {
      const data = await fetchFeed(s, force);
      setFeed(data.items);
      setFeedAt(data.refreshedAt);
      setSummary(data.summary ?? null);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
      setStatus("error");
    }
  }, []);

  const loadMembers = useCallback(async (s: Settings) => {
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
  }, []);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      if (!s.apiBase || !s.token) {
        setStatus("needs-setup");
        setShowSettings(true);
      } else {
        void loadFeed(s);
      }
    });
  }, [loadFeed]);

  function switchTab(t: Tab) {
    if (t === tab || !settings) return;
    setTab(t);
    if (t === "feed") void loadFeed(settings);
    else void loadMembers(settings);
  }

  function refresh() {
    if (!settings) return;
    if (tab === "feed") void loadFeed(settings, true);
    else void loadMembers(settings);
  }

  const sortedMembers = useMemo(() => sortMembers(members), [members]);
  const sortedFeed = useMemo(() => sortFeed(feed), [feed]);

  // Optimistic toggle; revert on failure. The badge is recomputed by the
  // service worker so it stays consistent with what the server accepted.
  const toggleEngaged = useCallback(
    async (item: FeedItem) => {
      if (!settings || item.own) return;
      const next = !item.engaged;
      const apply = (items: FeedItem[], engaged: boolean) =>
        items.map((t) =>
          t.tweet_id === item.tweet_id ? { ...t, engaged } : t
        );
      setFeed((f) => apply(f, next));
      setSummary((s) =>
        s
          ? {
              pending: Math.max(
                0,
                s.pending + (isPending24h(item) ? (next ? -1 : 1) : 0)
              ),
              engagedToday: Math.max(0, s.engagedToday + (next ? 1 : -1)),
            }
          : s
      );
      try {
        await setEngaged(settings, item.tweet_id, next);
        chrome.runtime
          .sendMessage({ type: "lx:refreshBadge" })
          .catch(() => undefined);
      } catch {
        setFeed((f) => apply(f, !next));
        if (settings) void loadFeed(settings);
      }
    },
    [settings, loadFeed]
  );

  if (!settings) return <div className="app loading">加载中…</div>;

  return (
    <div className="app">
      <header className="bar">
        <div className="title">LX 矩阵</div>
        <div className="actions">
          <button
            className="icon-btn"
            title="刷新"
            disabled={status === "loading"}
            onClick={refresh}
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

      {showSettings ? (
        <SettingsPanel
          initial={settings}
          onSave={async (s) => {
            await saveSettings(s);
            setSettings(s);
            setShowSettings(false);
            void loadFeed(s);
          }}
          onClose={
            settings.apiBase && settings.token
              ? () => setShowSettings(false)
              : undefined
          }
        />
      ) : (
        <>
          <nav className="tabs">
            <button
              className={tab === "feed" ? "tab active" : "tab"}
              onClick={() => switchTab("feed")}
            >
              动态
            </button>
            <button
              className={tab === "members" ? "tab active" : "tab"}
              onClick={() => switchTab("members")}
            >
              成员
            </button>
          </nav>

          {status === "loading" && <div className="hint">加载中…</div>}
          {status === "error" && (
            <div className="hint error-text">
              {error}
              <button className="link-btn" onClick={refresh}>
                重试
              </button>
            </div>
          )}

          {status === "ready" && tab === "feed" && (
            <>
              {summary && (
                <div className="summary">
                  {summary.pending > 0 ? (
                    <span className="warn">待互动 {summary.pending}</span>
                  ) : (
                    <span className="ok">今日矩阵任务已清空 ✓</span>
                  )}
                  <span className="muted">·</span>
                  <span className="muted">今日已互动 {summary.engagedToday}</span>
                </div>
              )}
              {sortedFeed.length === 0 ? (
                <div className="hint">暂时没有动态，过会儿再看看。</div>
              ) : (
                <ul className="list">
                  {sortedFeed.map((t) => (
                    <FeedCard key={t.tweet_id} t={t} onToggle={toggleEngaged} />
                  ))}
                </ul>
              )}
              {feedAt && (
                <footer className="foot">动态更新于 {formatTime(feedAt)}</footer>
              )}
            </>
          )}

          {status === "ready" && tab === "members" && (
            <>
              <ul className="list">
                {sortedMembers.map((m) => (
                  <MemberRow key={m.twitter} m={m} />
                ))}
              </ul>
              {generatedAt && (
                <footer className="foot">数据更新于 {formatTime(generatedAt)}</footer>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function FeedCard({
  t,
  onToggle,
}: {
  t: FeedItem;
  onToggle: (item: FeedItem) => void;
}) {
  const handle = t.twitter.replace(/^@/, "");
  return (
    <li className={t.engaged || t.own ? "tweet done" : "tweet"}>
      <a
        className="avatar-link"
        href={`https://x.com/${handle}`}
        target="_blank"
        rel="noreferrer"
      >
        {t.author_avatar ? (
          <img className="avatar" src={t.author_avatar} alt="" />
        ) : (
          <div className="avatar placeholder">{handle[0]?.toUpperCase()}</div>
        )}
      </a>
      <div className="tweet-body">
        <div className="name-line">
          <span className="name">{t.author_name || t.twitter}</span>
          <span className="sub dim">@{handle}</span>
          {t.tweet_at && <span className="dim"> · {timeAgo(t.tweet_at)}</span>}
          {t.is_quote && <span className="freq">引用</span>}
          {t.own && <span className="freq own-tag">我的</span>}
        </div>
        {t.text && <div className="tweet-text">{t.text}</div>}
        <div className="tweet-foot">
          <span className="counts">
            ♥ {fmt(t.like_count)} · 💬 {fmt(t.reply_count)} · 🔁{" "}
            {fmt(t.retweet_count)}
          </span>
          <span className="tweet-actions">
            {!t.own &&
              (t.engaged ? (
                <button
                  className="mark-btn done"
                  title="点击撤销打卡"
                  onClick={() => onToggle(t)}
                >
                  已互动 ✓
                </button>
              ) : (
                <button
                  className="mark-btn"
                  title="互动完成后打卡"
                  onClick={() => onToggle(t)}
                >
                  打卡
                </button>
              ))}
            <a className="go-btn" href={t.url} target="_blank" rel="noreferrer">
              去互动 ↗
            </a>
          </span>
        </div>
      </div>
    </li>
  );
}

/** Is this tweet part of the badge's pending count (last 24h, not mine)? */
function isPending24h(t: FeedItem): boolean {
  if (t.own || !t.tweet_at) return false;
  return Date.now() - new Date(t.tweet_at).getTime() < 24 * 3600_000;
}

// Pending engagements first (newest first), then done/own (newest first).
function sortFeed(items: FeedItem[]): FeedItem[] {
  const time = (t: FeedItem) =>
    t.tweet_at ? new Date(t.tweet_at).getTime() : 0;
  const rank = (t: FeedItem) => (t.engaged || t.own ? 1 : 0);
  return [...items].sort((a, b) => rank(a) - rank(b) || time(b) - time(a));
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
          <span className="name">{m.name || m.twitter}</span>
          {m.frequency && <span className="freq">{m.frequency}</span>}
        </div>
        <div className="sub">@{handle}</div>
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
        <span>扩展令牌</span>
        <input
          type="password"
          placeholder="ext_..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </label>
      <p className="note">
        正常情况下，登录网站的 /extension 页面并生成令牌后，这里会自动填好，无需手动复制。
        若没自动填上，可把页面上 ext_ 开头的令牌粘到这里。仅已通过审核的成员可用。
      </p>
      <div className="settings-actions">
        <button
          className="primary"
          disabled={!apiBase.trim() || !token.trim()}
          onClick={() => onSave({ apiBase: apiBase.trim(), token: token.trim() })}
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

// "未发" first so the people who need a nudge are at the top.
function sortMembers(members: Member[]): Member[] {
  const rank = (m: Member) => (m.postedToday ? 1 : 0);
  return [...members].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.twitter.toLowerCase().localeCompare(b.twitter.toLowerCase())
  );
}

function fmt(n: number | null): string {
  if (n == null) return "0";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const mins = Math.floor((Date.now() - d) / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小时前`;
  const days = Math.floor(hrs / 24);
  return `${days} 天前`;
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
