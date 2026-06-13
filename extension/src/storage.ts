import type { Settings } from "./types";

const KEY = "lx_settings";

const DEFAULTS: Settings = {
  // Pre-filled so members don't have to type it. Auto-connect (the /extension
  // page → connect content script) overrides this with the real origin, which
  // matters for local dev (http://localhost:3000).
  apiBase: "https://lx-matrix.vercel.app",
  token: "",
};

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(KEY);
  return { ...DEFAULTS, ...(stored[KEY] as Partial<Settings> | undefined) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: settings });
}
