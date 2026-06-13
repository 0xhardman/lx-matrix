// Build a Chrome Web Store-ready zip from dist: a production manifest with the
// dev-only localhost access stripped, then zipped. Invoked by `npm run
// pack:store`, which runs a fresh `npm run build` first — so dist starts from
// the dev manifest (public/manifest.json) and this only rewrites the copy that
// goes into the store zip.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve("dist");
const mfPath = resolve(dist, "manifest.json");
if (!existsSync(mfPath)) {
  console.error("[pack-store] dist/manifest.json not found — run `npm run build` first.");
  process.exit(1);
}

const mf = JSON.parse(readFileSync(mfPath, "utf8"));

const noLocalhost = (arr) => (arr || []).filter((s) => !s.includes("localhost"));
mf.host_permissions = noLocalhost(mf.host_permissions);
for (const cs of mf.content_scripts || []) cs.matches = noLocalhost(cs.matches);
// A content script with no remaining matches would be invalid — drop it.
mf.content_scripts = (mf.content_scripts || []).filter((cs) => cs.matches.length);

writeFileSync(mfPath, JSON.stringify(mf, null, 2) + "\n");
console.log("[pack-store] production manifest written (localhost stripped)");

const out = resolve("..", "public", "lx-matrix-extension-store.zip");
rmSync(out, { force: true });
execFileSync("zip", ["-qr", out, ".", "-x", ".*"], { cwd: dist });
console.log(`[pack-store] store zip → public/lx-matrix-extension-store.zip`);
console.log("[pack-store] dist now holds the production manifest; re-run `npm run build` for local dev.");
