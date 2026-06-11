// Local-only: route Node's global fetch through an HTTP proxy so the dev server
// can reach external APIs (e.g. api.twitter.com for OAuth) behind a proxy.
// Node's native fetch ignores HTTP(S)_PROXY env vars by default.
//
// Used via `node --require ./scripts/local-proxy.cjs` in the `dev` script.
// Has no effect in production (Vercel needs no proxy) — it only acts when a
// proxy env var is present.
const proxy =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy;

if (proxy) {
  try {
    const { setGlobalDispatcher, ProxyAgent } = require("undici");
    setGlobalDispatcher(new ProxyAgent(proxy));
    console.log(`[local-proxy] fetch routed through ${proxy}`);
  } catch (e) {
    console.warn("[local-proxy] failed to set proxy dispatcher:", e.message);
  }
}
