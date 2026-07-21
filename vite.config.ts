import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    // Mirrors the vercel.json rewrites so `npm run dev` is also same-origin
    // (first-party auth cookies) when the VITE_INSFORGE_* URLs are unset.
    proxy: {
      "/api": {
        target: "https://35byng5f.ap-southeast.insforge.app",
        changeOrigin: true,
      },
      "/fn": {
        target: "https://35byng5f.function2.insforge.app",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/fn/, ""),
      },
    },
  },
  test: {
    // Agent worktrees under .claude/ are full repo checkouts; without this
    // exclusion vitest discovers their duplicate suites alongside src/.
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
});
