import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// Secrets live in the monorepo root .env so both apps share one file.
// Existing environment variables win; a missing file is fine.
for (const file of [".env", ".env.local"]) {
  try { process.loadEnvFile(fileURLToPath(new URL(`../../${file}`, import.meta.url))); } catch {}
}

const MAP_APP_URL = process.env.NEXT_PUBLIC_MAP_MCP_URL || "http://127.0.0.1:3001/mcp";

const config: NextConfig = {
  devIndicators: false,
  // Same-origin pass-through so the browser can open an MCP session with the map app
  // (used by the live preview on the "Add the MCP App" step). The copilot uses the URL directly.
  async rewrites() {
    return [{ source: "/map-mcp", destination: MAP_APP_URL }];
  },
};
export default config;
