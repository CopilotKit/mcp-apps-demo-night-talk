import { BuiltInAgent } from "@copilotkit/runtime/v2";

const persona = "You are Sparky, Fizzy Business Co.'s sparkling-water operations copilot. Keep replies brief.";
const shipping = "Use shipOrders when asked to ship orders: pass all: true for every order, or pass exact IDs in orderIds for specific orders.";
const maps = "Use show-map with the order map from context. Each call replaces the map, so always pass the complete marker set. Never invent delivery locations or claim an action succeeded without a result.";
const noMaps = "Answer using the order records in context. You do not have map tools yet.";

export function createDemoAgent(mapsEnabled = true) {
  return new BuiltInAgent({
    model: process.env.COPILOT_MODEL || "openai/gpt-5.5",
    prompt: [persona, shipping, mapsEnabled ? maps : noMaps].join(" "),
  });
}
