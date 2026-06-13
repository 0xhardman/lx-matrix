import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the built assets resolve correctly when loaded from the
// chrome-extension:// origin (the popup is served as a local file).
//
// Three entries: the popup (html), the MV3 service worker, and the x.com
// content script. background/content are written import-free (only `import
// type`), so rollup emits them as standalone classic scripts — content
// scripts can't load ES module chunks.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "index.html",
        background: "src/background.ts",
        content: "src/content.ts",
        connect: "src/connect.ts",
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
