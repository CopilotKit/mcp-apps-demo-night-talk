/** Reject cross-origin calls to the demo's own API routes. */
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || new URL(request.url).host;
  if (origin && new URL(origin).host !== host) throw new Error("Cross-origin requests are not allowed.");
}

/** Optional bearer token for the map MCP app. It only ever goes to that one server. */
export function mapAppHeaders(): Record<string, string> | undefined {
  const token = process.env.MCP_AUTH_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}
