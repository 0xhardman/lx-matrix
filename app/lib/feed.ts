import { ensureSchema, getPool } from "@/app/lib/db";
import { fetchUserTweets } from "@/app/lib/xapi";

// How long a cached feed stays fresh before the next popup open triggers a
// refresh. Tune up if xapi cost gets high. Overridable via FEED_TTL_MINUTES.
function ttlMinutes(): number {
  const v = Number(process.env.FEED_TTL_MINUTES);
  return Number.isFinite(v) && v > 0 ? v : 30;
}

// Tweets fetched per member per refresh, and how many show in the feed.
const TWEETS_PER_MEMBER = 8;
const FEED_LIMIT = 100;
const CONCURRENCY = 5;

export interface FeedItem {
  tweet_id: string;
  twitter: string; // @handle
  author_name: string | null;
  author_avatar: string | null;
  text: string | null;
  tweet_at: string | null;
  like_count: number | null;
  retweet_count: number | null;
  reply_count: number | null;
  quote_count: number | null;
  views_count: number | null;
  is_quote: boolean | null;
  url: string;
  engaged: boolean; // viewer already checked in on this tweet
  own: boolean; // viewer's own tweet — not part of their queue
}

export interface FeedSummary {
  // Member tweets from the last 24h the viewer hasn't engaged with yet.
  pending: number;
  // Check-ins the viewer made since the start of today (Beijing time).
  engagedToday: number;
}

async function lastRefreshAt(): Promise<number> {
  const { rows } = await getPool().query(
    `SELECT MAX(fetched_at) AS t FROM member_tweets`
  );
  return rows[0]?.t ? new Date(rows[0].t).getTime() : 0;
}

/** Run async tasks with bounded concurrency. */
async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

/**
 * Fetch every approved member's recent original tweets and upsert them.
 * Bounded concurrency to stay within serverless time limits and be gentle on
 * xapi. Returns the number of members refreshed.
 */
export async function refreshFeed(): Promise<number> {
  await ensureSchema();
  const db = getPool();
  const { rows: members } = await db.query(
    `SELECT id, twitter, twitter_id FROM twitter_registrations
     WHERE status = 'approved' AND twitter_id IS NOT NULL`
  );

  await pool(members, CONCURRENCY, async (m) => {
    const tweets = await fetchUserTweets(m.twitter_id, TWEETS_PER_MEMBER);
    for (const t of tweets) {
      if (!t.id || !t.createdAt) continue;
      await db.query(
        `INSERT INTO member_tweets
           (tweet_id, registration_id, twitter, author_name, author_avatar,
            text, tweet_at, like_count, retweet_count, reply_count,
            quote_count, views_count, is_quote, fetched_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
         ON CONFLICT (tweet_id) DO UPDATE SET
           author_name = EXCLUDED.author_name,
           author_avatar = EXCLUDED.author_avatar,
           text = EXCLUDED.text,
           like_count = EXCLUDED.like_count,
           retweet_count = EXCLUDED.retweet_count,
           reply_count = EXCLUDED.reply_count,
           quote_count = EXCLUDED.quote_count,
           views_count = EXCLUDED.views_count,
           fetched_at = now()`,
        [
          t.id,
          m.id,
          m.twitter,
          t.authorName,
          t.authorAvatar,
          t.text,
          t.createdAt,
          t.likes,
          t.retweets,
          t.replies,
          t.quotes,
          t.views,
          t.isQuote,
        ]
      );
    }
  });

  return members.length;
}

/**
 * Return the activity feed as seen by one member: every item carries whether
 * the viewer already engaged with it and whether it's their own tweet.
 * Refreshes via xapi only if the cache is older than the TTL (or force=true).
 * Shared across all callers, so cost is bounded.
 */
export async function getFeed(
  viewerId: number,
  force = false
): Promise<{
  items: FeedItem[];
  refreshedAt: string | null;
  summary: FeedSummary;
}> {
  await ensureSchema();
  const ageMs = Date.now() - (await lastRefreshAt());
  if (force || ageMs > ttlMinutes() * 60_000) {
    await refreshFeed();
  }
  const db = getPool();

  const { rows } = await db.query(
    `SELECT t.tweet_id, t.twitter, t.author_name, t.author_avatar, t.text,
            t.tweet_at, t.like_count, t.retweet_count, t.reply_count,
            t.quote_count, t.views_count, t.is_quote,
            (e.tweet_id IS NOT NULL)      AS engaged,
            (t.registration_id = $1)      AS own
       FROM member_tweets t
       LEFT JOIN tweet_engagements e
         ON e.tweet_id = t.tweet_id AND e.registration_id = $1
      ORDER BY t.tweet_at DESC
      LIMIT ${FEED_LIMIT}`,
    [viewerId]
  );
  const items: FeedItem[] = rows.map((r) => ({
    ...r,
    url: `https://x.com/${r.twitter.replace(/^@/, "")}/status/${r.tweet_id}`,
  }));

  const dayAgo = Date.now() - 24 * 3600_000;
  const pending = items.filter(
    (i) =>
      !i.engaged && !i.own && i.tweet_at && new Date(i.tweet_at).getTime() > dayAgo
  ).length;

  // "Today" in Beijing time, consistent with the members view.
  const { rows: todayRows } = await db.query(
    `SELECT count(*)::int AS n FROM tweet_engagements
      WHERE registration_id = $1
        AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Shanghai')
                           AT TIME ZONE 'Asia/Shanghai')`,
    [viewerId]
  );

  const { rows: meta } = await db.query(
    `SELECT MAX(fetched_at) AS t FROM member_tweets`
  );
  return {
    items,
    refreshedAt: meta[0]?.t ? new Date(meta[0].t).toISOString() : null,
    summary: { pending, engagedToday: todayRows[0]?.n ?? 0 },
  };
}
