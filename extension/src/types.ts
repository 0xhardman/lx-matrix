export interface Member {
  twitter: string; // @handle
  name: string | null;
  avatar: string | null;
  directions: string[] | null;
  frequency: string | null;
  cumulative: number | null; // total tweets at last snapshot
  todayCount: number | null; // new tweets today, null if no baseline yet
  postedToday: boolean | null;
  lastSnapshotAt: string | null;
}

export interface MembersResponse {
  members: Member[];
  generatedAt: string;
}

export interface Settings {
  apiBase: string; // e.g. https://lx-matrix.vercel.app
  token: string; // member_token
}
