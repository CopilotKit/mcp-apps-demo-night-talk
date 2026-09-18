import { MCPServer } from "mcp-use";
import { mapSchema } from "./views/map-view/schema";

const server = new MCPServer({
  name: "fizzy-maps",
  title: "Fizzy Maps",
  version: "1.0.0",
  description: "Sparkling-water deliveries on a Leaflet map.",
  instructions: "Use show-map to draw the current orders. Each call replaces the whole map, so always pass the complete marker set.",
  icons: [{ src: "icon.svg", mimeType: "image/svg+xml", sizes: ["512x512"] }],
});

// The view named here is loaded from views/map-view/view.tsx and receives the tool's structuredContent.
export const showMap = server.tool(
  {
    name: "show-map",
    description: "Show an interactive map with colored, titled markers.",
    inputSchema: mapSchema,
    outputSchema: mapSchema,
    view: {
      name: "map-view",
      description: "Interactive Leaflet map of the current orders",
      prefersBorder: false,
      csp: { resourceDomains: ["https://tile.openstreetmap.org"], connectDomains: ["https://tile.openstreetmap.org"] },
    },
  },
  async (map) => ({
    content: [{ type: "text", text: `Map of ${map.markers.length} marker${map.markers.length === 1 ? "" : "s"}${map.title ? `: ${map.title}` : ""}.` }],
    structuredContent: map,
  }),
);

export default server;
