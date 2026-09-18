import { defineConfig } from "@playwright/test";

// A dedicated port so the suite never reuses an unrelated dev server on 3000.
const port = 3100;

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
  },
  reporter: "list",
});
