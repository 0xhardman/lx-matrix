import type { MembersResponse, Settings } from "./types";

/**
 * Fetch the approved-member list from the LX matrix backend. The member token
 * is sent in the `x-member-token` header. Throws with a readable message on any
 * non-2xx response or network error.
 */
export async function fetchMembers(settings: Settings): Promise<MembersResponse> {
  const base = settings.apiBase.replace(/\/+$/, "");
  if (!base) throw new Error("请先在设置里填写服务地址");
  if (!settings.token) throw new Error("请先在设置里填写成员令牌");

  let res: Response;
  try {
    res = await fetch(`${base}/api/members`, {
      headers: { "x-member-token": settings.token },
    });
  } catch {
    throw new Error("无法连接服务，请检查服务地址");
  }

  if (res.status === 401) throw new Error("令牌无效或未授权");
  if (!res.ok) throw new Error(`请求失败 (${res.status})`);

  return (await res.json()) as MembersResponse;
}
