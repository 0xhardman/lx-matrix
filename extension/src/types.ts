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
  token: string; // ext token (ext_...)
}

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
}

export interface FeedResponse {
  items: FeedItem[];
  refreshedAt: string | null;
}
