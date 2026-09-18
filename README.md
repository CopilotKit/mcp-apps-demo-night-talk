# Fizzy Business · MCP Apps × CopilotKit

A sparkling-water order desk that gains a chat copilot ("Sparky") and then an embedded map. The map is its own MCP app, built with [mcp-use](https://github.com/mcp-use/mcp-use), and CopilotKit renders it inline in the chat. Fizzy Business bundles no map library; the UI travels with the tool.

```
apps/
  web/       Next.js demo: order desk, Sparky chat, CopilotKit runtime
  map-app/   Fizzy Maps MCP app (mcp-use): show-map tool + Leaflet view
```

## Run

Requires Node 22.22.2 or newer (`nvm use`).

```sh
npm install
cp .env.example .env
# Add OPENAI_API_KEY for live chat. Both apps read the root .env.
npm run dev
```

This starts the web app on http://127.0.0.1:3000 and the map app on http://127.0.0.1:3001 (MCP endpoint at `/mcp`, inspector at `/mcp/inspector`). For presenting, `npm run build && npm start` runs both production builds.

## Demo flow

The page is a five-step build, driven by the tabs across the top:

1. **Our app**: the order dashboard. Search, filter, and edit orders. Nothing AI yet.
2. **Add chat**: a `<CopilotPopup />` plus one `useFrontendTool` (`shipOrders`). Open Sparky, try **What's delayed?** or **Ship FIZZ-1046**, and watch the order row flip to Shipping.
3. **Create an MCP App**: the Fizzy Maps source (`show-map` tool bound to a `map-view`) next to the app running live. **Open Inspector** opens mcp-use's inspector (a `mcp-use dev` feature) to call the tool by hand.
4. **Add the MCP App**: the CopilotKit runtime config that registers the MCP server (`mcpApps.servers`) next to the map app rendering the current orders live. That URL is the only thing the web app knows about the map; a one-line Next rewrite (`/map-mcp`) lets the browser open its own MCP session for the preview.
5. **All together**: Sparky now has the map tool. Open Sparky and click **Map my orders**. The map renders inline in the chat and can be expanded fullscreen.

## Editing the map app

Change `apps/map-app/views/map-view/view.tsx` while `npm run dev` is running, then revisit the tab to re-render. To demo against a hosted copy instead, deploy with `npm run deploy -w @fizzy/map-app` and set `NEXT_PUBLIC_MAP_MCP_URL` in `.env`.

Retailer names and neighborhood coordinates are fictional demo records. Tiles come from OpenStreetMap; no map-provider key is needed.

## Code

- `apps/web/src/components/build-demo.tsx`: the five-stage page, chat popup, and the `shipOrders` frontend tool.
- `apps/web/src/components/order-admin.tsx`: the order table, filters, and edit dialog.
- `apps/web/src/components/sparky-chat.tsx`: ShadCN-based chat with inline MCP app rendering and fullscreen expansion.
- `apps/web/src/components/app-workbench.tsx`: code excerpts next to the live map app.
- `apps/web/src/components/map-preview.tsx`: a minimal MCP Apps host. Opens an MCP session, calls `show-map`, reads the UI resource, runs it behind an `AppBridge`.
- `apps/web/src/app/api/copilotkit/[[...slug]]/route.ts`: CopilotKit runtime with the MCP Apps server registered.
- `apps/web/src/app/api/connection/route.ts`: reports whether a model key is configured.
- `apps/web/src/lib/map-app.ts`: map endpoint and demo order data.
- `apps/web/src/lib/demo-agent.ts`: Sparky's prompt and model.
- `apps/map-app/index.ts`: the MCP server and its `show-map` tool.
- `apps/map-app/views/map-view/view.tsx`: the Leaflet view the host renders.

`OPENAI_API_KEY` and `MCP_AUTH_TOKEN` stay server-side; the token is only ever sent to the map app. Set `COPILOT_MODEL` to change the default `openai/gpt-5.5` model.

## Verification

```sh
npm run typecheck
npm run build
npm run test:e2e
```

The e2e tests mock the agent stream, so they verify UI behavior without a paid model call or a running map server. Live chat requires `OPENAI_API_KEY`.

Chat components are adapted from CopilotKit's shadcn example and the map app from mcp-use's Maps Explorer; see THIRD_PARTY_NOTICES.md.
