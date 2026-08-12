import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Some lib modules construct a Supabase client at import time; load .env.local
    // so those imports don't throw in the test process (no prefix = load everything).
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
