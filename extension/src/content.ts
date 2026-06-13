// Content script for x.com / twitter.com. Two jobs:
//  1. Badge fellow matrix members' tweets in the timeline ("LX 矩阵" tag next
//     to the author name) so members recognize each other while browsing.
//  2. Auto check-in: clicking like / retweet / reply inside a member's tweet
//     reports the engagement to the backend via the service worker — no need
//     to go back to the popup.
//
// Self-contained on purpose (no runtime imports) so the build emits a single
// classic script — MV3 content scripts can't be ES modules.

let memberHandles: Set<string> | null = null;
const reported = new Set<string>();
let scanTimer: number | undefined;

const BADGE_CLASS = "lx-matrix-badge";
const ENGAGE_SELECTOR =
  '[data-testid="like"], [data-testid="retweet"], [data-testid="reply"]';

function injectStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
    .${BADGE_CLASS} {
      display: inline-flex;
      align-items: center;
      flex: 0 0 auto;
      margin-left: 4px;
      padding: 0 5px;
      border-radius: 4px;
      background: #f9b934;
      color: #000;
      font-size: 10px;
      font-weight: 700;
      line-height: 16px;
      vertical-align: middle;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);
}

/**
 * The tweet's author handle + id, from the permalink wrapping the timestamp
 * (quoted tweets inside the article have no such anchor, so this targets the
 * outer tweet). Falls back to the URL on tweet detail pages.
 */
function tweetInfo(
  article: Element
): { handle: string; tweetId: string } | null {
  const timeLink = article
    .querySelector('a[href*="/status/"] time')
    ?.closest("a");
  const href = timeLink?.getAttribute("href") ?? location.pathname;
  const m = href.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d+)/);
  return m ? { handle: m[1].toLowerCase(), tweetId: m[2] } : null;
}

function scan(): void {
  if (!memberHandles) return;
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  for (const article of articles) {
    const info = tweetInfo(article);
    if (!info || !memberHandles.has(info.handle)) continue;
    const nameRow = article.querySelector('div[data-testid="User-Name"]');
    if (!nameRow || nameRow.querySelector(`.${BADGE_CLASS}`)) continue;
    const badge = document.createElement("span");
    badge.className = BADGE_CLASS;
    badge.textContent = "LX 矩阵";
    badge.title = "LX 流量矩阵成员 — 互动一下，矩阵会回报你";
    nameRow.firstElementChild?.appendChild(badge);
  }
}

function scheduleScan(): void {
  if (scanTimer !== undefined) return;
  scanTimer = window.setTimeout(() => {
    scanTimer = undefined;
    scan();
  }, 500);
}

function onClick(e: MouseEvent): void {
  const target = e.target instanceof Element ? e.target : null;
  const btn = target?.closest(ENGAGE_SELECTOR);
  if (!btn) return;
  const article = btn.closest('article[data-testid="tweet"]');
  if (!article) return;
  const info = tweetInfo(article);
  if (!info || !memberHandles?.has(info.handle)) return;
  if (reported.has(info.tweetId)) return;
  reported.add(info.tweetId);
  void chrome.runtime
    .sendMessage({ type: "lx:reportEngagement", tweetId: info.tweetId })
    .catch(() => {
      // Service worker asleep / extension updated — drop silently, the user
      // can still check in from the popup.
    });
}

async function init(): Promise<void> {
  let handles: string[] = [];
  try {
    const res = await chrome.runtime.sendMessage({
      type: "lx:getMemberHandles",
    });
    handles = Array.isArray(res?.handles) ? res.handles : [];
  } catch {
    return; // not configured yet
  }
  if (handles.length === 0) return;
  memberHandles = new Set(handles);

  injectStyles();
  scan();
  new MutationObserver(scheduleScan).observe(document.body, {
    childList: true,
    subtree: true,
  });
  // Capture phase so we see the click even if x.com stops propagation.
  document.addEventListener("click", onClick, true);
}

void init();
