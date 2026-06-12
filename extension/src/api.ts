import type { FeedResponse, MembersResponse, Settings } from "./types";

function base(settings: Settings): string {
  const b = settings.apiBase.replace(/\/+$/, "");
  if (!b) throw new Error("请先在设置里填写服务地址");
  if (!settings.token) throw new Error("请先在设置里填写扩展令牌");
  return b;
}

async function get<T>(settings: Settings, path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base(settings)}${path}`, {
      headers: { "x-member-token": settings.token },
    });
  } catch {
    throw new Error("无法连接服务，请检查服务地址");
  }
  if (res.status === 401) throw new Error("令牌无效或未授权");
  if (!res.ok) throw new Error(`请求失败 (${res.status})`);
  return (await res.json()) as T;
}

/** Aggregated recent original tweets from approved members. */
export async function fetchFeed(
  settings: Settings,
  force = false
): Promise<FeedResponse> {
  return get<FeedResponse>(settings, `/api/feed${force ? "?force=1" : ""}`);
}

/** Approved members + whether they posted today. */
export async function fetchMembers(settings: Settings): Promise<MembersResponse> {
  return get<MembersResponse>(settings, "/api/members");
}
