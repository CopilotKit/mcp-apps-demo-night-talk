# Fizzy Maps

An MCP app built with [mcp-use](https://github.com/mcp-use/mcp-use). It exposes one tool, `show-map`, whose UI (`views/map-view/view.tsx`) is a Leaflet map that the host renders inline.

```sh
npm run dev      # http://127.0.0.1:3001/mcp, inspector at /inspector
npm run build
npm run deploy   # optional: publish to Manufact Cloud
```

Adapted from [mcp-use/mcp-maps-explorer](https://github.com/mcp-use/mcp-maps-explorer) (MIT).
