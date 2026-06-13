// Content script on the LX matrix site. The /extension page hands its ext
// token to the extension via window.postMessage; we save it (plus the page's
// own origin as the service address) so the popup is configured with zero
// manual entry. We post a "connected" message back so the page can confirm.
//
// Self-contained on purpose (no runtime imports) so the build emits a single
// classic script — MV3 content scripts can't be ES modules. The storage key
// is inlined to match storage.ts.

const SETTINGS_KEY = "lx_settings";

window.addEventListener("message", (event) => {
  // Only trust same-window, same-origin messages from the page's own code.
  if (event.source !== window || event.origin !== location.origin) return;
  const d = event.data as
    | { source?: string; type?: string; token?: string; apiBase?: string }
    | null;
  if (!d || d.source !== "lx-matrix" || d.type !== "ext-token") return;

  const token = typeof d.token === "string" ? d.token : "";
  if (!token.startsWith("ext_")) return;
  const apiBase =
    typeof d.apiBase === "string" && d.apiBase ? d.apiBase : location.origin;

  chrome.storage.local.set({ [SETTINGS_KEY]: { apiBase, token } }, () => {
    // Storage change wakes the service worker (storage.onChanged) → badge
    // refresh. Tell the page so it can show a "connected" confirmation.
    window.postMessage(
      { source: "lx-matrix-ext", type: "connected" },
      location.origin
    );
  });
});
