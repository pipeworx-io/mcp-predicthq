# mcp-predicthq

PredictHQ MCP — wraps the PredictHQ Events API (predicthq.com)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1679+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_events` | Search the PredictHQ Events API for real-world events (concerts, sports, conferences, festivals, public holidays, severe weather, etc.) used for demand forecasting. Filter by free-text query, category, country, and an active-date window; results are ranked by predicted impact. Returns each event with its rank, predicted attendance, dates, and location. Example: search_events({ query: "taylor swift", country: "US", category: "concerts", start: "2026-06-01", end: "2026-12-31" }). |
| `nearby_events` | Find PredictHQ events within a radius of a geographic point (latitude/longitude). Useful for "what is happening near this venue/store/airport" demand-forecasting queries. Filter by category and active-date window; results are ranked by predicted impact. Example: nearby_events({ latitude: 40.7128, longitude: -74.006, radius: "10km", category: "concerts,sports" }). |
| `get_event` | Fetch a single PredictHQ event by its id, returning its title, category, rank, predicted attendance, dates, and location. Example: get_event({ id: "abcDEF123" }). |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "predicthq": {
      "url": "https://gateway.pipeworx.io/predicthq/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/predicthq/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1679+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/predicthq_search_events \
  -H 'Content-Type: application/json' \
  -d '{"query":"marathon","country":"US","category":"sports","start":"2026-06-01","end":"2026-12-31"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/predicthq_search_events`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Standalone (no gateway account)

This package also runs as a local stdio MCP server — no Pipeworx account, no
gateway round-trip:

```json
{
  "mcpServers": {
    "predicthq": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-predicthq"]
    }
  }
}
```

Or run it directly to confirm it starts:

```bash
npx -y @pipeworx/mcp-predicthq
```

It speaks MCP over stdin/stdout and answers `initialize`/`tools/list`/`tools/call`
for **only** this pack's tools — none of the shared meta-tools the gateway
connection above adds. Same source, same tools, no ask_pipeworx routing.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Predicthq data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
