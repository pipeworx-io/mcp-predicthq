# mcp-predicthq

PredictHQ MCP — wraps the PredictHQ Events API (predicthq.com)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Predicthq data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
