"use client";

import { useEffect, useState } from "react";
import { ArrowsIn, ArrowsOut } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { Handwriting } from "@/components/handwriting";
import { SyntaxCode } from "@/components/syntax-code";
import { MapPreview } from "@/components/map-preview";
import { MAP_INSPECTOR_URL, type Order } from "@/lib/map-app";

type Mode = "create" | "connect";

const MODES: Record<Mode, { title: string; note: string; sourceFile: string; snippet: string }> = {
  create: {
    title: "Build the MCP App", note: "the UI travels with the tool.",
    sourceFile: "apps/map-app/index.ts + views/map-view/view.tsx",
    snippet: `import { MCPServer } from "mcp-use";
import { useToolContext } from "mcp-use/react";
import L from "leaflet";

// index.ts — the view name loads views/map-view/view.tsx.
export const showMap = server.tool({
  name: "show-map",
  inputSchema: mapSchema, outputSchema: mapSchema,
  view: { name: "map-view" },
}, async (map) => ({
  content: [{ type: "text", text: "Map ready." }],
  structuredContent: map,
}));

// view.tsx — receives the tool's structuredContent.
export default function MapView() {
  const view = useToolContext<"show-map">();
  const data = view.status === "ready" ? view.toolOutput : null;

  useEffect(() => {
    if (!data) return;
    const map = L.map("map").setView(data.center, data.zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png")
      .addTo(map);
    data.markers.forEach(({ lat, lng }) =>
      L.marker([lat, lng]).addTo(map));
    return () => map.remove();
  }, [data]);

  return <div id="map" />;
}`,
  },
  connect: {
    title: "Connect the MCP App", note: "orders in. map out.",
    sourceFile: "apps/web/src/app/api/copilotkit/[[...slug]]/route.ts",
    snippet: `import {
  BuiltInAgent, CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";

// One runtime hosts both the agent and its MCP apps.
const runtime = new CopilotRuntime({
  agents: { default: new BuiltInAgent({
    model: "openai/gpt-5.5",
  })},

  // The only thing this app knows about the map: its URL.
  mcpApps: { servers: [{
    type: "http",
    url: process.env.NEXT_PUBLIC_MAP_MCP_URL!,
    serverId: "maps",
  }]},
});

// Expose the runtime through the Next.js route.
const handler = createCopilotRuntimeHandler({
  runtime, basePath: "/api/copilotkit",
});

// Agent runs and MCP traffic share this endpoint.
export { handler as GET, handler as POST };`,
  },
};

/**
 * The "studio" for the two MCP steps: source excerpts on the left, the running map app on the
 * right. The preview is one MCP Apps host that stays mounted across both steps; the inspector
 * link opens mcp-use's own UI (served by `mcp-use dev`) for trying the tool by hand.
 */
export function AppWorkbench({ mode, records }: { mode: Mode; records: Order[] }) {
  const { title, note, sourceFile, snippet } = MODES[mode];
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  return (
    <motion.section className={`app-workbench map-workbench ${expanded ? "workbench-expanded" : ""}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }} aria-label="App studio">
      <div className="studio-heading">
        <h1>
          {title}
          <Handwriting key={mode} className="handwritten studio-handwriting">{note}</Handwriting>
        </h1>
        <button className="icon-button" aria-label={expanded ? "Collapse studio" : "Expand studio"} onClick={() => setExpanded(!expanded)}>{expanded ? <ArrowsIn size={20} /> : <ArrowsOut size={20} />}</button>
      </div>
      <div className="studio-panels">
        <section className="source-panel" aria-label="Integration code">
          <div className="source-stage-label"><span className="source-file-dot" /><span title={sourceFile}>{sourceFile}</span></div>
          <SyntaxCode className="map-integration-code syntax-code" code={snippet} />
        </section>
        <section className="preview-panel" aria-label="Live map app">
          <div className="preview-toolbar">
            <span className="preview-stage-label">{mode === "create" ? "The app, running" : "show-map with the current orders"}</span>
            <a className="inspector-link" href={MAP_INSPECTOR_URL} target="_blank" rel="noreferrer">Open Inspector ↗</a>
          </div>
          <MapPreview records={records} />
        </section>
      </div>
    </motion.section>
  );
}
