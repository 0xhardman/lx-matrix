// MV3 service worker. Two jobs:
//  1. Poll the feed on an alarm and show the number of not-yet-engaged member
//     tweets (last 24h) as the toolbar badge.
//  2. Act as the message hub for the x.com content script: hand out the
//     member handle list and forward engagement reports (the content script
//     never touches the token directly).
//
// Self-contained on purpose: only `import type` allowed, so the build emits a
// single classic script with no cross-chunk imports.
import type { FeedResponse, MembersResponse, Settings } from "./types";

const SETTINGS_KEY = "lx_settings";
const HANDLES_KEY = "lx_member_handles";
const POLL_ALARM = "lx-poll";
const POLL_MINUTES = 30;
const HANDLES_TTL_MS = 30 * 60_000;

async function getSettings(): Promise<Settings | null> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  const s = stored[SETTINGS_KEY] as Settings | undefined;
  return s?.apiBase && s?.token ? s : null;
}

async function api<T>(s: Settings, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${s.apiBase.replace(/\/+$/, "")}${path}`, {
    ...init,
    headers: {
      "x-member-token": s.token,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function refreshBadge(): Promise<void> {
  try {
    const s = await getSettings();
    if (!s) {
      await chrome.action.setBadgeText({ text: "" });
      return;
    }
    const feed = await api<FeedResponse>(s, "/api/feed");
    const n = feed.summary?.pending ?? 0;
    await chrome.action.setBadgeBackgroundColor({ color: "#f9b934" });
    await chrome.action.setBadgeTextColor({ color: "#000000" });
    await chrome.action.setBadgeText({
      text: n > 0 ? (n > 99 ? "99+" : String(n)) : "",
    });
  } catch {
    // Transient network/auth failure — keep the previous badge.
  }
}

/** Member handles (lowercase, no @) for the content script, cached 30 min. */
async function getMemberHandles(): Promise<string[]> {
  const stored = await chrome.storage.local.get(HANDLES_KEY);
  const cached = stored[HANDLES_KEY] as
    | { handles: string[]; at: number }
    | undefined;
  if (cached && Date.now() - cached.at < HANDLES_TTL_MS) return cached.handles;

  const s = await getSettings();
  if (!s) return cached?.handles ?? [];
  try {
    const data = await api<MembersResponse>(s, "/api/members");
    const handles = data.members.map((m) =>
      m.twitter.replace(/^@/, "").toLowerCase()
    );
    await chrome.storage.local.set({
      [HANDLES_KEY]: { handles, at: Date.now() },
    });
    return handles;
  } catch {
    return cached?.handles ?? [];
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(POLL_ALARM, {
    periodInMinutes: POLL_MINUTES,
    delayInMinutes: 1,
  });
  void refreshBadge();
});

chrome.runtime.onStartup.addListener(() => void refreshBadge());

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === POLL_ALARM) void refreshBadge();
});

// New token / server saved in the popup → re-poll immediately.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[SETTINGS_KEY]) void refreshBadge();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "lx:getMemberHandles") {
    getMemberHandles()
      .then((handles) => sendResponse({ handles }))
      .catch(() => sendResponse({ handles: [] }));
    return true; // async sendResponse
  }
  if (msg?.type === "lx:reportEngagement" && typeof msg.tweetId === "string") {
    (async () => {
      const s = await getSettings();
      if (!s) return sendResponse({ ok: false });
      try {
        await api(s, "/api/engagements", {
          method: "POST",
          body: JSON.stringify({
            tweetId: msg.tweetId,
            engaged: true,
            source: "x.com",
          }),
        });
        void refreshBadge();
        sendResponse({ ok: true });
      } catch {
        sendResponse({ ok: false });
      }
    })();
    return true;
  }
  if (msg?.type === "lx:refreshBadge") {
    void refreshBadge();
    sendResponse({ ok: true });
  }
  return false;
});
