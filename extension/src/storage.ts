import type { Settings } from "./types";

const KEY = "lx_settings";

const DEFAULTS: Settings = {
  apiBase: "",
  token: "",
};

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(KEY);
  return { ...DEFAULTS, ...(stored[KEY] as Partial<Settings> | undefined) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: settings });
}
