import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
  InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";
import { MAP_APP_URL } from "@/lib/map-app";
import { createDemoAgent } from "@/lib/demo-agent";
import { mapAppHeaders, sameOrigin } from "@/lib/mcp";
export const runtime = "nodejs";
// One runtime per demo stage: "Add chat" has no map tools, "All together" does.
const handlers = new Map<boolean, ReturnType<typeof createCopilotRuntimeHandler>>();

function handlerFor(mapsEnabled: boolean) {
  let handler = handlers.get(mapsEnabled);
  if (handler) return handler;
  handler = createCopilotRuntimeHandler({
    runtime: new CopilotRuntime({
      agents: { default: createDemoAgent(mapsEnabled) },
      runner: new InMemoryAgentRunner(),
      mcpApps: mapsEnabled
        ? { servers: [{ type: "http", url: MAP_APP_URL, serverId: "maps", headers: mapAppHeaders() }] }
        : undefined,
    }),
    basePath: "/api/copilotkit",
  });
  handlers.set(mapsEnabled, handler);
  return handler;
}

async function handle(request: Request) {
  try {
    sameOrigin(request);
    if (!process.env.OPENAI_API_KEY)
      return Response.json({ error: "Set OPENAI_API_KEY in .env and restart the server." }, { status: 503 });
    return handlerFor(request.headers.get("x-demo-stage") !== "chat")(request);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Runtime error" }, { status: 400 });
  }
}
export const GET = handle;
export const POST = handle;
