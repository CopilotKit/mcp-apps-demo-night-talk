/**
 * Run `tick` immediately and then on an interval, stopping after `forMs`.
 * MCP app iframes load asynchronously and expose no ready event to the host,
 * so the host briefly polls instead. Returns a cleanup function.
 */
export function pollBriefly(tick: () => void, { every = 250, forMs = 8000 } = {}) {
  tick();
  const interval = window.setInterval(tick, every);
  const stop = window.setTimeout(() => window.clearInterval(interval), forMs);
  return () => { window.clearInterval(interval); window.clearTimeout(stop); };
}
