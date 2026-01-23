const DEFAULT_API_BASE_URL = 'http://localhost:8000';

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return (baseUrl && baseUrl.trim().length > 0 ? baseUrl : DEFAULT_API_BASE_URL).replace(/\/$/, '');
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function requestJson<TResponse>(path: string, init: RequestInit): Promise<TResponse> {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.status} ${response.statusText}`, response.status, payload);
  }

  return payload as TResponse;
}

export type ChatRole = 'user' | 'agent' | 'system' | 'tool';

export type IngestRequest = {
  namespace: string;
  session_id: string;
  role: ChatRole;
  text: string;
  metadata?: Record<string, unknown>;
};

export type IngestResponse = {
  memory_id: string;
  accepted: boolean;
};

export type QueryRequest = {
  namespace: string;
  session_id: string;
  query: string;
  top_k?: number;
};

export type RetrievedChunk = {
  id: string;
  tier: string;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
};

export type QueryResponse = {
  id: string;
  source_tier: string;
  similarity: number;
  raw_chunks: RetrievedChunk[];
  condensed_summary: string;
  token_usage_original: number;
  token_usage_condensed: number;
  rerank_debug: Array<{ method: string; components: Record<string, number> }>;
  session_summary_id?: string | null;
  session_summary_cache_hit?: boolean;
  session_summary_enqueued?: boolean;
  context_pack_id?: string | null;
  context_pack?: Record<string, unknown>;
};

export type OpsPipelineResponse = {
  queues: Array<{ name: string; count: number }>;
  recent_condensations: Array<{
    id: string;
    namespace: string;
    session_id: string;
    version: string;
    condensed_text: string;
    token_original: number;
    token_condensed: number;
    created_at: string;
  }>;
};

export type OpsAuditEvent = {
  id: string;
  namespace: string;
  session_id: string;
  event_type: string;
  details: Record<string, unknown>;
  created_at: string;
};

export type OpsAuditResponse = {
  events: OpsAuditEvent[];
};

export async function ingest(req: IngestRequest): Promise<IngestResponse> {
  return requestJson<IngestResponse>('/v1/ingest', {
    method: 'POST',
    body: JSON.stringify(req)
  });
}

export async function query(req: QueryRequest): Promise<QueryResponse> {
  return requestJson<QueryResponse>('/v1/query', {
    method: 'POST',
    body: JSON.stringify(req)
  });
}

export async function opsPipeline(): Promise<OpsPipelineResponse> {
  return requestJson<OpsPipelineResponse>('/v1/ops/pipeline', {
    method: 'GET'
  });
}

export async function opsAudit(params?: {
  namespace?: string;
  session_id?: string;
  limit?: number;
}): Promise<OpsAuditResponse> {
  const qs = new URLSearchParams();
  if (params?.namespace) qs.set('namespace', params.namespace);
  if (params?.session_id) qs.set('session_id', params.session_id);
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));

  const suffix = qs.toString().length > 0 ? `?${qs.toString()}` : '';
  return requestJson<OpsAuditResponse>(`/v1/ops/audit${suffix}`, {
    method: 'GET'
  });
}

export type OpsCondensation = {
  id: string;
  namespace: string;
  session_id: string;
  version: string;
  trigger_reason: string | null;
  trigger_details: Record<string, unknown>;
  source_memory_ids: string[];
  condensed_text: string;
  token_original: number;
  token_condensed: number;
  created_at: string;
};

export type OpsCondensationsResponse = {
  condensations: OpsCondensation[];
};

export async function opsCondensations(params?: {
  namespace?: string;
  session_id?: string;
  limit?: number;
}): Promise<OpsCondensationsResponse> {
  const qs = new URLSearchParams();
  if (params?.namespace) qs.set('namespace', params.namespace);
  if (params?.session_id) qs.set('session_id', params.session_id);
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));

  const suffix = qs.toString().length > 0 ? `?${qs.toString()}` : '';
  return requestJson<OpsCondensationsResponse>(`/v1/ops/condensations${suffix}`, {
    method: 'GET'
  });
}

export type OpsContextPack = {
  id: string;
  namespace: string;
  session_id: string;
  query_text: string;
  session_summary_id: string | null;
  retrieved_count: number;
  created_at: string;
  pack: Record<string, unknown>;
};

export type OpsContextPacksResponse = {
  context_packs: OpsContextPack[];
};

export async function opsContextPacks(params?: {
  namespace?: string;
  session_id?: string;
  limit?: number;
  include_pack?: boolean;
}): Promise<OpsContextPacksResponse> {
  const qs = new URLSearchParams();
  if (params?.namespace) qs.set('namespace', params.namespace);
  if (params?.session_id) qs.set('session_id', params.session_id);
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params?.include_pack === 'boolean') qs.set('include_pack', String(params.include_pack));

  const suffix = qs.toString().length > 0 ? `?${qs.toString()}` : '';
  return requestJson<OpsContextPacksResponse>(`/v1/ops/context_packs${suffix}`, {
    method: 'GET'
  });
}

export type OpsProceduralResponse = {
  prompt_registry: Record<string, unknown>;
  tool_registry: Record<string, unknown>;
};

export async function opsProcedural(): Promise<OpsProceduralResponse> {
  return requestJson<OpsProceduralResponse>('/v1/ops/procedural', {
    method: 'GET'
  });
}

export type OpsStatsResponse = {
  total_memories: number;
  active_contexts: number;
  token_savings: number;
  compression_ratio: number;
};

export async function opsStats(): Promise<OpsStatsResponse> {
  return requestJson<OpsStatsResponse>('/v1/ops/stats', {
    method: 'GET'
  });
}

export type DevSeedResponse = {
  ok: boolean;
  namespace: string;
  session_id: string;
  inserted: number;
  memory_ids: string[];
};

export async function devSeed(params?: {
  namespace?: string;
  session_id?: string;
  reset?: boolean;
}): Promise<DevSeedResponse> {
  const qs = new URLSearchParams();
  if (params?.namespace) qs.set('namespace', params.namespace);
  if (params?.session_id) qs.set('session_id', params.session_id);
  if (typeof params?.reset === 'boolean') qs.set('reset', String(params.reset));

  const suffix = qs.toString().length > 0 ? `?${qs.toString()}` : '';
  return requestJson<DevSeedResponse>(`/v1/dev/seed${suffix}`, {
    method: 'POST'
  });
}

export type ResetSessionRequest = {
  namespace: string;
  session_id: string;
  confirm: boolean;
  dry_run?: boolean;
  clear_audit?: boolean;
};

export type ResetSessionResponse = {
  ok: boolean;
  namespace: string;
  session_id: string;
  reset_at: string;
  deleted_counts: {
    redis_keys: number;
    memories: number;
    condensations: number;
    audit: number;
  };
};

export async function resetSession(req: ResetSessionRequest): Promise<ResetSessionResponse> {
  return requestJson<ResetSessionResponse>('/v1/sessions/reset', {
    method: 'POST',
    body: JSON.stringify({
      ...req,
      dry_run: req.dry_run ?? false
    })
  });
}
