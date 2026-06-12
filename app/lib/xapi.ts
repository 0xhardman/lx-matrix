export interface TwitterProfile {
  name: string;
  screen_name: string;
  followers: number;
  following: number;
  tweets: number;
  likes: number;
  media: number;
  created_at: string;
  description: string;
  avatar: string;
  url: string;
}

const XAPI_ENDPOINT = "https://action.xapi.to/v1/actions/execute";

/**
 * Fetch a public Twitter profile via the xapi HTTP API.
 * Returns null if the handle can't be resolved or the call fails.
 *
 * Uses the HTTP endpoint (not the npx CLI) so it works in serverless.
 * Requires XAPI_KEY in the environment.
 *
 * Note: the available data source does not expose verified / blue-check
 * status, so verification is confirmed manually via the profile link.
 */
export async function fetchTwitterProfile(
  handle: string
): Promise<TwitterProfile | null> {
  const screen = handle.replace(/^@/, "").trim();
  if (!/^[A-Za-z0-9_]{1,15}$/.test(screen)) return null;

  const key = process.env.XAPI_KEY;
  if (!key) {
    console.error("[xapi] XAPI_KEY is not set");
    return null;
  }

  try {
    const res = await fetch(XAPI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "XAPI-Key": key,
      },
      body: JSON.stringify({
        action_id: "twitter.user_by_screen_name",
        input: { screen_name: screen },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.error("[xapi] HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }

    const j = await res.json();
    const d = j?.data;
    if (!j?.success || !d) return null;

    return {
      name: d.name ?? screen,
      screen_name: d.screen_name ?? screen,
      followers: d.followers_count ?? 0,
      following: d.friends_count ?? 0,
      tweets: d.statuses_count ?? 0,
      likes: d.favourites_count ?? 0,
      media: d.media_count ?? 0,
      created_at: d.created_at ?? "",
      description: (d.description ?? "").replace(/\s+/g, " ").trim(),
      avatar: d.avatar ?? "",
      url: `https://x.com/${d.screen_name ?? screen}`,
    };
  } catch (err) {
    console.error("[xapi] fetchTwitterProfile failed:", err);
    return null;
  }
}

export interface MemberTweet {
  id: string;
  text: string;
  createdAt: string; // ISO
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  views: number;
  isQuote: boolean;
  authorName: string;
  authorHandle: string; // without @
  authorAvatar: string;
}

/**
 * Fetch a member's recent ORIGINAL tweets (excludes pure retweets and replies;
 * keeps quote tweets since those carry the member's own commentary).
 * Returns [] on any failure.
 */
export async function fetchUserTweets(
  userId: string,
  count = 10
): Promise<MemberTweet[]> {
  const key = process.env.XAPI_KEY;
  if (!key || !userId) return [];

  try {
    const res = await fetch(XAPI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "XAPI-Key": key },
      body: JSON.stringify({
        action_id: "twitter.user_tweets",
        input: { user_id: userId, count },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.error("[xapi] user_tweets HTTP", res.status);
      return [];
    }
    const j = await res.json();
    const tweets = j?.data?.tweets;
    if (!j?.success || !Array.isArray(tweets)) return [];

    return tweets
      .filter((t) => !t.is_retweet && !t.in_reply_to_status_id)
      .map((t) => ({
        id: String(t.id),
        text: (t.full_text ?? "").trim(),
        createdAt: t.created_at ? new Date(t.created_at).toISOString() : "",
        likes: t.favorite_count ?? 0,
        retweets: t.retweet_count ?? 0,
        replies: t.reply_count ?? 0,
        quotes: t.quote_count ?? 0,
        views: t.views_count ?? 0,
        isQuote: Boolean(t.is_quote_status),
        authorName: t.author?.name ?? "",
        authorHandle: t.author?.screen_name ?? "",
        authorAvatar: t.author?.avatar ?? "",
      }));
  } catch (err) {
    console.error("[xapi] fetchUserTweets failed:", err);
    return [];
  }
}
