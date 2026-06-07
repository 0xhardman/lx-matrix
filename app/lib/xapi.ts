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
