"use client";

import { useEffect, useRef, useState } from "react";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { AppBridge, PostMessageTransport, getToolUiResourceUri } from "@modelcontextprotocol/ext-apps/app-bridge";
import { buildSandboxHTML } from "@copilotkit/mcp-apps-renderer";
import { MAP_PROXY_PATH, mapForOrders, type Order } from "@/lib/map-app";

const MAP_TOOL = "show-map";
const SANDBOX = "allow-scripts allow-same-origin";

/**
 * Renders the map MCP app without a model in the loop, the same way any MCP Apps host does:
 * open an MCP session, call the tool, read the UI resource it points at, then run the app in
 * a sandboxed iframe behind an AppBridge. The bridge forwards the app's own tool calls back to
 * the server, so nothing here is specific to maps beyond the tool name and arguments.
 */
export function MapPreview({ records }: { records: Order[] }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!frame.current) return;
    const iframe: HTMLIFrameElement = frame.current;
    let cancelled = false;
    const client = new Client({ name: "fizzy-map-preview", version: "1.0.0" });
    const bridge = new AppBridge(client, { name: "Fizzy Business", version: "1.0.0" }, { serverTools: {}, updateModelContext: {} }, {
      hostContext: { theme: "light", displayMode: "inline", availableDisplayModes: ["inline"] },
    });
    setStatus("loading");

    async function mount() {
      await client.connect(new StreamableHTTPClientTransport(new URL(MAP_PROXY_PATH, window.location.origin)));
      const { tools } = await client.listTools();
      const tool = tools.find(tool => tool.name === MAP_TOOL);
      const uri = tool && getToolUiResourceUri(tool);
      if (!uri) throw new Error(`The map app has no ${MAP_TOOL} tool with a UI.`);

      const args = mapForOrders(records);
      const result = await client.callTool({ name: MAP_TOOL, arguments: args });
      const { contents } = await client.readResource({ uri });
      const html = contents.find(content => "text" in content)?.text;
      if (typeof html !== "string") throw new Error("The map app returned no HTML.");
      const csp = (contents[0]?._meta?.ui as { csp?: { resourceDomains?: string[] } } | undefined)?.csp;
      if (cancelled) return;

      bridge.onupdatemodelcontext = async () => ({});
      bridge.onsandboxready = () => { void bridge.sendSandboxResourceReady({ html, sandbox: SANDBOX }); };
      bridge.oninitialized = () => {
        void bridge.sendToolInput({ arguments: args });
        void bridge.sendToolResult(result as Parameters<typeof bridge.sendToolResult>[0]);
        setStatus("ready");
      };
      await bridge.connect(new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!));
      iframe.srcdoc = buildSandboxHTML([new URL(MAP_PROXY_PATH, window.location.origin).origin, ...(csp?.resourceDomains ?? [])]);
    }

    mount().catch((cause: unknown) => {
      if (cancelled) return;
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("error");
    });
    return () => {
      cancelled = true;
      void bridge.close();
      void client.close();
    };
  }, [records]);

  return <div className="map-preview">
    <iframe ref={frame} title="Fizzy Maps preview" className="preview-frame" sandbox={SANDBOX} />
    {status !== "ready" && <p className="preview-status" role={status === "error" ? "alert" : "status"}>
      {status === "error" ? `Map unavailable: ${error}` : "Starting the map app…"}
    </p>}
  </div>;
}
