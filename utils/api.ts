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
