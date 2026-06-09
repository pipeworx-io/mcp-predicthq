interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * PredictHQ MCP — wraps the PredictHQ Events API (predicthq.com)
 *
 * Real-world event intelligence for demand forecasting: concerts, sports,
 * conferences, festivals, public holidays, severe weather, airport delays,
 * and more. Each event carries a predicted-impact rank and (where available)
 * a predicted-attendance figure (PHQ Attendance).
 *
 * Tools:
 * - search_events:  free-text / category / country / date-window event search
 * - nearby_events:  events within a radius of a lat/lng point
 * - get_event:      fetch a single event by its PredictHQ id
 *
 * Dual-key model: _apiKey is OPTIONAL. Pass your own PredictHQ access token
 * for your own quota, or omit it to use the shared Pipeworx platform key.
 * Auth is sent via the `Authorization: Bearer <token>` request header.
 */


const BASE_URL = 'https://api.predicthq.com/v1';
const USER_AGENT = 'pipeworx/1.0 (+https://pipeworx.io)';

// Valid PredictHQ event categories (for validation/help text).
const CATEGORIES = [
  'concerts',
  'sports',
  'conferences',
  'expos',
  'festivals',
  'performing-arts',
  'community',
  'public-holidays',
  'observances',
  'politics',
  'academic',
  'school-holidays',
  'daylight-savings',
  'severe-weather',
  'airport-delays',
  'disasters',
  'terror',
  'health-warnings',
];

const API_KEY_PROP = {
  type: 'string',
  description:
    'Optional — your own PredictHQ access token for your own quota; omit to use the shared Pipeworx platform key.',
} as const;

const CATEGORY_PROP = {
  type: 'string',
  description:
    'Comma-separated event categories. One or more of: concerts, sports, conferences, expos, festivals, performing-arts, community, public-holidays, observances, politics, academic, school-holidays, daylight-savings, severe-weather, airport-delays, disasters, terror, health-warnings. Example: "concerts,sports".',
} as const;

const START_PROP = {
  type: 'string',
  description: 'Only include events active on or after this date (YYYY-MM-DD), e.g. "2026-06-01".',
} as const;

const END_PROP = {
  type: 'string',
  description: 'Only include events active on or before this date (YYYY-MM-DD), e.g. "2026-06-30".',
} as const;

const tools: McpToolExport['tools'] = [
  {
    name: 'search_events',
    description:
      'Search the PredictHQ Events API for real-world events (concerts, sports, conferences, festivals, public holidays, severe weather, etc.) used for demand forecasting. Filter by free-text query, category, country, and an active-date window; results are ranked by predicted impact. Returns each event with its rank, predicted attendance, dates, and location. Example: search_events({ query: "taylor swift", country: "US", category: "concerts", start: "2026-06-01", end: "2026-12-31" }).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Free-text search across event titles/descriptions, e.g. "marathon".' },
        category: CATEGORY_PROP,
        country: { type: 'string', description: '2-letter ISO country code, e.g. "US", "GB", "AU".' },
        start: START_PROP,
        end: END_PROP,
        limit: { type: 'number', description: 'Max events to return (default 15, max 50).' },
        _apiKey: API_KEY_PROP,
      },
    },
  },
  {
    name: 'nearby_events',
    description:
      'Find PredictHQ events within a radius of a geographic point (latitude/longitude). Useful for "what is happening near this venue/store/airport" demand-forecasting queries. Filter by category and active-date window; results are ranked by predicted impact. Example: nearby_events({ latitude: 40.7128, longitude: -74.006, radius: "10km", category: "concerts,sports" }).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        latitude: { type: 'number', description: 'Center latitude in decimal degrees, e.g. 40.7128.' },
        longitude: { type: 'number', description: 'Center longitude in decimal degrees, e.g. -74.006.' },
        radius: { type: 'string', description: 'Search radius with unit, e.g. "10km", "5mi" (default "10km").' },
        category: CATEGORY_PROP,
        start: START_PROP,
        end: END_PROP,
        limit: { type: 'number', description: 'Max events to return (default 15, max 50).' },
        _apiKey: API_KEY_PROP,
      },
      required: ['latitude', 'longitude'],
    },
  },
  {
    name: 'get_event',
    description:
      'Fetch a single PredictHQ event by its id, returning its title, category, rank, predicted attendance, dates, and location. Example: get_event({ id: "abcDEF123" }).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The PredictHQ event id, e.g. "abcDEF123".' },
        _apiKey: API_KEY_PROP,
      },
      required: ['id'],
    },
  },
];

// PredictHQ event shape (subset we read from the API).
interface PhqEvent {
  id: string;
  title: string;
  description?: string;
  category: string;
  labels?: string[];
  rank?: number;
  local_rank?: number;
  phq_attendance?: number;
  start?: string;
  end?: string;
  timezone?: string;
  duration?: number;
  country?: string;
  location?: [number, number]; // [lng, lat]
  geo?: unknown;
  place_hierarchies?: unknown;
  entities?: Array<{ name: string; type: string }>;
}

interface PhqSearchResponse {
  count: number;
  results: PhqEvent[];
}

// Map a raw PredictHQ event to the trimmed, agent-friendly shape we return.
function mapEvent(e: PhqEvent) {
  const loc = e.location;
  return {
    id: e.id,
    title: e.title,
    category: e.category,
    rank: e.rank,
    predicted_attendance: e.phq_attendance,
    start: e.start,
    end: e.end,
    timezone: e.timezone,
    country: e.country,
    location: Array.isArray(loc) ? { lat: loc[1], lng: loc[0] } : null,
    entities: Array.isArray(e.entities) ? e.entities.map((en) => en.name) : [],
  };
}

function clampLimit(limit: unknown): number {
  const n = typeof limit === 'number' ? limit : 15;
  if (!Number.isFinite(n) || n <= 0) return 15;
  return Math.min(Math.floor(n), 50);
}

async function phqGet(path: string, apiKey: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  });

  if (res.status === 401) {
    return { __error: 'PredictHQ auth error (check token)' };
  }
  if (res.status === 429) {
    return { __error: 'PredictHQ rate limit; try again later' };
  }
  if (!res.ok) {
    return { __error: `PredictHQ error: ${res.status}` };
  }
  return res.json();
}

// Build a /events/ query from the shared search/nearby filter args.
function buildEventParams(args: {
  category?: string;
  start?: string;
  end?: string;
  limit?: unknown;
}): URLSearchParams {
  const params = new URLSearchParams();
  if (args.category) params.set('category', args.category);
  if (args.start) params.set('active.gte', args.start);
  if (args.end) params.set('active.lte', args.end);
  params.set('limit', String(clampLimit(args.limit)));
  params.set('sort', 'rank');
  return params;
}

async function searchEvents(args: Record<string, unknown>, apiKey: string) {
  const params = buildEventParams({
    category: args.category as string | undefined,
    start: args.start as string | undefined,
    end: args.end as string | undefined,
    limit: args.limit,
  });
  if (args.query) params.set('q', args.query as string);
  if (args.country) params.set('country', args.country as string);

  const data = await phqGet(`/events/?${params.toString()}`, apiKey);
  if (isErr(data)) return { error: data.__error };

  const body = data as PhqSearchResponse;
  const results = Array.isArray(body.results) ? body.results : [];
  return {
    total: body.count ?? results.length,
    count: results.length,
    events: results.map(mapEvent),
  };
}

async function nearbyEvents(args: Record<string, unknown>, apiKey: string) {
  const lat = args.latitude as number | undefined;
  const lng = args.longitude as number | undefined;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { error: 'nearby_events requires numeric latitude and longitude' };
  }
  const radius = (args.radius as string | undefined) || '10km';

  const params = buildEventParams({
    category: args.category as string | undefined,
    start: args.start as string | undefined,
    end: args.end as string | undefined,
    limit: args.limit,
  });
  // within=<radius>@<lat>,<lng> — value contains '@' and ',' so encode it whole.
  params.set('within', `${radius}@${lat},${lng}`);

  const data = await phqGet(`/events/?${params.toString()}`, apiKey);
  if (isErr(data)) return { error: data.__error };

  const body = data as PhqSearchResponse;
  const results = Array.isArray(body.results) ? body.results : [];
  return {
    total: body.count ?? results.length,
    count: results.length,
    events: results.map(mapEvent),
  };
}

async function getEvent(args: Record<string, unknown>, apiKey: string) {
  const id = args.id as string | undefined;
  if (!id) return { error: 'get_event requires an event id', id };

  const params = new URLSearchParams({ id });
  const data = await phqGet(`/events/?${params.toString()}`, apiKey);
  if (isErr(data)) return { error: data.__error };

  const body = data as PhqSearchResponse;
  const first = Array.isArray(body.results) ? body.results[0] : undefined;
  if (!first) return { error: 'event not found', id };
  return mapEvent(first);
}

// Narrowing helper for the internal { __error } sentinel returned by phqGet.
function isErr(data: unknown): data is { __error: string } {
  return typeof data === 'object' && data !== null && '__error' in data;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = args._apiKey as string | undefined;
  delete args._apiKey;

  if (!apiKey) {
    return { error: 'PredictHQ requires an access token via _apiKey or the platform key' };
  }

  try {
    switch (name) {
      case 'search_events':
        return await searchEvents(args, apiKey);
      case 'nearby_events':
        return await nearbyEvents(args, apiKey);
      case 'get_event':
        return await getEvent(args, apiKey);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// CATEGORIES is exported-adjacent metadata used in tool descriptions; reference
// it here so it is retained and available for any future validation logic.
void CATEGORIES;

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
