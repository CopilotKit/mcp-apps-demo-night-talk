// The map is a separate MCP app (apps/map-app, built with mcp-use). Fizzy Business bundles no map library.
export const MAP_APP_URL = process.env.NEXT_PUBLIC_MAP_MCP_URL || "http://127.0.0.1:3001/mcp";
// mcp-use serves an inspector next to the MCP endpoint for trying the tool by hand.
export const MAP_INSPECTOR_URL = `${MAP_APP_URL.replace(/\/$/, "")}/inspector`;
// Same-origin proxy to MAP_APP_URL (see next.config.ts) so the browser can open its own MCP session.
export const MAP_PROXY_PATH = "/map-mcp";

export const ORDER_STATUSES = ["Shipping", "Packing", "Delayed"] as const;

// Approximate San Francisco delivery coordinates for each fictional neighborhood.
export const NEIGHBORHOODS = {
  SoMa: { lat: 37.7785, lng: -122.395 },
  "Financial District": { lat: 37.7946, lng: -122.3999 },
  Mission: { lat: 37.7599, lng: -122.4148 },
  Sunset: { lat: 37.7534, lng: -122.494 },
  Marina: { lat: 37.8037, lng: -122.4368 },
  "Potrero Hill": { lat: 37.7561, lng: -122.401 },
  "Nob Hill": { lat: 37.793, lng: -122.416 },
} satisfies Record<string, { lat: number; lng: number }>;
export type Neighborhood = keyof typeof NEIGHBORHOODS;

export type Order = {
  id: string; name: string; area: string; status: string; flavor: string; cases: number;
  lat: number; lng: number; color: string;
};

const order = (id: string, name: string, area: Neighborhood, flavor: string, cases: number, color: string): Order =>
  ({ id, name, area, status: "Packing", flavor, cases, color, ...NEIGHBORHOODS[area] });

// Fictional demo orders.
export const orders: Order[] = [
  order("FIZZ-1042", "Mission Bodega", "Mission", "Meeting-Free Lime", 48, "purple"),
  order("FIZZ-1043", "Corner Store Deluxe", "SoMa", "Yuzu Static", 24, "blue"),
  order("FIZZ-1044", "The Fancy Fridge", "Financial District", "Plain-ish", 12, "green"),
  order("FIZZ-1045", "Sunset Snacks", "Sunset", "Inbox Zero Yuzu", 36, "green"),
  order("FIZZ-1046", "Marina Mini Mart", "Marina", "Wi-Fi Hibiscus", 18, "purple"),
  order("FIZZ-1047", "Potrero Pantry", "Potrero Hill", "Calendar Citrus", 30, "blue"),
  order("FIZZ-1048", "Nob Hill Nibbles", "Nob Hill", "Quarterly Berry", 42, "green"),
];

export const mapForOrders = (records: Order[]) => ({
  title: "Sparkling water orders · San Francisco",
  center: { lat: 37.777, lng: -122.41 },
  zoom: 11,
  markers: records.map(order => ({
    lat: order.lat, lng: order.lng, title: `${order.id} · ${order.name}`,
    description: `${order.flavor} · ${order.cases} cases · ${order.status}`, color: order.color,
  })),
});
