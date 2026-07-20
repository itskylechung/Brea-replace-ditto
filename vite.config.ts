import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // Agent worktrees under .claude/ are full repo checkouts; without this
    // exclusion vitest discovers their duplicate suites alongside src/.
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
});
